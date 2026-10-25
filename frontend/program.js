// The program: Sad to Savage, six weeks of five days. This file is what the Tracker does with it: keeping the program being followed
// (per account, beside settings; offline.js saves it on this device first and uploads it), the card for today's day, starting a day as a
// workout, recording it once it is finished, the daily walk, and starting the program, changing its level and going round again.
// program-definitions.js says what the program is, and program-plan.js knows which day is next, which the History page shares.
// Loaded before script.js, whose startWorkout begins the program's workouts.
// More than a year of daily walks is kept; a program with more than that has long been over. (Declared above currentProgram, which
// reads the stored program as it is declared.)
const maxWalks = 400;
let currentProgram = loadProgram();
let programForm = null;

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function storedNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

// A select's choice for each option, or its default: a stored value that is not one of the choices is the default.
function normalizeOptions(definition, given) {
  return Object.fromEntries(definition.options.map(option => {
    const choice = option.choices.find(item => String(item.value) === String(given[option.id])) || option.choices.find(item => item.value === option.default);
    return [option.id, (choice || option.choices[0]).value];
  }));
}

// A stored program is used only if it is whole: anything unreadable counts as no program rather than breaking the page.
function normalizeProgram(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const definition = findProgramDefinition(value.definition);
  if (!definition) return null;
  const done = {};
  Object.entries(value.done && typeof value.done === 'object' ? value.done : {}).forEach(([key, entry]) => {
    if (!/^\d+-\d+$/.test(key) || !entry || typeof entry !== 'object') return;
    done[key] = { at:storedNumber(entry.at), skipped:entry.skipped === true };
  });
  // The walks, by the day they were walked (year-month-day, where the lifter is): { at, steps, distance, unit } with either number
  // or neither, since a walk with no numbers is showing up, which the plan counts. A day is not a program day because a walk is
  // done after the workout as often as before it, and on days the program has nothing to start.
  const walks = {};
  Object.entries(value.walks && typeof value.walks === 'object' ? value.walks : {}).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-maxWalks).forEach(([key, entry]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !entry || typeof entry !== 'object') return;
    walks[key] = { at:storedNumber(entry.at), steps:Math.floor(storedNumber(entry.steps)), distance:storedNumber(entry.distance), unit:entry.unit === 'km' ? 'km' : 'mi' };
  });
  const finishedAt = storedNumber(value.finishedAt);
  // `cycle` counts the times the program has been gone through, from 1; with `startedAt` it says which run a day belongs to.
  return { definition:definition.id, startedAt:storedNumber(value.startedAt), cycle:Math.max(1, Math.floor(storedNumber(value.cycle))),
    options:normalizeOptions(definition, value.options && typeof value.options === 'object' ? value.options : {}), done, walks, ...(finishedAt ? { finishedAt } : {}) };
}

// The program as this page reads it, so a field filled in by normalizeProgram is not mistaken for a change (see
// accountStateFill in offline.js; guarded, as there).
if (typeof accountStateFill !== 'undefined') accountStateFill.program = normalizeProgram;

function loadProgram() {
  const stored = readLocalState('program');
  return normalizeProgram(stored ? stored.value : null);
}

function saveProgram(program) {
  currentProgram = program;
  saveLocalState('program', program);
  renderProgram();
}

// Called once the server's copy has loaded, which may be newer than the one this page started with.
function reloadProgram() {
  const loaded = loadProgram();
  const settled = settleProgram(loaded);
  if (settled !== loaded) saveProgram(settled);
  else {
    currentProgram = loaded;
    renderProgram();
  }
}

// ---- The plan -------------------------------------------------------------
// (programWeeks, programDays, dayTitle, dayLabel and nextProgramDay are in program-plan.js, which the History page shares.)

// Where a workout sits in the program, as History shows it: "Week 3 of 6".
function blockLabel(program, week) {
  return programDefinition(program).blockLabel(program, week);
}

function doneInWeek(program, week) {
  return programDays(program).filter((entry, day) => program.done[dayKey(week, day)]).length;
}

