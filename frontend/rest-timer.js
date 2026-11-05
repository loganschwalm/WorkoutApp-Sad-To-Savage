// The rest timer between sets, the hold timer for a set of a timed exercise (a plank), and the screen wake lock that keeps
// them in sight. Loaded on the Tracker after program.js and before script.js, which starts the page.

let restInterval = null;
let restEndsAt = null;
// Paused (Pause rest) with time left, when its button says Resume. Set by stopRestTimer(true), and cleared by whatever
// starts or ends the rest.
let restPaused = false;
let wakeLock = null;
let wakeLockRequesting = false;
let restRemaining = getWorkoutSettings().restDuration;
// The length this rest started at (or was stretched to), for the bar that drains along the panel.
let restTotal = restRemaining;
// The countdown for a set of a timed exercise. holdInterval is set while a hold is on the page, running or paused, since
// big-view.js and logSet read it that way. A running hold has its end time in holdEndsAt, as the rest timer does; a paused
// one keeps the time left in holdLeftMs. holdLength is the planned length in seconds, which Start counts, kept apart from the
// Seconds field. holdPartial says the field holds the seconds of a hold stopped early rather than a length, so the planned
// one is still holdLength.
let holdInterval = null;
let holdEndsAt = null;
let holdLeftMs = 0;
let holdLength = 0;
let holdPartial = false;

function updateRestTimer() {
  $('timerDisplay').textContent = clockTime(restRemaining);
  restTotal = Math.max(restTotal, restRemaining);
  $('restEndBtn').disabled = restRemaining <= 0;
  $('restPanel').style.setProperty('--rest-left', restTotal ? restRemaining / restTotal : 0);
}

// The rest after a set: the current exercise's own (a program gives main lifts longer than accessories, and a template
// can set one), or else the default from Settings.
function restDuration() {
  const exercise = activeSession ? activeSession.exercises[activeSession.currentIndex] : null;
  const own = Number(exercise?.rest);
  return own > 0 ? own : getWorkoutSettings().restDuration;
}

// A warm-up's rest is short, whatever the exercise's own: it is not the work, and a rest of minutes after each of three would be most
// of the workout.
const WARMUP_REST_SECONDS = 45;

function restAfterLastSet() {
  const exercise = activeSession ? activeSession.exercises[activeSession.currentIndex] : null;
  const last = exercise && exercise.sets ? exercise.sets[exercise.sets.length - 1] : null;
  return setTypeOf(last) === 'warmup' ? Math.min(restDuration(), WARMUP_REST_SECONDS) : restDuration();
}

// The rest panel is pinned above the tab bar only while a rest runs, to be seen from anywhere on the page. Once it is over, paused or
// waiting to be started it sits where it is in the page, since on a short phone the pinned place is where the set entry is.
function pinRestPanel(pinned) {
  $('restPanel').classList.toggle('pinned', pinned);
}

