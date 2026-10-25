// The saved workouts on the Tracker: loading them (and the copy kept for offline), the line that says when you last trained and what is
// waiting or refused, and the request History makes to change one. The list of them is History's. Loaded before script.js, which starts
// the page and declares the state these use (savedWorkouts, savedWorkoutsLoaded, workoutsReachable); nothing here reads it until it runs.

// Changes to a saved workout go straight to the server. A new one goes into the upload queue instead (see the form's Save).
function updateSavedWorkout(workout) {
  return syncFetch(`/api/workouts/${encodeURIComponent(workout.id)}`, { method:'PUT', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(workout) })
    .then(response => response.ok ? response.json() : Promise.reject(new Error(`Unable to save workout (${response.status}).`)));
}

// "Today", "yesterday", "3 days ago", and the date from two weeks on: by calendar day, so a workout late last night is
// yesterday even when it was only hours ago. Here and not in common.js, so a page cached from before this change cannot be
// left calling something the cached common.js lacks.
function describeDaysAgo(when, now = new Date()) {
  const startOfDayOf = value => { const date = new Date(value); return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime(); };
  const days = Math.round((startOfDayOf(now) - startOfDayOf(when)) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return days < 14 ? `${days} days ago` : new Date(when).toLocaleDateString(undefined, { month:'short', day:'numeric' });
}

// The line under the page's name: when you last trained. What is next is the panel just below it, so the header does not say it again.
function renderTrackerStatus(workouts) {
  const last = workouts[0];
  $('pageStatus').textContent = last ? `Last workout: ${last.name}, ${describeDaysAgo(last.createdAt)}.` : 'Nothing logged yet.';
}

// What the status line calls each part of the account's state.
const STATE_PART_NAMES = { settings:'settings', templates:'templates', program:'program', exerciseNotes:'exercise notes', goals:'goals', bodyweight:'weigh-ins', exerciseLibrary:'exercise library' };

function renderStorageStatus() {
  const waiting = readPendingWorkouts().length;
  // Nothing to say while everything is saved to the account; the line only speaks up when something is not.
  const parts = workoutsReachable ? [] : ['Server unreachable'];
  if (waiting) parts.push(`${waiting} workout${waiting === 1 ? '' : 's'} waiting to sync`);
  const refused = readRejectedWorkouts().length;
  if (refused) parts.push(`${refused} workout${refused === 1 ? '' : 's'} refused by the server (kept on this device; see Settings, Your data)`);
  // A stale offline.js from the cache may not have it yet.
  const refusedParts = typeof refusedStateParts === 'function' ? refusedStateParts() : [];
  if (refusedParts.length) parts.push(`${refusedParts.map(part => STATE_PART_NAMES[part] || part).join(', ')} refused by the server (kept on this device)`);
  $('storageStatus').textContent = parts.join(' · ');
}

async function loadSavedWorkouts() {
  try {
    // Offline, the copy kept on this device from the last load stands in (see getSavedWorkouts), and the line under the
    // list still says the server is out of reach.
    let reached = true;
    const everything = await getSavedWorkouts().catch(error => {
      if (!error.copy) throw error;
      console.error('Unable to load saved workouts; showing the copy on this device.', error);
      reached = false;
      return error.copy;
    });
    // Strength workouts only: cardio sessions have the Cardio page, and no exercises for last time or the records.
    const workouts = everything.filter(workout => !isCardio(workout));
    savedWorkouts = workouts;
    savedSessions = everything;
    savedWorkoutsLoaded = true;
    renderTrackerStatus(workouts);
    lastPerformance = buildLastPerformance([...workouts, ...readPendingWorkouts()]);
    saveLastPerformance();
    personalBests = bestsOf([...workouts, ...readPendingWorkouts()]);
    writeLocal(localKey('bests'), personalBests);
    renderExerciseSuggestions();
    renderProgram();
    renderScheduleNudge();
    // A workout already under way can say what finishing it earns, and last week can be looked back on, now the whole
    // history is here.
    if (activeSession) renderReach();
    renderRecap();
    renderWhatsNew();
    workoutsReachable = reached;
    renderStorageStatus();
    return workouts;
  } catch (error) {
    workoutsReachable = false;
    renderStorageStatus();
    console.error('Unable to load saved workouts.', error);
    return null;
  }
}

// A link from History says which of the saved workouts to change once they have loaded: ?edit= opens it in the form. It is taken off
// the address, so a reload does not do it again.
function takeRequestedWorkout() {
  const params = new URLSearchParams(location.search);
  const action = ['edit'].find(name => params.has(name));
  if (!action) return null;
  const id = Number(params.get(action));
  params.delete(action);
  const query = params.toString();
  history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
  return { action, id };
}