// One day of the program, in the shape startWorkout takes. programDay says which day of which run of the program it is, so
// finishing the workout can mark that day done.
function programWorkout(program, week, day) {
  const definition = programDefinition(program);
  return {
    name:definition.workoutName(program, day, week),
    notes:'',
    unit:weightUnit(),
    exercises:definition.workout(program, week, day),
    programDay:{ definition:definition.id, name:definition.name, startedAt:program.startedAt, cycle:program.cycle, week, day, label:blockLabel(program, week) }
  };
}

// What a saved workout keeps about the program day it came from, for History. Kept under a different name from the session's
// programDay, so starting a saved workout again never passes for a day of the program.
function programInfo(programDay) {
  const definition = findProgramDefinition(programDay.definition);
  const name = typeof programDay.name === 'string' && programDay.name ? programDay.name : definition ? definition.name : '';
  return { name, cycle:storedNumber(programDay.cycle), week:storedNumber(programDay.week) + 1, label:String(programDay.label || '') };
}

// An exercise done in place of the planned one (Swap, in training-tools.js).
function isSwappedIn(exercise) {
  return Boolean(exercise && exercise.swappedFrom);
}

// The program is finished once every day is done: it is a fixed length, and the card then offers to go round again as a new run.
function settleProgram(program) {
  if (!program || nextProgramDay(program) || program.finishedAt) return program;
  return { ...program, finishedAt:Date.now() };
}

function nextUpMessage(program) {
  const next = nextProgramDay(program);
  return next ? `Next in ${programDefinition(program).name}: ${dayLabel(program, next.week, next.day)}.` : `That was the last day: you finished ${programDefinition(program).name}.`;
}

// Saves a day as done, finishing the program once every day is. Returns a sentence saying what comes next.
function recordProgramDay(program, week, day, entry) {
  saveProgram(settleProgram({ ...program, done:{ ...program.done, [dayKey(week, day)]:entry } }));
  return nextUpMessage(currentProgram);
}

// Called by finishWorkout for a workout started from the program with at least one set logged. A workout from a program that has
// since been started over or gone round again is saved, but marks nothing done. Returns the sentence saying what comes next
// (note), and what the day did for the summary to celebrate (outcome, null when it marked nothing done): finishing the program.
function completeProgramDay(session) {
  const { programDay } = session;
  const program = currentProgram;
  if (!programDay || !program || program.startedAt !== programDay.startedAt || program.cycle !== programDay.cycle || !programWeeks(program)[programDay.week] || !programDays(program)[programDay.day]) return { note:'', outcome:null };
  const wasFinished = Boolean(program.finishedAt);
  const note = recordProgramDay(program, programDay.week, programDay.day, { at:Date.now(), skipped:false });
  return { note, outcome:{ finished:!wasFinished && Boolean(currentProgram.finishedAt) ? programDefinition(currentProgram).name : '' } };
}

// The summary's lines for a program day's outcome (completeProgramDay).
function programOutcomeLines(outcome) {
  return outcome && outcome.finished ? [`You finished ${outcome.finished}: all thirty days done.`] : [];
}

// ---- Formatting -----------------------------------------------------------

function formatReps(set) {
  return set.repsMax ? `${set.reps}–${set.repsMax}` : `${set.reps}${set.amrap ? '+' : ''}`;
}

// "12 reps each side", "30 seconds", "25 minutes", or "85 lbs × 5+" when the plan gives a weight. Weights are in the unit shown.
function formatPlannedSet(set) {
  // A long hold or a session is said in minutes, which is what it is to the person doing it.
  if (set.unit === 'seconds' && set.reps >= 120 && set.reps % 60 === 0) return `${set.reps / 60} minutes`;
  const what = `${set.unit || 'reps'}${set.per ? ` ${set.per}` : ''}`;
  return set.weight === '' || set.weight === undefined || set.weight === null ? `${formatReps(set)} ${what}` : `${formatWeight(set.weight)} ${weightUnit()} × ${formatReps(set)}`;
}