// A rest that has just started is pinned over the bottom of the screen; if the set entry is behind it (a short screen), the page goes up
// just far enough to have the entry, Complete set included, above it, so the next set is one tap and not a search for the place where both
// fit. Never so far that the entry's top leaves the screen.
function keepEntryClearOfRest() {
  requestAnimationFrame(() => {
    const panel = $('restPanel');
    const entry = document.querySelector('.set-entry');
    if (!activeSession || panel.hidden || !panel.classList.contains('pinned') || !entry) return;
    const box = entry.getBoundingClientRect();
    const overlap = box.bottom + 12 - panel.getBoundingClientRect().top;
    const room = box.top - 12;
    const by = Math.min(overlap, room);
    if (by > 0) window.scrollBy({ top:by, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
}

// The countdown is derived from an end timestamp, not from counting ticks, so it stays correct when the browser
// throttles timers (locked screen, background tab) and catches up as soon as the page runs again.
function syncRestRemaining() {
  if (restEndsAt !== null) restRemaining = Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000));
}

function tickRest() {
  syncRestRemaining();
  updateRestTimer();
  if (restRemaining <= 0) {
    stopRestTimer();
    playRestAlert(getWorkoutSettings());
    flashRestOver();
    announceRestOver();
  }
}

// For anyone who cannot see the flash or hear the sound: a line a screen reader says, which stays in the page (a region that was
// hidden when its words changed is not read) and is emptied when a rest runs, so the same words change again. The
// big view is a modal dialog, so the page behind it is not read while it is open: it has a line of its own. Only the countdown
// reaching nothing says it; ending a rest, or taking it to nothing, is something the person just did.
function announceRestOver() {
  const inBigView = typeof bigViewIsOpen === 'function' && bigViewIsOpen();
  $(inBigView ? 'bigViewAnnouncement' : 'restAnnouncement').textContent = 'Rest over';
}

// A soft green wash over the whole screen, once, so the end of the rest shows even with the sound off. Skipped for anyone
// who asks for less motion.
function flashRestOver() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const flash = document.createElement('div');
  flash.className = 'rest-flash';
  flash.setAttribute('aria-hidden', 'true');
  document.body.appendChild(flash);
  flash.addEventListener('animationend', () => flash.remove());
  setTimeout(() => flash.remove(), 1500);
}

// End rest: skips what is left. You asked for it, so no alert sounds, but the flash confirms the rest is over.
function endRest() {
  if (restRemaining <= 0) return;
  stopRestTimer();
  restRemaining = 0;
  updateRestTimer();
  flashRestOver();
}

function runRestTimer() {
  clearInterval(restInterval);
  $('restAnnouncement').textContent = $('bigViewAnnouncement').textContent = '';
  restEndsAt = Date.now() + restRemaining * 1000;
  restPaused = false;
  pinRestPanel(true);
  $('restToggleBtn').textContent = 'Pause rest';
  restInterval = setInterval(tickRest, 250);
}

// Paused, a rest with time left says Resume on its button: Start rest is for a rest that has not begun, or is over.
function stopRestTimer(paused = false) {
  clearInterval(restInterval);
  restInterval = null;
  restEndsAt = null;
  restPaused = paused && restRemaining > 0;
  pinRestPanel(false);
  $('restToggleBtn').textContent = restPaused ? 'Resume' : 'Start rest';
}

// −30s and +30s: more rest after a heavy set, less after an easy one, running or paused. Running, it moves the end time
// itself (so a part-second is kept), and taking it down to nothing ends the rest quietly: you asked for it, so no alert.
const REST_ADJUST_LIMIT = 60 * 60;

function adjustRest(seconds) {
  if (restInterval) {
    restEndsAt = Math.min(Date.now() + REST_ADJUST_LIMIT * 1000, restEndsAt + seconds * 1000);
    syncRestRemaining();
    if (restRemaining <= 0) stopRestTimer();
  } else {
    restRemaining = Math.min(REST_ADJUST_LIMIT, Math.max(0, restRemaining + seconds));
    // Taken down to nothing while paused, the rest is over, so its button says Start rest again.
    if (restPaused && restRemaining <= 0) stopRestTimer();
  }
  updateRestTimer();
}

function startRestTimer() {
  restRemaining = restTotal = restAfterLastSet();
  $('restPanel').hidden = false;
  updateRestTimer();
  runRestTimer();
}

// Keeps the screen awake during a workout so the timer can alert you; the browser drops the lock whenever the page is
// hidden. Where it has no Wake Lock to give (any page at a plain http:// address), or refuses one, a silent video does
// the job instead, unless Settings turns that off.
async function syncWakeLock() {
  // The server's settings can arrive (settingschange) before script.js, which declares activeSession, has run.
  const onScreen = typeof activeSession !== 'undefined' && Boolean(activeSession) && !document.hidden;
  if (!('wakeLock' in navigator)) {
    keepAwakeInstead(onScreen);
    return;
  }
  if (onScreen && !wakeLock && !wakeLockRequesting) {
    wakeLockRequesting = true;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
      playKeepAwakeVideo(false);
      showScreenAwakeNotice(false);
    } catch (error) {
      console.error('Unable to keep the screen awake.', error);
      keepAwakeInstead(Boolean(activeSession) && !document.hidden);
    } finally {
      wakeLockRequesting = false;
    }
  } else if (!onScreen && wakeLock) {
    await wakeLock.release();
  }
  if (!onScreen) playKeepAwakeVideo(false);
  if (!activeSession) showScreenAwakeNotice(false);
}

