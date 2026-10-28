"""Settings and the program: kept per account, and never undone by a change made offline."""

import json
import re
import time
import urllib.request

from ..harness import CDP, LIGHT_DEVICE

INTERCEPT = True


def run(t):
    cdp, check, api, token, wait_for = t.cdp, t.check, t.api, t.token, t.wait_for

    def server_state(tok=token):
        return api('GET', '/api/state', token=tok)[0]

    def loaded(path='/index.html'):
        """Open a page and wait until it has settled on this account's settings and program."""
        cdp.goto(path)
        cdp.wait("typeof getWorkoutSettings === 'function' && !!window.serverStateReady")
        cdp.ev('window.serverStateReady.then(() => true)')
        cdp.pause(0.3)

    def level():
        return cdp.ev('currentProgram ? currentProgram.options.level : null')

    def next_title():
        return cdp.ev("document.querySelector('#programNext strong').textContent")

    def rest_duration():
        return cdp.ev('getWorkoutSettings().restDuration')

    def save_settings(**changes):
        cdp.ev("document.getElementById('settingsButton').click()")
        for element, value in changes.items():
            cdp.ev(f"document.getElementById('{element}').value = {json.dumps(str(value))}")
        cdp.ev("document.getElementById('settingsForm').requestSubmit()")
        cdp.pause(0.3)

    def start_program(chosen):
        cdp.ev("document.querySelector('#programNext [data-program-action=setup]').click()")
        cdp.ev(f"document.getElementById('programLevel').value = '{chosen}'")
        cdp.ev("document.getElementById('programForm').requestSubmit()")
        cdp.pause(0.3)

    def ui_login(username, query=''):
        cdp.goto('/login.html' + query)
        cdp.ev(f"document.getElementById('username').value = {json.dumps(username)}; document.getElementById('password').value = 'chalk-and-plates-42';"
               "document.getElementById('authForm').requestSubmit()")
        cdp.wait("location.pathname !== '/login.html'")
        cdp.pause(0.3)

    # ------------------------------------------------------------------ S1 settings
    print('S1  a setting changed offline survives coming back online')
    loaded()
    check('starts from the default rest duration', rest_duration() == 90, rest_duration())
    cdp.block_api = True
    save_settings(restDurationSetting=150)
    check('the change applies straight away offline', rest_duration() == 150, rest_duration())
    cdp.block_api = False
    loaded()  # back online and reloading before the retry fires: the server still has the old value
    check('reloading keeps the offline change instead of the older server copy', rest_duration() == 150, rest_duration())
    check('and it reaches the server', wait_for(lambda: server_state()['settings'].get('restDuration') == 150),
          server_state()['settings'].get('restDuration'))

    # ------------------------------------------------------------------ S2 the program
    print('S2  a program started offline survives coming back online')
    cdp.block_api = True
    start_program('sw')
    check('it is shown straight away', level() == 'sw' and next_title() == 'Upper Body Focus', level())
    cdp.block_api = False
    loaded()
    check('reloading keeps it', level() == 'sw', level())
    check('and it reaches the server', wait_for(lambda: (server_state().get('program') or {}).get('options') == {'level': 'sw', 'pilates': 'yes'}), server_state().get('program'))

    # ------------------------------------------------------------------ S3 the server still wins when nothing is pending
    print('S3  a change made on another device still arrives')
    state = server_state()
    api('PUT', '/api/state', {'settings': {**state['settings'], 'restDuration': 210},
                              'program': {**state['program'], 'done': {'0-0': {'at': 5, 'skipped': False}}}}, token)
    loaded()
    check("the other device's setting replaces this device's clean copy", rest_duration() == 210, rest_duration())
    check("and its finished day moves the program on", next_title() == 'Full Body Focus' and list(cdp.ev('currentProgram.done')) == ['0-0'], next_title())
    loaded('/history.html')
    check('the History page reads the same settings', rest_duration() == 210, rest_duration())

    # ------------------------------------------------------------------ S4 another account on this browser
    print('S4  another account on the same browser never sees or inherits these')
    _, cookie = api('POST', '/api/auth/register', {'username': 'second', 'email': 'second@example.test', 'password': 'chalk-and-plates-42'})
    second = cookie.split('session=')[1].split(';')[0]
    cdp.block_paths = ['/api/state']  # the new account's own copy cannot load
    ui_login('second')
    check('signing in without ?next= lands on /', cdp.ev('location.pathname') == '/', cdp.ev('location.pathname'))
    urls = cdp.ev("performance.getEntriesByType('resource').map(e => new URL(e.name).pathname)") or []
    check('and its scripts load from the site root', urls and not any(u.startswith('/frontend/') for u in urls), str(urls))
    cdp.wait("!!document.querySelector('#programNext [data-program-action=setup]')")
    cdp.pause(0.5)
    check("the first account's program is not shown: this one has none to follow yet", cdp.ev('currentProgram') is None)
    check("nor its settings", rest_duration() == 90, rest_duration())
    start_program('nts')
    cdp.block_paths = []
    check("the new account's program reaches its own account",
          wait_for(lambda: (server_state(second).get('program') or {}).get('options') == {'level': 'nts', 'pilates': 'yes'}), server_state(second).get('program'))
    mine = server_state()['program']
    check("and the first account's program is unchanged", mine['options'] == {'level': 'sw', 'pilates': 'yes'} and list(mine['done']) == ['0-0'], mine)

    ui_login('tester')
    cdp.wait("typeof currentProgram !== 'undefined' && currentProgram !== null")
    check('signing back in shows the first account its own program', level() == 'sw' and list(cdp.ev('currentProgram.done')) == ['0-0'], level())

    # ------------------------------------------------------------------ S5 upgrading from the shared copy
    print('S5  settings kept by the previous version are adopted')
    me = api('GET', '/api/auth/me', token=token)[0]['user']['id']
    loaded()
    cdp.ev(f"localStorage.removeItem('workout-tracker-settings-{me}'); localStorage.removeItem('workout-tracker-templates-{me}');"
           f"localStorage.setItem('workout-tracker-last-user', '{me}');"
           "localStorage.setItem('workout-tracker-settings', JSON.stringify({ theme: 'dark', restDuration: 95 }))")
    cdp.block_paths = ['/api/state']
    loaded()
    check('the old copy is used while the server cannot be reached',
          cdp.ev('document.documentElement.dataset.theme') == 'dark' and rest_duration() == 95,
          f"{cdp.ev('document.documentElement.dataset.theme')} {rest_duration()}")
    check('the shared key is gone', cdp.ev("localStorage.getItem('workout-tracker-settings') === null") is True)
    cdp.block_paths = []
    loaded()
    check("once the server answers, its copy replaces the old one (it was never changed here)", rest_duration() == 210, rest_duration())
    check('and nothing from the old copy was uploaded', server_state()['settings'].get('theme') != 'dark', server_state()['settings'])

    # ------------------------------------------------------------------ S6 export and import
    print('S6  exporting and importing from Settings')
    loaded()
    # Downloads are caught instead of saved: each one's file name and contents are kept for the checks below.
    cdp.ev("""window.__downloads = [];
      const createURL = URL.createObjectURL;
      URL.createObjectURL = blob => { window.__blob = blob; return createURL(blob); };
      HTMLAnchorElement.prototype.click = function () { if (this.download) window.__downloads.push({ name: this.download, blob: window.__blob }); };""")
    cdp.ev("document.getElementById('settingsButton').click()")
    shown = cdp.ev("['exportButton', 'exportCsvButton', 'importButton'].map(id => document.getElementById(id).offsetParent !== null)")
    check('Settings offers Export, Export sets as CSV and Import', shown == [True, True, True], shown)
    # A finished workout still waiting on this device uploads first, so the file has it.
    cdp.ev("queuePendingWorkout({ name: 'Waiting Workout', notes: '', createdAt: Date.now(), clientId: 'waiting-1', "
           "exercises: [{ name: 'Squat', weight: 100, reps: 5, sets: [{ weight: 100, reps: 5 }] }] })")
    cdp.ev("document.getElementById('exportButton').click()")
    check('Export downloads a file', cdp.wait('window.__downloads.length === 1'), cdp.ev("document.getElementById('dataStatus').textContent"))
    name = cdp.ev('window.__downloads[0] && window.__downloads[0].name') or ''
    check("named with today's date", re.fullmatch(r'workout-tracker-\d{4}-\d{2}-\d{2}\.json', name), name)
    exported = json.loads(cdp.ev('window.__downloads[0].blob.text()') or '{}')
    names = [w.get('name') for w in exported.get('workouts', [])]
    check('with every workout, the one that was waiting on this device too',
          'Waiting Workout' in names and len(names) == len(api('GET', '/api/workouts', token=token)[0]['workouts']), names)
    check('and the program', (exported.get('program') or {}).get('options') == {'level': 'sw', 'pilates': 'yes'}, exported.get('program'))
    check('the status says so', cdp.ev("document.getElementById('dataStatus').textContent") == f'Downloaded {name}.',
          cdp.ev("document.getElementById('dataStatus').textContent"))
    cdp.ev("document.getElementById('exportCsvButton').click()")
    check('Export sets as CSV downloads a spreadsheet', cdp.wait("window.__downloads.length === 2 && window.__downloads[1].name.endsWith('.csv')"),
          cdp.ev('window.__downloads.map(d => d.name)'))
    sheet = cdp.ev('window.__downloads[1] ? window.__downloads[1].blob.text() : ""') or ''
    check('of every set, with a header row', 'Date,Workout,Exercise,Set,Weight,Unit,Reps,Seconds' in sheet and 'Waiting Workout,Squat,1,100,lbs,5' in sheet, sheet[:200])
    cdp.block_api = True
    cdp.ev("document.getElementById('exportButton').click()")
    check('offline, Export says it could not reach the server', cdp.wait("document.getElementById('dataStatus').textContent.startsWith('Could not reach')"),
          cdp.ev("document.getElementById('dataStatus').textContent"))
    check('and downloads nothing', cdp.ev('window.__downloads.length') == 2, cdp.ev('window.__downloads.length'))
    cdp.block_api = False

    def choose(text, filename):
        cdp.ev(f"""(() => {{
          const files = new DataTransfer();
          files.items.add(new File([{json.dumps(text)}], {json.dumps(filename)}, {{ type: 'application/json' }}));
          const input = document.getElementById('importFile');
          input.files = files.files;
          input.dispatchEvent(new Event('change'));
        }})()""")

    _, cookie = api('POST', '/api/auth/register', {'username': 'third', 'email': 'third@example.test', 'password': 'chalk-and-plates-42'})
    third = cookie.split('session=')[1].split(';')[0]
    api('POST', '/api/workouts', {'name': 'From Elsewhere', 'notes': '', 'clientId': 'elsewhere-1',
                                  'exercises': [{'name': 'Row', 'weight': 60, 'reps': 8, 'sets': [{'weight': 60, 'reps': 8}]}]}, third)
    elsewhere = api('GET', '/api/export', token=third)[0]
    asked = len(cdp.dialogs)
    choose(json.dumps(elsewhere), 'elsewhere.json')
    check('Import asks first, saying how many workouts', wait_for(lambda: len(cdp.dialogs) > asked) and len(cdp.dialogs) == asked + 1
          and cdp.dialogs[-1].startswith('Import 1 workout from elsewhere.json?'), cdp.dialogs[asked:])
    check('then says what it added', cdp.wait("document.getElementById('dataStatus').textContent.startsWith('Imported 1 workout.')"),
          cdp.ev("document.getElementById('dataStatus').textContent"))
    check('and the account has it', 'From Elsewhere' in [w['name'] for w in api('GET', '/api/workouts', token=token)[0]['workouts']])
    cdp.ev("document.getElementById('closeSettings').click()")
    check('closing Settings loads it into the page', cdp.wait("savedWorkouts.some(w => w.name === 'From Elsewhere')", 10))
    cdp.ev("document.getElementById('settingsButton').click()")
    asked = len(cdp.dialogs)
    choose('Date,Workout\n', 'sets.csv')
    check('a file that is not an export is turned away without asking',
          cdp.wait("document.getElementById('dataStatus').textContent.startsWith('sets.csv is not a Workout Tracker export')") and len(cdp.dialogs) == asked,
          cdp.ev("document.getElementById('dataStatus').textContent"))

    # ------------------------------------------------------------------ S7 two devices, one change each
    print('S7  a setting changed here offline, and another changed on another device meanwhile: both kept')
    loaded()
    other_device = lambda **changes: api('PATCH', '/api/state', {'settings': {'base': server_state()['settings'], 'value': {**server_state()['settings'], **changes}}}, token)
    cdp.block_api = True
    save_settings(restDurationSetting=75)
    other_device(weeklyGoal=5)
    cdp.block_api = False
    loaded()  # back online and reloading before the retry: the change waiting here goes up first, and the page loads the merge
    check('reloading shows the change made here and the one made on the other device', rest_duration() == 75 and cdp.ev('getWorkoutSettings().weeklyGoal') == 5,
          f"{rest_duration()} {cdp.ev('getWorkoutSettings().weeklyGoal')}")
    settings = server_state()['settings']
    check('and the server has both', settings.get('restDuration') == 75 and settings.get('weeklyGoal') == 5, settings)

    # ------------------------------------------------------------------ S8 a page open from before another device's change
    print("S8  a page opened before another device logged a walk: logging one here keeps both")
    loaded()
    current = server_state()['program']
    other_walk = {'at': 7, 'steps': 4000, 'distance': 1.5, 'unit': 'mi'}
    api('PATCH', '/api/state', {'program': {'base': current, 'value': {**current, 'walks': {**current.get('walks', {}), '2026-01-02': other_walk}}}}, token)
    cdp.ev("document.querySelector('#programWalk [data-walk-action=save]').click()")
    walks = lambda: server_state()['program'].get('walks', {})
    check("the walk logged here reaches the server, beside the other device's", wait_for(lambda: '2026-01-02' in walks() and len(walks()) == 2), walks())
    loaded()
    check('and this page shows both once it loads again', len(cdp.ev('Object.keys(currentProgram.walks)')) == 2, cdp.ev('Object.keys(currentProgram.walks)'))

    # ------------------------------------------------------------------ S9 a change made while the last one is still going up
    print('S9  a change made while the last one is still going up carries only itself')
    loaded()
    # Uploads are held, to be let go one at a time.
    cdp.ev("""window.__held = []; const realSyncFetch = syncFetch;
      syncFetch = (path, options = {}, timeout) => options.method === 'PATCH'
        ? new Promise(resolve => window.__held.push(() => resolve(realSyncFetch(path, options, timeout)))) : realSyncFetch(path, options, timeout);""")
    save_settings(restDurationSetting=105)
    check('the first change starts going up', cdp.wait('window.__held.length === 1'))
    save_settings(weeklyGoalSetting=6)
    cdp.ev('window.__held.shift()()')
    check('once it is up, the change made meanwhile starts from it', cdp.wait("readLocalState('settings').dirty && readLocalState('settings').base.restDuration === 105"),
          cdp.ev("JSON.stringify(readLocalState('settings'))"))
    check('the server has the first', server_state()['settings'].get('restDuration') == 105, server_state()['settings'])
    other_device(restDuration=120)
    cdp.wait('window.__held.length === 1')
    cdp.ev('window.__held.shift()()')
    check("the second goes up without putting back the first over the other device's later change",
          wait_for(lambda: server_state()['settings'].get('weeklyGoal') == 6) and server_state()['settings'].get('restDuration') == 120, server_state()['settings'])
    check('and nothing is left waiting here', cdp.wait("!readLocalState('settings').dirty"), cdp.ev("JSON.stringify(readLocalState('settings'))"))

    # ------------------------------------------------------------------ S10 an upload whose answer never came
    print('S10 a change stored though its answer never came, then changed back: the change back still reaches the server')
    loaded()
    before = cdp.ev('getWorkoutSettings().weeklyGoal')
    cdp.drop_method, cdp.drop_responses, dropped = 'PATCH', 1, cdp.dropped
    save_settings(weeklyGoalSetting=2)
    check('the server stores the change, and its answer is lost on the way back',
          wait_for(lambda: server_state()['settings'].get('weeklyGoal') == 2 and cdp.dropped == dropped + 1), server_state()['settings'].get('weeklyGoal'))
    save_settings(weeklyGoalSetting=before)
    loaded()  # the page is closed and opened again before anything else is heard
    check('the change back, to the very value it started from, reaches the server and shows',
          wait_for(lambda: server_state()['settings'].get('weeklyGoal') == before) and cdp.ev('getWorkoutSettings().weeklyGoal') == before,
          f"{server_state()['settings'].get('weeklyGoal')} {cdp.ev('getWorkoutSettings().weeklyGoal')}")
    cdp.drop_method = 'POST'

    # ------------------------------------------------------------------ S11 a part the server refuses
    print('S11 a part the server refuses does not hold up the others')
    loaded()
    goals_before, notes_before = server_state()['goals'], server_state()['exerciseNotes']
    cdp.ev("""window.__patches = 0; const realSyncFetch = syncFetch;
      syncFetch = (path, options = {}, timeout) => { if (options.method === 'PATCH') window.__patches += 1; return realSyncFetch(path, options, timeout); };""")
    # A goal with no name is one the server will not take, whatever the page let through; the note beside it is fine.
    cdp.ev("saveLocalState('goals', { broken: { name: '', target: 100, unit: 'lbs' } }); saveLocalState('exerciseNotes', { ...(readLocalState('exerciseNotes')?.value || {}), 'S11 Lift': 'kept' })")
    check("the note goes up though the goal beside it was refused", wait_for(lambda: server_state()['exerciseNotes'].get('S11 Lift') == 'kept'), server_state()['exerciseNotes'])
    check('the goal the server refused is not stored', server_state()['goals'] == goals_before, server_state()['goals'])
    check('it is set aside here, still shown, and the note is no longer waiting',
          cdp.wait("readLocalState('goals').rejected === true && !readLocalState('exerciseNotes').dirty"), cdp.ev("JSON.stringify([readLocalState('goals'), readLocalState('exerciseNotes')])"))
    sent = cdp.ev('window.__patches')
    # Not "nothing in three seconds" but: a later change goes up (the loop that would send the goal again has had its turns, since the
    # upload that carries the note is the one that would carry it), and that is the only thing sent.
    cdp.ev("saveLocalState('exerciseNotes', { ...(readLocalState('exerciseNotes')?.value || {}), 'S11 Lift': 'kept again' })")
    check('a later change goes up', wait_for(lambda: server_state()['exerciseNotes'].get('S11 Lift') == 'kept again'), server_state()['exerciseNotes'])
    cdp.pause(1.5)
    check('and the goal is not sent again and again', cdp.ev('window.__patches') == sent + 1, f"{sent} then {cdp.ev('window.__patches')}")
    check('the Tracker says so beside the workouts the server refused', cdp.ev("renderStorageStatus(), document.getElementById('storageStatus').textContent") == 'goals refused by the server (kept on this device)',
          cdp.ev("document.getElementById('storageStatus').textContent"))
    # What the server refused was never stored, so taking the entry out again here is no deletion of anything it has: another
    # device may since have added one of that name, and that stays.
    api('PATCH', '/api/state', {'goals': {'value': {'broken': {'name': 'S11 Other', 'target': 80, 'unit': 'lbs'}}}}, token)
    cdp.ev("saveLocalState('goals', {})")
    check("taking the refused entry out here leaves another device's of the same name",
          cdp.wait("!readLocalState('goals').dirty") and 'broken' in server_state()['goals'], server_state()['goals'])
    cdp.ev("saveLocalState('goals', { fixed: { name: 'S11 Lift', target: 100, unit: 'lbs' } })")
    check('a change to it afterwards is tried afresh, and arrives', wait_for(lambda: 'fixed' in server_state()['goals']), server_state()['goals'])
    check('and clears it, and what the status line said', cdp.wait("!readLocalState('goals').dirty && !readLocalState('goals').rejected && (renderStorageStatus(), document.getElementById('storageStatus').textContent === '')"),
          cdp.ev("JSON.stringify(readLocalState('goals'))"))
    # One set aside by an earlier visit is tried again when a page opens, in case the server has since been changed to take it.
    cdp.ev("writeLocal(localKey('goals'), { value: { again: { name: 'S11 Again', target: 50, unit: 'kg' } }, dirty: true, rejected: true, base: readLocalState('goals').value, stamp: 'set-aside' })")
    loaded()
    check('a page opening tries it again', wait_for(lambda: 'again' in server_state()['goals']), server_state()['goals'])
    api('PATCH', '/api/state', {'goals': {'value': goals_before}, 'exerciseNotes': {'value': notes_before}}, token)
    loaded()

    # ------------------------------------------------------------------ S12 two tabs, one workout
    print('S12 a workout finished in one tab is not brought back by another tab that still shows it')
    cdp.block_api = False
    cdp.block_paths = []
    cdp.answer = True
    loaded()
    opened = []

    def second_tab():
        """Another tab of this browser: the same profile, so the same cookie, origin and localStorage. Driven as t.cdp is."""
        with urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:{t.browser.port}/json/new', method='PUT'), timeout=10) as reply:
            target = json.load(reply)
        tab = CDP(target['webSocketDebuggerUrl'], t.base_url)
        opened.append((target['id'], tab))
        for domain in ('Page', 'Runtime'):
            tab.send(f'{domain}.enable')
        tab.send('Emulation.setEmulatedMedia', features=LIGHT_DEVICE)
        tab.goto('/index.html')
        tab.wait('initialLoadDone === true', timeout=20)
        tab.pause(0.4)
        return tab

    def probe(tab, expression, default=None):
        """Evaluated in a tab, where a function this build does not have is an answer of its own (the default)."""
        try:
            return tab.ev(expression)
        except RuntimeError:
            return default

    def saved_named(name):
        return [w for w in api('GET', '/api/workouts', token=token)[0]['workouts'] if w['name'] == name]

    cdp.ev("startWorkout({ name: 'Tab Finish', notes: '', exercises: [{ name: 'Bench Press', weight: '', reps: '8' }, { name: 'Overhead Press', weight: '', reps: '8' }] })")
    cdp.ev("document.getElementById('completedReps').value = '8'; document.getElementById('completeSetBtn').click()")
    check('a set logged here is kept on the server', wait_for(lambda: t.server_sets() == 1), t.active_session())
    other = second_tab()
    check('another tab of this browser shows the same workout', other.ev("!document.getElementById('activeWorkout').hidden") is True)
    cdp.ev("document.getElementById('finishEarlyBtn').click()")
    check('finishing it here saves it, with the set logged here',
          wait_for(lambda: len(saved_named('Tab Finish')) == 1) and sum(len(e['sets']) for e in saved_named('Tab Finish')[0]['exercises']) == 1, saved_named('Tab Finish'))
    finished = saved_named('Tab Finish')[0]['clientId']
    check('the other tab stops showing it, because it is saved',
          other.wait("document.getElementById('activeWorkout').hidden === true", timeout=8), other.ev("document.getElementById('activeWorkout').hidden"))
    check('and the server keeps no workout in progress', t.active_session() is None, t.active_session())
    # A tab that did not hear of the finish (frozen, say) and logs a set now: its copy of the workout is refused, not stored again.
    stale = {'name': 'Tab Finish', 'notes': '', 'currentIndex': 0, 'clientId': finished, 'unit': 'lbs',
             'exercises': [{'name': 'Bench Press', 'weight': 100, 'reps': 8, 'sets': [{'weight': 100, 'reps': 8}, {'weight': 100, 'reps': 6}]}]}
    other.ev(f"saveLocalActive({json.dumps(stale)})")
    other.pause(1.5)
    check('a workout already saved is not stored as in progress again, so it cannot come back on another tab', t.active_session() is None, t.active_session())
    check('nor is it kept on the device as in progress',
          probe(other, "(readLocal(localKey('active')) || {}).session ?? null") is None, probe(other, "readLocal(localKey('active'))"))
    # Finishing it again (the stale tab's sets too) is answered as already saved, so the page can say that rather than "saved".
    again = {'name': 'Tab Finish', 'notes': '', 'createdAt': int(time.time() * 1000), 'clientId': finished, 'unit': 'lbs',
             'exercises': stale['exercises']}
    other.ev(f"queuePendingWorkout({json.dumps(again)})")
    check('a finished workout the server already has is answered as saved already',
          probe(other, f"flushPendingWorkouts().then(() => workoutWasAlreadySaved({json.dumps(finished)}))", False) is True)
    check('and the server still has the one workout, with the one set it had', len(saved_named('Tab Finish')) == 1
          and sum(len(e['sets']) for e in saved_named('Tab Finish')[0]['exercises']) == 1, saved_named('Tab Finish'))
    loaded()
    cdp.pause(1)
    check('the first tab, reloaded, shows no workout in progress', cdp.ev("document.getElementById('activeWorkout').hidden") is True,
          cdp.ev("document.getElementById('activeWorkout').hidden"))
    for target_id, tab in opened:
        tab.close()
        urllib.request.urlopen(f'http://127.0.0.1:{t.browser.port}/json/close/{target_id}', timeout=10).close()

    # ------------------------------------------------------------------ S13 History: waiting to sync, and the server out of reach
    print('S13 History lists a workout finished offline as waiting to sync, and says when the server cannot be reached')
    loaded()
    waiting = {'name': 'Offline Finish', 'notes': '', 'createdAt': int(time.time() * 1000), 'clientId': 'offline-finish-1', 'unit': 'lbs',
               'exercises': [{'name': 'Row', 'weight': 60, 'reps': 8, 'sets': [{'weight': 60, 'reps': 8}]}]}
    cdp.ev(f"queuePendingWorkout({json.dumps(waiting)})")
    cdp.block_api = True
    cdp.goto('/history.html')
    cdp.wait("document.querySelectorAll('#historyList .history-workout').length > 0", timeout=12)
    cdp.pause(0.4)
    queued_row = "[...document.querySelectorAll('#historyList .history-workout')].find(row => row.dataset.key === 'queued:offline-finish-1')"
    check('History lists the workout finished offline, with a badge saying it is waiting to sync',
          cdp.ev(f"!!{queued_row} && {queued_row}.querySelector('.badge').textContent === 'Waiting to sync'") is True, cdp.ev(f"!!{queued_row}"))
    check('and its summary says how many are waiting', 'waiting to sync' in cdp.ev("document.getElementById('historySummary').textContent"),
          cdp.ev("document.getElementById('historySummary').textContent"))
    check('it opens to its sets, though it has no menu (edit and delete need the server)',
          cdp.ev(f"{queued_row}.querySelector('.row-menu') === null && (({queued_row}).querySelector('[data-action=view]').click(), !{queued_row}.querySelector('.workout-details').hidden)") is True)
    notice = cdp.ev("document.getElementById('historyFeedback').hidden === false ? document.getElementById('historyFeedback').textContent : ''")
    check('History says the server cannot be reached, with the curly apostrophe, and that these are what the device last loaded',
          notice == 'Can’t reach the server. These are your workouts as this device last loaded them.', notice)
    cdp.block_api = False
    cdp.ev("syncNow()")
    check('once the server is back the workout uploads, and History shows it as saved, not waiting',
          cdp.wait("[...document.querySelectorAll('#historyList .history-workout')].some(row => row.dataset.key.startsWith('id:') && row.textContent.includes('Offline Finish') && !row.querySelector('.badge'))", timeout=12)
          and 'Offline Finish' in [w['name'] for w in api('GET', '/api/workouts', token=token)[0]['workouts']])
    check('and the notice goes', cdp.wait("document.getElementById('historyFeedback').hidden === true", timeout=8), cdp.ev("document.getElementById('historyFeedback').textContent"))

    # ------------------------------------------------------------------ S14 the sign-in expired, in the middle of a workout
    print('S14 a workout in progress whose sign-in expired says so, and points to the sign-in banner')
    loaded()
    cdp.ev("startWorkout({ name: 'Expired Sign-in', notes: '', exercises: [{ name: 'Row', weight: '', reps: '8' }, { name: 'Curl', weight: '', reps: '8' }] })")
    default_notice = cdp.ev("document.getElementById('activeSyncNotice').textContent")
    cdp.send('Network.deleteCookies', name='session', domain='127.0.0.1')
    cdp.ev("document.getElementById('completedReps').value = '8'; document.getElementById('completeSetBtn').click()")
    check('the notice says the sign-in has expired, and the banner at the top offers to sign in again',
          cdp.wait("document.getElementById('activeSyncNotice').textContent.includes('sign-in has expired')", timeout=10)
          and cdp.ev("!!document.getElementById('sessionExpired')") is True, cdp.ev("document.getElementById('activeSyncNotice').textContent"))
    check('and not that the server cannot be reached', 'reach the server' not in cdp.ev("document.getElementById('activeSyncNotice').textContent"))
    t.set_cookie(token)
    cdp.ev("syncNow()")
    check('once signed in again, the notice goes back to what it said, and the workout is saved',
          cdp.wait(f"document.getElementById('activeSyncNotice').textContent === {json.dumps(default_notice)}", timeout=10) and t.server_sets() == 1,
          cdp.ev("document.getElementById('activeSyncNotice').textContent"))
    cdp.ev("closeActiveWorkout()")