// The line under an exercise with a plan during a workout: what the next set is, and the exercise's note (the level's weight range).
function plannedTarget(exercise) {
  const plan = exercise.plan;
  const filled = plannedDone(exercise);
  const next = plan[filled];
  // A note that already ends a sentence is not given a second full stop.
  const note = exercise.note ? ` ${exercise.note}${/[.!?]$/.test(exercise.note) ? '' : '.'}` : '';
  if (next) return `Set ${filled + 1} of ${plan.length}${next.warmup ? ', warm-up' : ''}: ${formatPlannedSet(next)}.${note}`;
  return plan.length === 1 ? 'The planned set is done.' : `All ${plan.length} planned sets done.`;
}

// Sets written the way a plan writes them: "3 × 12 reps each side".
function describeSets(sets) {
  const runs = [];
  sets.forEach(set => {
    const last = runs[runs.length - 1];
    if (last && formatPlannedSet(last.set) === formatPlannedSet(set)) last.count += 1;
    else runs.push({ set, count:1 });
  });
  return runs.map(run => `${run.count} × ${formatPlannedSet(run.set)}`).join(', ');
}

// "DB Bench Chest Press 3 × 12 reps": an exercise and its work sets, as the calendar file lists a day.
function describeExercisePlan(exercise) {
  if (!Array.isArray(exercise.plan) || !exercise.plan.length) return `${exercise.name} ${isTimed(exercise) ? `${exercise.reps} s` : `${exercise.reps} reps`}`;
  return `${exercise.name} ${describeSets(exercise.plan.filter(set => !set.warmup))}`;
}

// ---- The daily walk -------------------------------------------------------
// The plan asks for a walk every day, "10k steps, 2 miles, or showing up and doing what you can do": steps and distance are both
// optional, and logging a walk with neither is showing up. It is kept on the program by the day it was walked, not by the
// program day, so it can be logged after the workout (which has moved the program on) and on a day with nothing to start.

function walkOn(program, at = Date.now()) {
  return program.walks[calendarDayKey(new Date(at))] || null;
}

function formatWalkDistance(distance, unit) {
  return `${Math.round(distance * 100) / 100} ${unit}`;
}

// "8,200 steps · 1.9 mi", or "Showed up" for a walk with no numbers.
function describeWalk(walk) {
  const parts = [walk.steps ? `${walk.steps.toLocaleString()} steps` : '', walk.distance ? formatWalkDistance(walk.distance, walk.unit) : ''].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Showed up';
}

// The walk panel under today's workout: the day's walk goal, and either the walk logged today or the fields to log it.
function renderProgramWalk(program, goal, editing = false) {
  const walk = walkOn(program);
  const unit = distanceUnitOf();
  if (walk && !editing) {
    $('programWalk').innerHTML = `<div><span class="program-kicker">Today's walk</span><strong>${escapeHTML(describeWalk(walk))}</strong></div>`
      + '<div class="program-walk-actions"><button class="link-button" type="button" data-walk-action="edit">Change</button></div>';
    return;
  }
  $('programWalk').innerHTML = `<div><span class="program-kicker">Today's walk</span><p class="program-walk-goal">${escapeHTML(goal)}</p></div>`
    + '<div class="program-walk-fields">'
    + `<div><label for="walkSteps">Steps</label><input id="walkSteps" type="number" inputmode="numeric" min="0" max="200000" step="1" placeholder="0" value="${walk && walk.steps ? walk.steps : ''}" /></div>`
    + `<div><label for="walkDistance">Distance (${unit})</label><input id="walkDistance" type="number" inputmode="decimal" min="0" max="500" step="0.01" placeholder="0" value="${walk && walk.distance ? walk.distance : ''}" /></div>`
    + `<button class="secondary" type="button" data-walk-action="save">${walk ? 'Save' : 'Log walk'}</button></div>`
    + '<p class="subtitle">Leave both empty to log that you showed up.</p>';
}

function saveWalk() {
  const steps = Math.floor(Number($('walkSteps').value)) || 0;
  const distance = Math.round(Number($('walkDistance').value) * 100) / 100 || 0;
  const badSteps = steps < 0 || steps > 200000, badDistance = distance < 0 || distance > 500;
  markInvalid($('walkSteps'), badSteps);
  markInvalid($('walkDistance'), badDistance);
  if (badSteps || badDistance) {
    showFeedback('A walk is up to 200,000 steps and 500 in distance.');
    return;
  }
  saveProgram({ ...currentProgram, walks:{ ...currentProgram.walks, [calendarDayKey(new Date())]:{ at:Date.now(), steps, distance, unit:distanceUnitOf() } } });
  showFeedback(steps || distance ? 'Walk logged.' : 'Walk logged: you showed up.', 'success');
}