// The screen kept on without a Wake Lock: the video while a workout is on screen, and the note saying how it stands.
function keepAwakeInstead(onScreen) {
  const video = getWorkoutSettings().keepAwakeVideo !== false;
  playKeepAwakeVideo(onScreen && video);
  showScreenAwakeNotice(Boolean(activeSession), video);
}

// The way NoSleep.js keeps a phone awake: a phone does not sleep while a video plays. The video is two seconds of
// black, muted, so it never takes the audio from music; it carries a silent sound track all the same, since Safari lets
// the screen sleep under a video with no sound at all. Nor does it loop, which Safari also lets the screen sleep under:
// it is sent back to its start before it ends instead. Made with
//   ffmpeg -f lavfi -i color=c=black:s=16x16:r=10:d=2 -f lavfi -i anullsrc=channel_layout=mono:sample_rate=8000 -t 2
//     -c:v libx264 -profile:v baseline -pix_fmt yuv420p -c:a aac -b:a 8k -movflags +faststart media/keep-awake.mp4
let keepAwakeVideo = null;

function playKeepAwakeVideo(on) {
  if (!on) {
    if (keepAwakeVideo && !keepAwakeVideo.paused) keepAwakeVideo.pause();
    return;
  }
  if (!keepAwakeVideo) {
    keepAwakeVideo = document.createElement('video');
    keepAwakeVideo.muted = true;
    keepAwakeVideo.setAttribute('muted', '');
    keepAwakeVideo.setAttribute('playsinline', '');
    keepAwakeVideo.setAttribute('title', 'Keeping the screen on');
    keepAwakeVideo.src = '/media/keep-awake.mp4';
    keepAwakeVideo.addEventListener('timeupdate', () => { if (keepAwakeVideo.currentTime > 1) keepAwakeVideo.currentTime = 0; });
  }
  // Refused (a phone in Low Power Mode, or before any tap): logging the next set asks again.
  Promise.resolve(keepAwakeVideo.play()).catch(() => {});
}

// A page cannot run while the phone is locked, so a rest that outlasts the phone's auto-lock ends in silence. Browsers
// only keep the screen on over HTTPS (or on localhost), which a server at a plain http:// address is not, so there the
// workout says what is being done about it, and what to do if the phone locks all the same.
function showScreenAwakeNotice(show, video = false) {
  const notice = $('screenAwakeNotice');
  if (show) {
    const advice = 'Keep the screen awake while you rest (on an iPhone, set Auto-Lock to Never while you train)';
    if (video) {
      // Over HTTPS the video is only a fallback for a browser that gave no lock, and the note took a good deal of room in the
      // workout for something that is usually working, so it is left out there. Over http:// it stays: the way out is HTTPS.
      if (window.isSecureContext) {
        notice.hidden = true;
        return;
      }
      notice.textContent = 'Over a plain http:// address the browser will not keep the screen on, so the app plays a silent video to do it. '
        + `If your phone still locks during a rest, a locked phone cannot sound the rest alert: ${advice.charAt(0).toLowerCase()}${advice.slice(1)}, or reach the app over HTTPS.`;
    } else {
      notice.textContent = window.isSecureContext
        ? `This browser will not keep the screen on, and a locked phone cannot sound the rest alert. ${advice}.`
        : `Over a plain http:// address the app cannot keep the screen on, and a locked phone cannot sound the rest alert. ${advice}, or reach the app over HTTPS, where it does this itself.`;
    }
  }
  notice.hidden = !show;
}

window.addEventListener('settingschange', () => syncWakeLock());

// ---- Timed exercises --------------------------------------------------------
// A set of a timed exercise is a hold. Start timer counts down the planned seconds, and Pause and Resume stop and start it from
// the time left. When the time is up it sounds the rest alert and logs the set by itself, since hands are busy holding the plank.
// Stop (or Complete set) ends it early, filling in the seconds actually held.
function holdRemaining() {
  const ms = holdEndsAt !== null ? holdEndsAt - Date.now() : holdLeftMs;
  return Math.max(0, Math.ceil(ms / 1000));
}

