// The first-login welcome, on the Tracker: a full-screen run of six steps (welcome, level, units, week, tour, ready) that says what the
// app is for, sets the few things worth choosing on day one, and starts the program at the level chosen. It is shown once per account,
// after Create account in this tab (login.js leaves a flag in sessionStorage), and again on request from Settings. Finishing or skipping
// saves `welcomed`, a setting like any other, so the welcome stops on every device. Finishing starts Sad to Savage (or, seen again with
// the program under way, changes its level); skipping starts nothing, and the Today page has its own button for that.
//
// The overlay is made here and added to <body> the first time it opens, as settings-dialog.js adds the Settings dialog, so a
// page that never shows it carries none of it. Every way in is wrapped: a welcome that breaks must never stand between a new
// person and their first workout, so an error closes it as if skipped. Loaded on index.html after script.js and big-view.js;
// script.js calls maybeStartOnboarding() once the page has started and the account's settings have arrived.

const onboardingSteps = ['welcome', 'level', 'units', 'week', 'tour', 'ready'];
const onboardingFlag = 'workout-tracker-welcome';
let onboardingIndex = 0;
// Until a distance unit is picked (here or in Settings), it goes with the weight unit, as distanceUnitOf has it.
let onboardingDistanceChosen = false;

// ---- When it shows --------------------------------------------------------

function onboardingFlagged() {
  try {
    return sessionStorage.getItem(onboardingFlag) === '1';
  } catch (error) {
    return false; // No storage: the welcome is never owed, rather than owed for ever.
  }
}

function onboardingForgetFlag() {
  try { sessionStorage.removeItem(onboardingFlag); } catch (error) { /* no storage: nothing was kept */ }
}

// Only straight after Create account in this tab, for an account that has not been welcomed, and never over a workout.
function needsOnboarding() {
  const training = typeof activeSession !== 'undefined' && Boolean(activeSession);
  return onboardingFlagged() && getWorkoutSettings().welcomed !== true && !training;
}