$('programWalk').addEventListener('click', event => {
  const button = event.target.closest('[data-walk-action]');
  if (!button || !currentProgram) return;
  if (button.dataset.walkAction === 'edit') renderProgramWalk(currentProgram, programGoal(currentProgram), true);
  if (button.dataset.walkAction === 'save') saveWalk();
});

// ---- The program card -----------------------------------------------------

// What a day says about itself in the lists: done (with the walk of the day it was done), or skipped.
function dayStatus(program, entry) {
  if (entry.skipped) return '<span class="program-status skipped">Skipped</span>';
  const walk = entry.at ? walkOn(program, entry.at) : null;
  const walked = walk && (walk.steps || walk.distance) ? ` · ${walk.distance ? formatWalkDistance(walk.distance, walk.unit) : `${walk.steps.toLocaleString()} steps`}` : '';
  return `<span class="program-status">Done${escapeHTML(walked)}</span>`;
}

function programDayRow(program, week, day, next, withStart = true) {
  const entry = program.done[dayKey(week, day)];
  const isNext = Boolean(next) && next.week === week && next.day === day;
  const label = `${entry ? 'Redo' : 'Start'} ${dayLabel(program, week, day)}`;
  const button = withStart ? `<button class="${isNext ? 'primary' : 'secondary'}" type="button" data-program-action="start" data-week="${week}" data-day="${day}" aria-label="${escapeHTML(label)}">${entry ? 'Redo' : 'Start'}</button>` : '';
  return `<li class="program-day${entry ? ' done' : ''}${isNext ? ' next' : ''}"><div><strong>Day ${day + 1} · ${escapeHTML(dayTitle(program, week, day))}</strong>`
    + `<span>${escapeHTML(programDefinition(program).dayDescription(program, week, day))}</span></div><div class="program-day-actions">${entry ? dayStatus(program, entry) : ''}${button}</div></li>`;
}

// What the walk panel says the goal is: the next day's, which the plan words a little differently on some days.
function programGoal(program) {
  return programDefinition(program).walkGoal(program, nextProgramDay(program));
}

// The six weeks as the card lists them, the week of the next day open. Without a program there is no next day, and no Start.
function renderProgramWeeks(program, next, withStart) {
  const weeks = programWeeks(program), days = programDays(program);
  $('programWeeks').innerHTML = weeks.map((week, index) => `<details class="program-week"${next && next.week === index ? ' open' : ''}><summary><strong>Week ${index + 1} · ${escapeHTML(week.name)}</strong>`
    + `<span>${escapeHTML(week.summary)}</span>${withStart ? `<span class="program-week-count">${doneInWeek(program, index)} of ${days.length} done</span>` : ''}</summary>`
    + `<ul>${days.map((entry, day) => programDayRow(program, index, day, next, withStart)).join('')}</ul></details>`).join('');
}

// A plan line as the card shows it: the name of a block set in bold ("Superset 1 · 3 rounds") ahead of what it holds.
function planLineHTML(line) {
  const split = line.match(/^(.+? rounds): (.*)$/);
  return split ? `<li><b>${escapeHTML(split[1])}</b> ${escapeHTML(split[2])}</li>` : `<li>${escapeHTML(line)}</li>`;
}

// The panel that starts the program, before there is one.
function renderProgramStart() {
  const definition = programDefinitions[0];
  $('programTitle').textContent = 'Your program';
  $('programSummary').textContent = definition.schedule;
  $('programNext').innerHTML = `<div><span class="program-kicker">Six weeks</span><strong>Ready when you are</strong><ul><li>${escapeHTML(definition.summary)}</li></ul></div>`
    + `<div class="program-next-actions"><button class="primary" type="button" data-program-action="setup" data-program-id="${escapeHTML(definition.id)}">Start the program</button></div>`;
  renderProgramWeeks({ definition:definition.id, options:normalizeOptions(definition, {}), done:{}, walks:{} }, null, false);
}