// With no hold on the page, the panel shows the planned length, which is the Seconds field's: what was typed, or what the set was
// planned to be. A Stop has put the seconds held into the field, which is not a new length, so it is not read here (holdPartial).
function syncHoldDisplay() {
  if (holdInterval) return;
  holdPartial = false;
  holdLength = Math.max(0, Math.floor(Number($('completedReps').value)) || 0);
  $('holdDisplay').textContent = clockTime(holdLength);
}

// What the hold's buttons say: Start timer with no hold on the page, and Stop while one is (the big view's button presses this one,
// so a hold can be stopped there too). Beside Stop, Pause while a hold runs and Resume while it is paused.
function showHoldState() {
  const running = holdEndsAt !== null;
  $('holdBtn').textContent = holdInterval ? 'Stop' : 'Start timer';
  $('holdPauseBtn').textContent = running ? 'Pause' : 'Resume';
  $('holdPauseBtn').hidden = !holdInterval;
  $('holdTimer').classList.toggle('running', running);
}

// Puts a hold on the page with holdLeftMs to go: counting down from now when running, else paused where it is. Its interval is kept
// for as long as it is on the page, paused or not, so the display is still drawn and the big view still shows a hold.
function placeHold(running) {
  clearInterval(holdInterval);
  holdInterval = setInterval(tickHold, 250);
  holdEndsAt = running ? Date.now() + holdLeftMs : null;
  if (running) holdLeftMs = 0;
  showHoldState();
  rememberHold();
  tickHold();
}

function tickHold() {
  const left = holdRemaining();
  $('holdDisplay').textContent = clockTime(left);
  // Paused, nothing runs out: the display is all there is to do.
  if (holdEndsAt !== null && left <= 0) finishHold(true);
}

// The time is up: the set logs itself with the planned seconds. The alert asks for the vibration whatever the rest sound is,
// since a hold ends in silence for anyone with the sound off, and it is the one thing a person holding a plank cannot look
// for. playRestAlert vibrates only when Settings asks for it, so this passes it on.
function finishHold(sound) {
  stopHold();
  if (sound) playRestAlert({ ...getWorkoutSettings(), vibrate:true });
  $('completedReps').value = String(holdLength);
  logSet();
}

function startHold() {
  // The field is the length unless a Stop has put the seconds held into it: then the planned length stands, and a Start
  // gives the whole hold.
  if (!holdPartial) holdLength = Math.max(0, Math.floor(Number($('completedReps').value)) || 0);
  if (!(holdLength >= 1)) { showFeedback('Enter the seconds to hold, then start the timer.'); $('completedReps').focus(); return; }
  clearFeedback();
  // The rest is over once the next set starts.
  stopRestTimer();
  $('restPanel').hidden = true;
  holdLeftMs = holdLength * 1000;
  placeHold(true);
}

// Stopped by hand (early), the seconds held so far go into the Seconds field as the logged value, and the planned length
// is kept for the next Start. Stopped because the workout moved on, or the hold ran out, nothing goes in.
function stopHold(early = false) {
  if (!holdInterval) return;
  const held = Math.max(1, holdLength - holdRemaining());
  clearInterval(holdInterval);
  holdInterval = null;
  holdEndsAt = null;
  holdLeftMs = 0;
  if (early) {
    $('completedReps').value = String(held);
    holdPartial = true;
  }
  $('holdDisplay').textContent = clockTime(early ? held : holdLength);
  showHoldState();
  rememberHold();
}

// A hold on the page is kept on this device the way the rest is (rememberRest): a phone that closes the page during a hold would
// otherwise lose it, time and all. It goes with the workout and set it follows, and restoreHold puts it back.
function rememberHold() {
  if (typeof activeSession === 'undefined') return;
  writeLocal(localKey('hold'), holdInterval && activeSession ? {
    startedAt:activeSession.startedAt, index:activeSession.currentIndex, sets:restSetCount(activeSession), length:holdLength,
    endsAt:holdEndsAt, leftMs:holdLeftMs,
  } : null);
}