// `index.html?welcome` is how Settings asks for it again from another page. The word is taken off the address, so a reload
// or a bookmark does not bring the welcome back.
function maybeStartOnboarding() {
  try {
    const params = new URLSearchParams(location.search);
    if (params.has('welcome')) {
      params.delete('welcome');
      const query = params.toString();
      history.replaceState(history.state, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
      startOnboarding({ replay:true });
    } else if (needsOnboarding()) {
      startOnboarding();
    }
  } catch (error) {
    onboardingBailOut(error);
  }
}

// ---- The markup -----------------------------------------------------------

// A radio drawn as a row or a segment: the input lies over the whole of it, unseen but still taking the focus, the arrow keys
// and a tap, and the body beside it shows whether it is chosen (as the training days in Settings do).
function onboardingChoice(name, value, title, detail = '', text = '', kind = 'row') {
  return `<label class="onboarding-choice onboarding-${kind}"><input type="radio" name="${name}" value="${escapeHTML(value)}" />`
    + `<span class="onboarding-choice-body"><strong>${escapeHTML(title)}</strong>${detail ? `<small>${escapeHTML(detail)}</small>` : ''}`
    + `${text ? `<span class="onboarding-choice-text">${escapeHTML(text)}</span>` : ''}</span></label>`;
}

// The program's levels, each as the setup form words it, so the welcome says of them what the program does.
function onboardingLevelChoices() {
  return programDefinitions[0].options[0].choices.map(choice => onboardingChoice('onboardingLevel', choice.value, choice.label, '', choice.help)).join('');
}

// Whether the two Pilates days a week are part of it, worded as the setup form words it.
function onboardingPilatesChoices() {
  return programDefinitions[0].options[1].choices.map(choice => onboardingChoice('onboardingPilates', choice.value, choice.label, '', choice.help)).join('');
}

// Monday first, as Settings and the calendar show the week, each with the number the settings keep (Sunday is 0).
function onboardingDayChoices() {
  return trainingDays.map(([value, short, name]) => `<label class="weekday"><input type="checkbox" name="onboardingDay" value="${value}" aria-label="${name}" />`
    + `<span aria-hidden="true">${short}</span></label>`).join('');
}

function onboardingStep(name, title, body) {
  return `<section class="onboarding-step" data-step="${name}" aria-labelledby="onboardingTitle-${name}" hidden>
        <h2 id="onboardingTitle-${name}" tabindex="-1">${title}</h2>
        ${body}
      </section>`;
}

function onboardingMarkup() {
  const goals = [1, 2, 3, 4, 5, 6, 7].map(goal => `<option value="${goal}">${goal} workout${goal === 1 ? '' : 's'} a week</option>`).join('');
  const pages = [
    ['strength', 'Today', 'The next day of the program: its warm-up and supersets, or the mat Pilates session, and the daily walk to log. Start it and log each set; the rest timer counts down between rounds, and new records are called out as you set them.'],
    ['progress', 'Progress', 'A chart for each exercise, your personal records, and the achievements you earn along the way.'],
    ['history', 'History', 'Every workout on a calendar, with your weekly goal and the streaks you build.']
  ].map(([page, name, text]) => `<li><span class="onboarding-tour-icon" data-page="${page}" aria-hidden="true"></span><div><strong>${name}</strong><p>${text}</p></div></li>`).join('');
  return `
<div class="onboarding" id="onboarding" role="dialog" aria-modal="true" aria-labelledby="onboardingTitle-welcome" hidden>
  <div class="onboarding-frame">
    <div class="onboarding-top">
      <div class="onboarding-progress" id="onboardingProgress" aria-live="polite"><span class="onboarding-bar" aria-hidden="true">${onboardingSteps.map(() => '<span class="onboarding-dot"></span>').join('')}</span><span class="onboarding-count" id="onboardingCount">Step 1 of 6</span></div>
      <button class="onboarding-skip" id="onboardingSkip" type="button">Skip</button>
    </div>
    <div class="onboarding-steps">
      ${onboardingStep('welcome', 'Welcome to Sad to Savage', `<p class="onboarding-lead">Six weeks of strength, mat Pilates and a daily walk, one day at a time. Open the app and it says what today is; log it, and the program moves on.</p>
        <p class="onboarding-text">It keeps working when the connection drops: what you log is saved on this device and uploads once you are back online.</p>
        <p class="onboarding-note">A few choices and you are ready to start. It takes about a minute, and any of it can be changed later.</p>`)}
      ${onboardingStep('level', 'Which weights?', `<p class="onboarding-lead">Every exercise in the program gives a range of weight (or a band) for two levels. Choose the one you will follow; you can change it at any time, and the days still to do follow it.</p>
        <fieldset class="onboarding-group"><legend>Your level</legend><div class="onboarding-choices">${onboardingLevelChoices()}</div></fieldset>
        <fieldset class="onboarding-group"><legend>Pilates days</legend><div class="onboarding-choices">${onboardingPilatesChoices()}</div></fieldset>
        <p class="onboarding-note">The plan has two mat Pilates days a week. Choose strength only and they are skipped: the program is the three strength days and the walk.</p>`)}
      ${onboardingStep('units', 'Pounds or kilograms?', `<p class="onboarding-lead">Every weight is shown in the unit you choose, from Today to your charts. Switching later never changes what you logged.</p>
        <fieldset class="onboarding-group"><legend>Weight</legend><div class="onboarding-segments">${onboardingChoice('onboardingUnit', 'lbs', 'Pounds', 'lbs', '', 'segment')}${onboardingChoice('onboardingUnit', 'kg', 'Kilograms', 'kg', '', 'segment')}</div></fieldset>
        <fieldset class="onboarding-group"><legend>Distance, for your walk</legend><div class="onboarding-segments">${onboardingChoice('onboardingDistance', 'mi', 'Miles', 'mi', '', 'segment')}${onboardingChoice('onboardingDistance', 'km', 'Kilometres', 'km', '', 'segment')}</div></fieldset>
        <p class="onboarding-note">Distance goes with the weight unit until you pick one.</p>`)}
      ${onboardingStep('week', 'Plan your week', `<p class="onboarding-lead">The program is five days a week. The History calendar counts your workouts against a weekly goal, and each week in a row you reach it adds to your streak.</p>
        <div class="onboarding-group"><label for="onboardingGoal">Weekly goal</label><select id="onboardingGoal">${goals}</select></div>
        <fieldset class="onboarding-group weekday-choices onboarding-days"><legend>Days you train (optional)</legend>${onboardingDayChoices()}</fieldset>
        <p class="onboarding-note">With days chosen, Today says what is planned and your phone can remind you. Leave them empty to train whenever suits you: the program waits for you either way.</p>`)}
      ${onboardingStep('tour', 'Find your way around', `<p class="onboarding-lead">Three pages, in the bar along the bottom on a phone and across the top on a wider screen.</p>
        <ul class="onboarding-tour">${pages}</ul>
        <p class="onboarding-note">Everything else is in Settings, under the gear button: themes, text size, the rest timer and your account.</p>`)}
      ${onboardingStep('ready', 'You are all set', `<p class="onboarding-lead">Here is how you are starting. Any of it can be changed later.</p>
        <dl class="onboarding-summary" id="onboardingSummary"></dl>
        <p class="onboarding-text" id="onboardingReadyNext"></p>
        <p class="onboarding-note">You can see this welcome again from Settings.</p>`)}
    </div>
    <div class="onboarding-actions">
      <button class="secondary onboarding-back" id="onboardingBack" type="button">Back</button>
      <button class="primary onboarding-next" id="onboardingNext" type="button">Get started</button>
      <button class="primary onboarding-next" id="onboardingStart" type="button" hidden>Start Sad to Savage</button>
    </div>
  </div>
</div>`;
}

// Made once, the first time it is wanted, with its handlers.
function onboardingBuild() {
  if ($('onboarding')) return $('onboarding');
  document.body.insertAdjacentHTML('beforeend', onboardingMarkup());
  const dialog = $('onboarding');
  dialog.addEventListener('click', onboardingGuard(onboardingClick));
  dialog.addEventListener('change', onboardingGuard(onboardingChange));
  document.addEventListener('keydown', onboardingGuard(onboardingKey));
  return dialog;
}

// ---- The choices ----------------------------------------------------------

function onboardingRadio(name) {
  return $('onboarding').querySelector(`input[name="${name}"]:checked`);
}

function onboardingSetRadio(name, value) {
  $('onboarding').querySelectorAll(`input[name="${name}"]`).forEach(input => { input.checked = input.value === value; });
}

// What the steps say now.
function onboardingChoices() {
  const unit = onboardingRadio('onboardingUnit')?.value === 'kg' ? 'kg' : 'lbs';
  const distanceUnit = onboardingRadio('onboardingDistance')?.value === 'km' ? 'km' : 'mi';
  const days = [...$('onboarding').querySelectorAll('input[name="onboardingDay"]:checked')].map(input => Number(input.value)).sort((a, b) => a - b);
  const definition = programDefinitions[0];
  const chosen = onboardingRadio('onboardingLevel')?.value;
  const level = definition.options[0].choices.find(choice => choice.value === chosen) || definition.options[0].choices[0];
  const pilates = onboardingRadio('onboardingPilates')?.value === 'no' ? 'no' : 'yes';
  return { unit, distanceUnit, weeklyGoal:weeklyGoalFrom($('onboardingGoal').value), days, definition, level, pilates };
}

// Every opening starts from the settings as they are, so a welcome seen again shows what was chosen since. The program is five days a
// week, so for an account not yet welcomed (whose goal is still the default) it starts at five.
function onboardingPrefill() {
  const settings = getWorkoutSettings();
  onboardingSetRadio('onboardingUnit', settings.unit === 'kg' ? 'kg' : 'lbs');
  onboardingSetRadio('onboardingDistance', distanceUnitOf(settings));
  onboardingDistanceChosen = settings.distanceUnit === 'mi' || settings.distanceUnit === 'km';
  $('onboardingGoal').value = String(settings.welcomed === true ? weeklyGoalFrom(settings.weeklyGoal) : 5);
  const { days } = scheduleFrom(settings);
  $('onboarding').querySelectorAll('input[name="onboardingDay"]').forEach(input => { input.checked = days.includes(Number(input.value)); });
  onboardingSetRadio('onboardingLevel', currentProgram ? currentProgram.options.level : programDefinitions[0].options[0].default);
  onboardingSetRadio('onboardingPilates', currentProgram ? currentProgram.options.pilates : programDefinitions[0].options[1].default);
}

// The last step says back what was chosen, and its button says what it will do.
function onboardingRenderReady() {
  const choices = onboardingChoices();
  const dayNames = trainingDays.filter(([value]) => choices.days.includes(value)).map(([, short]) => short);
  const rows = [
    ['Level', choices.level.label],
    ['Pilates', choices.pilates === 'no' ? 'Strength only: the Pilates days are skipped' : 'Included'],
    ['Units', `${choices.unit === 'kg' ? 'Kilograms' : 'Pounds'} and ${choices.distanceUnit === 'km' ? 'kilometres' : 'miles'}`],
    ['Weekly goal', `${choices.weeklyGoal} workout${choices.weeklyGoal === 1 ? '' : 's'} a week`],
    ['Training days', dayNames.length ? dayNames.join(', ') : 'None yet']
  ];
  const summary = $('onboardingSummary');
  summary.replaceChildren(...rows.map(([term, value]) => {
    const row = document.createElement('div');
    const name = document.createElement('dt');
    const text = document.createElement('dd');
    name.textContent = term;
    text.textContent = value;
    row.append(name, text);
    return row;
  }));
  $('onboardingReadyNext').textContent = currentProgram ? `Next, ${choices.definition.name} carries on at this level.`
    : `Next, ${choices.definition.name} starts, and Today says what the first day is.`;
  $('onboardingStart').textContent = currentProgram ? 'Save and go to Today' : `Start ${choices.definition.name}`;
}

// ---- Moving through it ----------------------------------------------------

function onboardingShowStep(index) {
  onboardingIndex = Math.max(0, Math.min(onboardingSteps.length - 1, index));
  const name = onboardingSteps[onboardingIndex];
  const last = onboardingIndex === onboardingSteps.length - 1;
  const dialog = $('onboarding');
  if (name === 'ready') onboardingRenderReady();
  dialog.querySelectorAll('.onboarding-step').forEach(step => { step.hidden = step.dataset.step !== name; });
  dialog.setAttribute('aria-labelledby', `onboardingTitle-${name}`);
  dialog.dataset.current = name;
  $('onboardingCount').textContent = `Step ${onboardingIndex + 1} of ${onboardingSteps.length}`;
  dialog.querySelectorAll('.onboarding-dot').forEach((dot, position) => {
    dot.classList.toggle('done', position < onboardingIndex);
    dot.classList.toggle('current', position === onboardingIndex);
  });
  $('onboardingBack').hidden = onboardingIndex === 0;
  $('onboardingNext').hidden = last;
  $('onboardingNext').textContent = onboardingIndex === 0 ? 'Get started' : 'Next';
  $('onboardingSkip').hidden = last;
  $('onboardingStart').hidden = !last;
  // A long step left scrolled down would open the next one part way through.
  dialog.scrollTop = 0;
  $(`onboardingTitle-${name}`).focus({ preventScroll:true });
}

function startOnboarding({ replay = false } = {}) {
  try {
    const dialog = onboardingBuild();
    if (!dialog.hidden) return;
    // Seen again from Settings it is the same welcome; the mark only says how it came, for anyone looking at the page.
    dialog.dataset.replay = String(Boolean(replay));
    // The big view would sit under it, still answering Escape; a welcome asked for mid-workout puts it away first.
    if (typeof bigViewIsOpen === 'function' && bigViewIsOpen()) closeBigView(false);
    onboardingPrefill();
    dialog.hidden = false;
    document.body.classList.add('onboarding-open');
    onboardingShowStep(0);
  } catch (error) {
    onboardingBailOut(error);
  }
}

function onboardingClick(event) {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.id === 'onboardingNext') onboardingShowStep(onboardingIndex + 1);
  else if (button.id === 'onboardingBack') onboardingShowStep(onboardingIndex - 1);
  else if (button.id === 'onboardingSkip') finishOnboarding('skipped');
  else if (button.id === 'onboardingStart') finishOnboarding('done');
}