// The panel when every day is done: what was done, and a way to go round again.
function renderProgramFinished(program) {
  const days = Object.values(program.done);
  const skipped = days.filter(entry => entry.skipped).length;
  const walks = Object.values(program.walks).filter(walk => walk.at >= program.startedAt);
  const distances = ['mi', 'km'].map(unit => ({ unit, total:walks.filter(walk => walk.unit === unit).reduce((sum, walk) => sum + walk.distance, 0) })).filter(item => item.total > 0);
  const lines = [`${plural(days.length - skipped, 'day')} done${skipped ? `, ${skipped} skipped` : ''}`,
    `${plural(walks.length, 'walk')} logged${distances.length ? `, ${distances.map(item => formatWalkDistance(item.total, item.unit)).join(' and ')} in all` : ''}`];
  $('programNext').innerHTML = `<div><span class="program-kicker">All six weeks</span><strong>You finished ${escapeHTML(programDefinition(program).name)}</strong><ul>${lines.map(line => `<li>${escapeHTML(line)}</li>`).join('')}</ul></div>`
    + '<div class="program-next-actions"><button class="primary" type="button" data-program-action="restart">Start again</button></div>';
}

function renderProgram() {
  $('programCard').hidden = false;
  $('programWalk').hidden = !currentProgram;
  if (!currentProgram) {
    renderProgramStart();
    return;
  }
  const program = currentProgram;
  const definition = programDefinition(program);
  const weeks = programWeeks(program), days = programDays(program);
  const next = nextProgramDay(program);
  const finished = weeks.reduce((count, week, index) => count + doneInWeek(program, index), 0);
  $('programTitle').textContent = 'Your program';
  $('programSummary').textContent = `${finished} of ${weeks.length * days.length} days done${next ? ` · week ${next.week + 1} of ${weeks.length}: ${weeks[next.week].name}` : ''}`;
  if (next) {
    const plan = definition.planLines(program, next.week, next.day).map(planLineHTML).join('');
    $('programNext').innerHTML = `<div><span class="program-kicker">Next up · week ${next.week + 1}, day ${next.day + 1}</span><strong>${escapeHTML(dayTitle(program, next.week, next.day))}</strong><ul>${plan}</ul></div>`
      + `<div class="program-next-actions"><button class="primary" type="button" data-program-action="start" data-week="${next.week}" data-day="${next.day}">Start workout</button>`
      + `<button class="secondary" type="button" data-program-action="skip" data-week="${next.week}" data-day="${next.day}">Skip</button></div>`;
  } else {
    renderProgramFinished(program);
  }
  renderProgramWalk(program, programGoal(program));
  renderProgramWeeks(program, next, true);
}

// ---- Starting, and changing the level -------------------------------------

function optionElementId(option) {
  return `program${capitalize(option.id)}`;
}

function optionField(option, value) {
  const id = optionElementId(option);
  const choices = option.choices.map(choice => `<option value="${escapeHTML(choice.value)}"${String(choice.value) === String(value) ? ' selected' : ''}>${escapeHTML(choice.label)}</option>`).join('');
  return `<div class="program-option" id="${id}Field"><label for="${id}">${escapeHTML(option.label)}</label><select id="${id}">${choices}</select><p class="subtitle program-help" id="${id}Help"></p></div>`;
}

// What the form says now: every option's value.
function readProgramForm() {
  const { definition } = programForm;
  return Object.fromEntries(definition.options.map(option => [option.id, option.choices.find(choice => String(choice.value) === $(optionElementId(option)).value).value]));
}

// Shows the help for each option as chosen.
function syncProgramForm() {
  const { definition } = programForm;
  const form = readProgramForm();
  definition.options.forEach(option => { $(`${optionElementId(option)}Help`).textContent = option.choices.find(choice => choice.value === form[option.id]).help || ''; });
}