// Puts back the hold kept by rememberHold, if it follows the last set of the workout now on show (restoreRest calls this
// first). Running, it runs on to its end time; paused, it keeps the time it had. Over while the page was away, its set is
// logged with its seconds, once the workout is drawn (a set logged while it is being drawn would be drawn over), and
// without an alert, which would come late.
function restoreHold() {
  const saved = readLocal(localKey('hold'));
  if (!saved || !activeSession || saved.startedAt !== activeSession.startedAt || saved.index !== activeSession.currentIndex
    || saved.sets !== restSetCount(activeSession)) return;
  const length = Math.floor(Number(saved.length)) || 0;
  if (!(length >= 1)) return;
  holdLength = length;
  holdPartial = false;
  stopRestTimer();
  $('restPanel').hidden = true;
  if (saved.endsAt) {
    const left = Number(saved.endsAt) - Date.now();
    if (left > 0) {
      holdLeftMs = left;
      placeHold(true);
      return;
    }
    writeLocal(localKey('hold'), null);
    const { startedAt, index } = saved;
    setTimeout(() => {
      if (!activeSession || activeSession.startedAt !== startedAt || activeSession.currentIndex !== index) return;
      finishHold(false);
    }, 0);
    return;
  }
  holdLeftMs = Math.max(0, Number(saved.leftMs) || 0);
  placeHold(false);
}

// Start timer, then Stop: the one button the big view presses too, so a hold can be stopped (and its seconds logged) from there.
$('holdBtn').onclick = () => {
  unlockAudio();
  if (holdInterval) stopHold(true);
  else startHold();
};
// Pause beside Stop while a hold is on the page, and Resume once it is paused. It is made here, not in the page's markup, since it
// belongs to the hold control alone, and shows only while a hold is there.
{
  const pauseButton = document.createElement('button');
  pauseButton.id = 'holdPauseBtn';
  pauseButton.className = 'secondary';
  pauseButton.type = 'button';
  pauseButton.hidden = true;
  pauseButton.textContent = 'Pause';
  pauseButton.onclick = () => {
    unlockAudio();
    if (holdEndsAt !== null) { holdLeftMs = Math.max(0, holdEndsAt - Date.now()); placeHold(false); }
    else placeHold(true);
  };
  $('holdBtn').after(pauseButton);
}

$('restToggleBtn').onclick = () => {
  unlockAudio();
  if (restInterval) { syncRestRemaining(); updateRestTimer(); stopRestTimer(true); }
  else {
    if (restRemaining <= 0) restRemaining = restTotal = restAfterLastSet();
    updateRestTimer();
    runRestTimer();
  }
};
$('restEndBtn').onclick = endRest;
$('restResetBtn').onclick = () => { stopRestTimer(); restRemaining = restTotal = restAfterLastSet(); updateRestTimer(); };
// On a phone the rest is End rest and Pause rest with ··· beside them, which opens Fix last set and Restart rest in a row under (on a wide
// screen all four show, and ··· does not). Choosing one closes it again, so the panel is as small as it can be while the page is in use.
function showRestMore(open) {
  $('restMoreBtn').setAttribute('aria-expanded', String(open));
  $('restPanel').classList.toggle('more-open', open);
}
$('restMoreBtn').onclick = () => showRestMore($('restMoreBtn').getAttribute('aria-expanded') !== 'true');
$('restMoreItems').addEventListener('click', e => { if (e.target.closest('button')) showRestMore(false); });
$('restAdjust').onclick = e => {
  const button = e.target.closest('[data-rest-adjust]');
  if (!button) return;
  unlockAudio();
  adjustRest(Number(button.dataset.restAdjust));
};