// Picking a weight unit moves the distance with it, until a distance has been picked.
function onboardingChange(event) {
  const { name, value } = event.target;
  if (name === 'onboardingDistance') onboardingDistanceChosen = true;
  if (name === 'onboardingUnit') {
    if (!onboardingDistanceChosen) onboardingSetRadio('onboardingDistance', value === 'kg' ? 'km' : 'mi');
  }
}

// Escape skips, and Tab stays inside: the page behind is not to be reached while the welcome is over it.
function onboardingKey(event) {
  const dialog = $('onboarding');
  if (!dialog || dialog.hidden) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    finishOnboarding('skipped');
    return;
  }
  trapTab(event, dialog);
}

// ---- Finishing ------------------------------------------------------------

// Put away, with the keyboard left on the Tracker: on the program card's button between workouts (as Last week's Done does), or
// on Settings when a workout has put the rest of the Tracker away.
function onboardingClose() {
  onboardingForgetFlag();
  const dialog = $('onboarding');
  if (dialog) dialog.hidden = true;
  document.body.classList.remove('onboarding-open');
  const target = [document.querySelector('#programNext .primary'), $('settingsButton')].find(element => element && element.getClientRects().length);
  if (target) target.focus({ preventScroll:true });
}

// Done keeps the choices; skipped keeps nothing but having been welcomed. Either way the welcome is over on every device, since
// `welcomed` syncs with the rest of the settings. Done then starts the program at the level chosen, or changes the level of the one
// under way; skipping starts nothing.
function finishOnboarding(reason) {
  const dialog = $('onboarding');
  if (!dialog || dialog.hidden) return; // a second tap on Start, or Escape as it closes
  try {
    const settings = getWorkoutSettings();
    if (reason === 'done') {
      const choices = onboardingChoices();
      saveLocalState('settings', { ...settings, unit:choices.unit, distanceUnit:choices.distanceUnit, weeklyGoal:choices.weeklyGoal,
        schedule:{ days:choices.days, time:scheduleFrom().time }, welcomed:true });
      const options = { [choices.definition.options[0].id]:choices.level.value, [choices.definition.options[1].id]:choices.pilates };
      // Leaving the Pilates days out can finish a program whose strength days are all done; putting them back reopens it.
      const { finishedAt, ...unfinished } = currentProgram || { definition:choices.definition.id, startedAt:Date.now(), cycle:1, done:{}, walks:{} };
      saveProgram(settleProgram(normalizeProgram({ ...unfinished, options })));
    } else {
      saveLocalState('settings', { ...settings, welcomed:true });
    }
    // The Settings form shows the new values too, so saving it later does not put the old ones back (saveSettings reads it whole).
    if (typeof applySettings === 'function') applySettings(getWorkoutSettings());
    window.dispatchEvent(new Event('settingschange'));
  } catch (error) {
    onboardingBailOut(error);
    return;
  }
  onboardingClose();
}

// Whatever goes wrong, the person gets into the app: the welcome closes as if skipped. Each part is tried on its own, so one
// failing (no storage, say) does not keep the others from happening, and nothing here calls back into finishOnboarding.
function onboardingBailOut(error) {
  console.error('The welcome could not carry on; it is closed as if skipped.', error);
  try {
    saveLocalState('settings', { ...getWorkoutSettings(), welcomed:true });
    window.dispatchEvent(new Event('settingschange'));
  } catch (saveError) {
    // Not kept: with the flag gone below, it is not shown again in this tab, and the account can be welcomed another time.
  }
  try {
    onboardingClose();
  } catch (closeError) {
    document.body.classList.remove('onboarding-open');
    const dialog = document.getElementById('onboarding');
    if (dialog) dialog.hidden = true;
  }
}

// A handler that throws closes the welcome rather than leaving it stuck over the page.
function onboardingGuard(handler) {
  return event => {
    try {
      handler(event);
    } catch (error) {
      onboardingBailOut(error);
    }
  };
}
