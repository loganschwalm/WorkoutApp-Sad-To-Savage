"""Sad to Savage, the program the app is built around: the start panel and the choice of level, a day's plan on the card and as a
workout (the warm-up and supersets done as rounds, the level's weight range, "each side", a Pilates day as one timed session),
finishing a day, the daily walk (kept by calendar day, and on the server), skipping with Undo, finishing all thirty days (the
summary says so, and the card offers to start again with the level and the walks kept), and a reload."""

import json

INTERCEPT = False

# Collects every CSP violation on each page from the moment it starts loading.
RECORD_VIOLATIONS = """window.__csp = [];
document.addEventListener('securitypolicyviolation', e => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));"""


def run(t):
    cdp, check, api, token = t.cdp, t.check, t.api, t.token
    cdp.answer = True
    cdp.send('Page.addScriptToEvaluateOnNewDocument', source=RECORD_VIOLATIONS)

    def click(selector):
        cdp.ev(f"document.querySelector({json.dumps(selector)}).click()")
        cdp.pause(0.25)

    def program():
        return cdp.ev('currentProgram')

    def server_program():
        return api('GET', '/api/state', token=token)[0].get('program')

    def lines():
        return cdp.ev("[...document.querySelectorAll('#programNext li')].map(li => li.textContent)") or []

    def set_level(value):
        cdp.ev(f"(() => {{ const e = document.getElementById('programLevel'); e.value = '{value}'; e.dispatchEvent(new Event('change', {{ bubbles: true }})); }})()")

    def start_program(level='nts'):
        click('#programNext [data-program-action=setup]')
        set_level(level)
        click('#programSubmit')
        cdp.pause(0.4)

    def session():
        return cdp.ev("activeSession.exercises.map(e => ({ name: e.name, group: e.group || null, timed: e.timed === true, rest: e.rest, note: e.note || '', plan: e.plan.length }))") or []

    def target():
        return cdp.ev("document.getElementById('activeExerciseTarget').textContent") or ''

    def play_workout():
        """Logs every planned set at its planned reps and moves on, until the workout is finished."""
        for _ in range(160):
            if cdp.ev("document.getElementById('activeWorkout').hidden"):
                break
            cdp.ev("""(() => {
              const e = activeSession.exercises[activeSession.currentIndex];
              const done = plannedDone(e);
              if (done < e.plan.length) {
                document.getElementById('completedReps').value = String(e.plan[done].reps);
                document.getElementById('completeSetBtn').click();
              } else document.getElementById('nextExerciseBtn').click();
            })()""")
            cdp.pause(0.12)
        cdp.pause(0.6)

    def skip_to(count):
        """Skips days (from the card) until `count` of them are done or skipped."""
        for _ in range(count):
            click('#programNext [data-program-action=skip]')

    # ------------------------------------------------------------------ S1 the start panel
    print('S1  before there is a program')
    t.open_tracker()
    check('the card says what the program is, with nothing started yet', cdp.ev("document.getElementById('programTitle').textContent") == 'Your program')
    check('it offers to start the program', cdp.ev("!!document.querySelector('#programNext [data-program-action=setup]')") is True)
    check('and shows the six weeks, a day to a line, with no Start button before there is a program',
          cdp.ev("document.querySelectorAll('#programWeeks .program-week').length") == 6
          and cdp.ev("document.querySelectorAll('#programWeeks .program-day').length") == 30
          and cdp.ev("document.querySelectorAll('#programWeeks [data-program-action=start]').length") == 0)
    check('the walk panel waits for a program', cdp.ev("document.getElementById('programWalk').hidden") is True)

    # ------------------------------------------------------------------ S2 starting it, and the level
    print('S2  starting it')
    click('#programNext [data-program-action=setup]')
    check('the dialog asks for a level and nothing else', cdp.ev("document.getElementById('programModal').hidden") is False
          and cdp.ev("[...document.querySelectorAll('#programOptions select')].map(s => s.id)") == ['programLevel']
          and cdp.ev("document.querySelectorAll('#programMaxInputs input').length") == 0)
    check('New to strength is the first choice', cdp.ev("document.getElementById('programLevel').value") == 'nts')
    set_level('sw')
    check('each level says what it is', 'Shelby' in (cdp.ev("document.getElementById('programLevelHelp').textContent") or ''))
    set_level('nts')
    click('#programSubmit')
    cdp.pause(0.4)
    check('the program is kept with its level', program()['definition'] == 'sad-to-savage' and program()['options'] == {'level': 'nts'}, program())
    check('it keeps its level, its days and its walks, and no weights of its own', sorted(program()) == ['cycle', 'definition', 'done', 'options', 'startedAt', 'walks'], sorted(program()))
    check('the card says what is next: week 1, day 1', cdp.ev("document.querySelector('#programNext strong').textContent") == 'Upper Body Focus'
          and 'week 1, day 1' in cdp.ev("document.querySelector('#programNext .program-kicker').textContent"))
    check('the summary counts the thirty days', '0 of 30 days done' in cdp.ev("document.getElementById('programSummary').textContent"), cdp.ev("document.getElementById('programSummary').textContent"))
    plan = lines()
    check('the day is listed as the plan gives it: a warm-up, four supersets, the cool-down and what to have to hand', len(plan) == 7
          and plan[0].startswith('Upper Body Warm-up · 3 rounds Elevated Shoulder Taps (15 reps each side)')
          and plan[1].startswith('Superset 1 · 3 rounds DB Bench Chest Press (12 reps)') and cdp.ev("document.querySelector('#programNext li b').textContent") == 'Upper Body Warm-up · 3 rounds'
          and plan[4].startswith('Superset 4')
          and plan[5].startswith('Then 3-5 minutes of stretching')
          and plan[6] == 'You need: 2 DBs, Long Resistance Band, Bench, Cable Machine, Mat', plan)
    check('the weeks list has the first week open, with its quote', cdp.ev("document.querySelectorAll('#programWeeks .program-week')[0].open") is True
          and 'Small steps create big change.' in cdp.ev("document.querySelectorAll('#programWeeks .program-week')[0].textContent"))
    check('the next day has Start and Skip', cdp.ev("document.querySelectorAll('#programNext [data-program-action=start], #programNext [data-program-action=skip]').length") == 2)
    check('the walk panel shows the day\'s goal and fields for steps and distance', cdp.ev("document.getElementById('programWalk').hidden") is False
          and 'showing up' in cdp.ev("document.getElementById('programWalk').textContent")
          and cdp.ev("!!document.getElementById('walkSteps') && !!document.getElementById('walkDistance')") is True)

    # ------------------------------------------------------------------ S3 the day as a workout
    print('S3  the day as a workout')
    click('#programNext [data-program-action=start]')
    cdp.pause(0.6)
    day = session()
    check('the workout is named for its day', cdp.ev("activeSession.name") == 'W1D1 Upper Body Focus')
    check('twelve exercises: three warm-up moves, eight in four supersets, and the cool-down', len(day) == 12, [e['name'] for e in day])
    check('the warm-up is one circuit, each superset its own', [e['group'] for e in day] == ['warmup'] * 3 + ['block1'] * 2 + ['block2'] * 2 + ['block3'] * 2 + ['block4'] * 2 + [None])
    check('every move is three rounds, the cool-down one timed session', [e['plan'] for e in day] == [3] * 11 + [1] and day[-1]['timed'] is True)
    check('a move says the level\'s range', day[3]['note'] == 'New to strength: 7.5-10lb DBs' and day[4]['note'] == 'New to strength: light band', day[3])
    check('a warm-up move has no range', day[0]['note'] == '')
    check('the weight starts at the bottom of the level’s range: 7.5 lbs for the dumbbell press, nothing for a band or a warm-up',
          cdp.ev("[3, 4, 0].map(index => activeSession.exercises[index].plan[0].start ?? null)") == [7.5, None, None])
    cdp.ev('goToExercise(3)')
    check('and the weight field is filled in with it', t.field('activeWeight') == '7.5', t.field('activeWeight'))
    cdp.ev('goToExercise(0)')
    check('a number is read from a range, a single weight, a barbell’s total and a pound or kilogram unit, and not from a band or body weight',
          cdp.ev("""(() => { const real = weightUnit; const lbs = ['7.5-10lb DBs', '10lbs', '35-45lbs (total)', 'light band', 'body weight', 'from bench'].map(sadToSavageStartWeight);
            weightUnit = () => 'kg'; const kg = sadToSavageStartWeight('7.5-10lb DBs'); weightUnit = real; return [lbs, kg]; })()""") == [[7.5, 10, 35, '', '', ''], 3.5])
    check('last time’s weight is used instead once there is one',
          cdp.ev("nextSetDefaults({ sets: [], plan: [{ weight: '', reps: 12, start: 7.5 }] }, { sets: [{ weight: 10, reps: 12 }], converted: false }, false).weight") == 10)
    check('the first set is a warm-up, 15 reps each side', target() == 'Set 1 of 3, warm-up: 15 reps each side.', target())
    check('the circuit is done as rounds: a set of each, then the next', 'Superset with Single DB Curl + Press and Band Pull Apart' in cdp.ev("document.getElementById('supersetLine').textContent"))
    for _ in range(3):
        cdp.ev("document.getElementById('completedReps').value = '15'; document.getElementById('completeSetBtn').click();")
        cdp.pause(0.5)
    check('after one of each the circuit starts again from its first move', cdp.ev("activeSession.exercises[activeSession.currentIndex].name") == 'Elevated Shoulder Taps'
          and target().startswith('Set 2 of 3'), target())
    check('a warm-up set is logged as a warm-up, which records and volume leave out', cdp.ev("activeSession.exercises[0].sets[0].type") == 'warmup')
    check('there are no CSP violations', (cdp.ev('window.__csp') or []) == [], cdp.ev('window.__csp'))

    # ------------------------------------------------------------------ S4 finishing a day
    print('S4  finishing a day')
    play_workout()
    check('the workout is over and its summary shows', cdp.ev("document.getElementById('activeWorkout').hidden") is True and cdp.ev("document.getElementById('workoutSummary').hidden") is False)
    check('day 1 is marked done', list(program()['done']) == ['0-0'] and program()['done']['0-0']['skipped'] is False, program()['done'])
    check('a program with no lifts has nothing to say about a main lift or a + set', cdp.ev("document.getElementById('summaryProgram').hidden") is True)
    click('#summaryDone')
    check('the next day is Pilates: its message, the cool-down and what to have', cdp.ev("document.querySelector('#programNext strong').textContent") == 'Full Body Focus'
          and lines()[0].startswith('Today we are going to do a 25 minute full body mat pilates workout')
          and lines()[2] == 'You need: Mat, Hand Weights, Ankle Weights', lines())
    check('the summary moved to 1 of 30', '1 of 30 days done' in cdp.ev("document.getElementById('programSummary').textContent"))
    check('the saved workout says where it came from', t.safe_ev("savedWorkouts.concat(readPendingWorkouts()).filter(w => w.name === 'W1D1 Upper Body Focus').map(w => w.program.label)") == ['Week 1 of 6'])

    # ------------------------------------------------------------------ S5 the daily walk
    print('S5  the daily walk')
    cdp.ev("document.getElementById('walkSteps').value = '8200'; document.getElementById('walkDistance').value = '3.9'")
    click('#programWalk [data-walk-action=save]')
    today = cdp.ev("calendarDayKey(new Date())")
    check('the walk is kept under today, with the unit', program()['walks'].get(today, {}).get('steps') == 8200 and program()['walks'][today]['distance'] == 3.9 and program()['walks'][today]['unit'] == 'mi', program()['walks'])
    check('the panel says what was walked, and offers to change it', '8,200 steps · 3.9 mi' in cdp.ev("document.getElementById('programWalk').textContent")
          and cdp.ev("!!document.querySelector('#programWalk [data-walk-action=edit]')") is True)
    check('the finished day shows the walk of the day it was done', '3.9 mi' in cdp.ev("document.querySelector('#programWeeks .program-day.done').textContent"))
    check('the walk reaches the server', t.wait_for(lambda: (server_program() or {}).get('walks', {}).get(today, {}).get('steps') == 8200), server_program())
    click('#programWalk [data-walk-action=edit]')
    check('Change shows the fields again with what was logged', cdp.ev("document.getElementById('walkSteps').value") == '8200')
    cdp.ev("document.getElementById('walkSteps').value = ''; document.getElementById('walkDistance').value = ''")
    click('#programWalk [data-walk-action=save]')
    check('a walk with neither number is showing up', 'Showed up' in cdp.ev("document.getElementById('programWalk').textContent")
          and program()['walks'][today]['steps'] == 0 and program()['walks'][today]['distance'] == 0)
    cdp.ev("document.querySelector('#programWalk [data-walk-action=edit]').click()")
    cdp.ev("document.getElementById('walkSteps').value = '999999'")
    click('#programWalk [data-walk-action=save]')
    check('a walk of a million steps is refused, and the one logged stays', program()['walks'][today]['steps'] == 0 and cdp.ev("document.getElementById('walkSteps').classList.contains('invalid') || document.getElementById('walkSteps').getAttribute('aria-invalid') === 'true'") is True)

    # ------------------------------------------------------------------ S6 a Pilates day
    print('S6  a Pilates day')
    cdp.goto('/index.html')
    cdp.wait("document.getElementById('programNext').textContent.includes('Full Body Focus')")
    cdp.wait('initialLoadDone === true')
    click('#programNext [data-program-action=start]')
    cdp.pause(0.5)
    pilates = session()
    check('the session is the mat workout and the cool-down, both timed', [e['name'] for e in pilates] == ['Mat Pilates: Full Body Focus', 'Cool-down'] and all(e['timed'] for e in pilates), pilates)
    check('it is said in minutes, as long as Shelby\'s video', target().startswith('Set 1 of 1: 25 minutes.'), target())
    check('the timer starts at 25:00', cdp.ev("document.getElementById('holdTimer').hidden") is False and cdp.ev("document.getElementById('holdDisplay').textContent") == '25:00')
    check('the message is not given a second full stop', '..' not in target(), target())
    click('#endWorkoutBtn')
    cdp.pause(0.3)

    # ------------------------------------------------------------------ S7 skipping, and Undo
    print('S7  skipping')
    before = len(program()['done'])
    click('#programNext [data-program-action=skip]')
    check('a skipped day counts as done and the program moves on', program()['done']['0-1']['skipped'] is True and len(program()['done']) == before + 1)
    check('the banner offers Undo', cdp.ev("!!document.querySelector('#formFeedback button')") is True)
    click('#formFeedback button')
    check('Undo puts the day back', '0-1' not in program()['done'] and cdp.ev("document.querySelector('#programNext strong').textContent") == 'Full Body Focus')

    # ------------------------------------------------------------------ S8 the level changes what the days say
    print('S8  changing the level')
    click('#editProgramBtn')
    check('the dialog is for editing, with the level chosen', cdp.ev("document.getElementById('programModalTitle').textContent") == 'Edit Sad to Savage' and cdp.ev("document.getElementById('programLevel').value") == 'nts')
    set_level('sw')
    click('#programSubmit')
    cdp.pause(0.4)
    check('the level is saved and the days kept', program()['options'] == {'level': 'sw'} and list(program()['done']) == ['0-0'], program())
    skip_to(1)  # day 2 (Pilates) is skipped; day 3 is lower body
    click('#programNext [data-program-action=start]')
    cdp.pause(0.5)
    check('the next workout shows Shelby\'s range', session()[3]['note'] == "Shelby's weights: 25-35lb DB", session()[3])
    click('#endWorkoutBtn')
    cdp.pause(0.3)

    # ------------------------------------------------------------------ S9 all thirty days
    print('S9  finishing the program')
    left = 29 - len(program()['done'])
    skip_to(left)
    check('every day but the last is done', len(program()['done']) == 29 and cdp.ev("document.querySelector('#programNext strong').textContent") == 'Full Body Focus'
          and 'week 6, day 5' in cdp.ev("document.querySelector('#programNext .program-kicker').textContent"))
    check('the last day is W6D5', cdp.ev("programWorkout(currentProgram, 5, 4).name") == 'W6D5 Full Body Focus')
    click('#programNext [data-program-action=start]')
    cdp.pause(0.5)
    play_workout()
    check('the summary says the program is finished', cdp.ev("document.getElementById('summaryProgramList').textContent") == 'You finished Sad to Savage: all thirty days done.', cdp.ev("document.getElementById('summaryProgramList').textContent"))
    click('#summaryDone')
    check('the program is marked finished, once', bool(program().get('finishedAt')) and len(program()['done']) == 30)
    check('the card says so, with the totals and a way to start again', 'You finished Sad to Savage' in cdp.ev("document.querySelector('#programNext strong').textContent")
          and cdp.ev("!!document.querySelector('#programNext [data-program-action=restart]')") is True
          and '1 walk logged' in cdp.ev("document.getElementById('programNext').textContent"), cdp.ev("document.getElementById('programNext').textContent"))
    check('there is nothing left to skip', cdp.ev("!document.querySelector('#programNext [data-program-action=skip]')") is True)
    check('the server has the finished program', t.wait_for(lambda: bool((server_program() or {}).get('finishedAt'))))

    # ------------------------------------------------------------------ S10 a reload, and starting again
    print('S10 a reload, and starting again')
    cdp.goto('/index.html')
    cdp.wait("document.getElementById('programNext').textContent.includes('You finished')")
    check('a reload keeps it finished', bool(program().get('finishedAt')))
    click('#programNext [data-program-action=restart]')
    check('starting again is a new run from week 1', program()['cycle'] == 2 and program()['done'] == {} and not program().get('finishedAt'), program())
    check('the level and the walks are kept', program()['options'] == {'level': 'sw'} and today in program()['walks'])
    check('week 1, day 1 is next again', 'week 1, day 1' in cdp.ev("document.querySelector('#programNext .program-kicker').textContent"))
    check('the server has the new run', t.wait_for(lambda: (server_program() or {}).get('cycle') == 2 and (server_program() or {}).get('done') == {}), server_program())

    # ------------------------------------------------------------------ S11 start over
    print('S11 starting over')
    click('#endProgramBtn')
    check('Start over goes back to the start panel', program() is None and cdp.ev("!!document.querySelector('#programNext [data-program-action=setup]')") is True)
    check('and the program is gone from the server', t.wait_for(lambda: server_program() is None))
    check('the workouts finished stay in History', len(t.workouts()) >= 4 and any(w['name'] == 'W1D1 Upper Body Focus' for w in t.workouts()))
    check('there were no CSP violations on any page', (cdp.ev('window.__csp') or []) == [], cdp.ev('window.__csp'))