// A phone often closes an app left locked through a rest, and the page that opens again would have no rest on show: the
// countdown lives in this page. So whenever the page is put away, the rest on show is kept on this device (it is this
// device's, so it is not uploaded with the workout), with which workout and set it follows; showSavedSession puts it back
// when the same workout comes back with nothing logged since. The end time is a clock time, so a rest that ran on while
// the page was gone comes back with the time it has left, or over.
function restSetCount(session) {
  return session.exercises.reduce((total, item) => total + (item.sets?.length || 0), 0);
}

function rememberRest() {
  if (typeof activeSession === 'undefined') return;
  const shown = activeSession && !$('restPanel').hidden;
  writeLocal(localKey('rest'), shown ? {
    startedAt:activeSession.startedAt, index:activeSession.currentIndex, sets:restSetCount(activeSession),
    endsAt:restInterval ? restEndsAt : null, remaining:restRemaining, total:restTotal, paused:restPaused,
  } : null);
}

// Puts back the rest kept by rememberRest, if it follows the last set of the workout now on show. Running, it runs on to its
// end time; paused, it keeps the time it had; over while the page was gone, it shows 0:00, as a page left open would have,
// without an alert that would come late.
function restoreRest() {
  // A hold kept on this device goes back first. A hold on the page means the rest was put away when it started, so there
  // is no rest to put back after it.
  restoreHold();
  if (holdInterval) return;
  const saved = readLocal(localKey('rest'));
  if (!saved || !activeSession || saved.startedAt !== activeSession.startedAt || saved.index !== activeSession.currentIndex
    || saved.sets !== restSetCount(activeSession)) return;
  restTotal = Number(saved.total) || 0;
  $('restPanel').hidden = false;
  if (saved.endsAt) {
    restRemaining = Math.max(0, Math.ceil((saved.endsAt - Date.now()) / 1000));
    if (restRemaining > 0) {
      runRestTimer();
      restEndsAt = saved.endsAt;
    }
  } else {
    restRemaining = Math.max(0, Number(saved.remaining) || 0);
    // Its button says what the page it came from said: Resume for a paused rest, Start rest for one that was waiting to start.
    stopRestTimer(saved.paused === true);
  }
  updateRestTimer();
}

// A phone that is locked or in another app does not run the page, so it cannot sound the alert at the end of a rest. If this device has
// rest alerts on (reminders.js), the server is told, as the page is hidden, how many seconds the rest has left, and sends the
// notification when they are up; and told to forget it when the page is back on screen, which sounds its own alert. Only while the
// page is hidden: on screen, the page's alert and a notification would be two for one rest, and a notification where the app is in
// front is the kind iOS punishes. The time is seconds left, not a time of day, since the phone's clock and the server's differ.
let restAlertAsked = false;

function askRestAlert(seconds) {
  const endpoint = typeof restAlertEndpoint === 'function' ? restAlertEndpoint() : '';
  if (!endpoint) return;
  // keepalive lets it leave even as the page goes; the endpoint is kept where it can be read at once, since there is no time to ask
  // the browser for it.
  syncFetch('/api/push/rest', { method:'POST', keepalive:true, headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ endpoint, seconds }) })
    .catch(error => console.error('Unable to tell the server about the rest alert.', error));
}

function pageHiddenWithRest() {
  if (restAlertAsked || !restInterval || restEndsAt === null) return;
  const left = Math.floor((restEndsAt - Date.now()) / 1000);
  if (left < 2) return;
  restAlertAsked = true;
  askRestAlert(left);
}

function pageBackWithRest() {
  if (!restAlertAsked) return;
  restAlertAsked = false;
  askRestAlert(null);
  // One that came while the page was away is of no use now it is back.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => registration.getNotifications({ tag:'rest-over' }))
      .then(shown => shown.forEach(notification => notification.close())).catch(() => {});
  }
}

window.addEventListener('pagehide', () => { rememberRest(); rememberHold(); pageHiddenWithRest(); });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { rememberRest(); rememberHold(); pageHiddenWithRest(); } else pageBackWithRest();
  // Back from a locked screen or another app, an iPhone's sound is interrupted; it is woken before the rest catches up.
  if (!document.hidden) wakeAudio();
  if (!document.hidden && restInterval) tickRest();
  if (!document.hidden && holdInterval) tickHold();
  syncWakeLock();
});