function openProgramForm(definition) {
  const editing = Boolean(currentProgram) && currentProgram.definition === definition.id;
  const options = editing ? currentProgram.options : normalizeOptions(definition, {});
  programForm = { definition, editing };
  rememberOpener('program');
  $('programModalTitle').textContent = `${editing ? 'Edit' : 'Start'} ${definition.name}`;
  $('programOptions').innerHTML = definition.options.map(option => optionField(option, options[option.id])).join('');
  $('programIntro').textContent = definition.setup.intro(editing);
  $('programSubmit').textContent = editing ? 'Save changes' : 'Start program';
  $('programFormError').hidden = true;
  syncProgramForm();
  $('programModal').hidden = false;
  rememberForm($('programForm'));
  $(optionElementId(definition.options[0])).focus();
}

function closeProgramForm() {
  $('programModal').hidden = true;
  returnFocus('program');
}

$('programForm').onsubmit = event => {
  event.preventDefault();
  const { definition, editing } = programForm;
  const base = editing ? currentProgram : { definition:definition.id, startedAt:Date.now(), cycle:1, done:{}, walks:{} };
  saveProgram(normalizeProgram({ ...base, options:readProgramForm() }));
  closeProgramForm();
  showFeedback(editing ? `${definition.name} updated. The days still to do use the new level.` : `${definition.name} is set up. ${nextUpMessage(currentProgram)}`, 'success');
  scrollToCard($('programCard'), 'start');
};
$('programForm').addEventListener('change', syncProgramForm);
$('closeProgram').onclick = closeProgramForm;
$('cancelProgram').onclick = closeProgramForm;
$('programModal').onclick = event => { if (event.target === $('programModal') && !formEdited($('programForm'))) closeProgramForm(); };
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('programModal').hidden) closeProgramForm(); });
trapFocus($('programModal'));

$('programCard').addEventListener('click', event => {
  const button = event.target.closest('[data-program-action]');
  if (!button) return;
  if (button.dataset.programAction === 'setup') {
    const definition = findProgramDefinition(button.dataset.programId);
    if (definition) openProgramForm(definition);
    return;
  }
  if (!currentProgram) return;
  // A finished program goes round again as a new run: everything undone, the level and the walks kept.
  if (button.dataset.programAction === 'restart') {
    saveProgram(normalizeProgram({ ...currentProgram, startedAt:Date.now(), cycle:currentProgram.cycle + 1, done:{}, finishedAt:0 }));
    showFeedback(`${programDefinition(currentProgram).name} starts again from week 1.`, 'success');
    return;
  }
  const week = Number(button.dataset.week), day = Number(button.dataset.day);
  if (!programWeeks(currentProgram)[week] || !programDays(currentProgram)[day]) return;
  if (button.dataset.programAction === 'start') startWorkout(programWorkout(currentProgram, week, day));
  // A skipped day counts as done, so the program moves on, and Redo on its row still starts it. Skip is beside Start workout, and
  // skipping the last day finishes the program, so the banner offers it back for a few seconds, in case the tap was the slip.
  if (button.dataset.programAction === 'skip') {
    const before = currentProgram;
    const label = dayLabel(currentProgram, week, day);
    const said = recordProgramDay(currentProgram, week, day, { at:Date.now(), skipped:true });
    const skipped = currentProgram;
    showFeedback(`Skipped ${label}. ${said}`, 'success', { label:'Undo', run:() => undoSkip(before, skipped, label) });
  }
});

// Puts the program back as it was before a day was skipped, unless it has changed since (another day done, the program
// edited or started over), when going back would undo that too.
function undoSkip(before, skipped, label) {
  if (currentProgram !== skipped) {
    showFeedback(`Skipping ${label} cannot be undone: the program has changed since.`);
    return;
  }
  saveProgram(before);
  showFeedback(`${label} is back on the plan.`, 'success');
}
$('editProgramBtn').onclick = () => {
  if (currentProgram) openProgramForm(programDefinition(currentProgram));
};
$('endProgramBtn').onclick = () => {
  if (!currentProgram) return;
  const name = programDefinition(currentProgram).name;
  if (!confirm(`Start ${name} over? Your days and walks here are cleared; the workouts you have finished stay in your history.`)) return;
  saveProgram(null);
  showFeedback(`${name} was reset. Start it again when you are ready.`, 'success');
};
document.addEventListener('DOMContentLoaded', renderProgram);
