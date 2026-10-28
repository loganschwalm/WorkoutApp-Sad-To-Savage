"""Help while training: notes kept with an exercise, going heavier when every set reached its target, warm-up sets for
barbell lifts, how many reps each set had left, the past sessions of an exercise (in a workout and on Progress), and
supersets made mid-workout."""

import json

from ..harness import ACTIVE, HIDDEN

INTERCEPT = True


def run(t):
    cdp, check, api, token, wait_for = t.cdp, t.check, t.api, t.token, t.wait_for
    open_tracker, seed, ex = t.open_tracker, t.seed, t.ex

    text, visible = t.text, t.visible

    def set_field(idn, value):
        cdp.ev(f"(() => {{ const e = document.getElementById('{idn}'); e.value = {json.dumps(str(value))}; e.dispatchEvent(new Event('input', {{ bubbles: true }})); }})()")

    def click(idn):
        cdp.ev(f"document.getElementById('{idn}').click()")
        cdp.pause(0.2)

    def log(weight, reps):
        cdp.ev(f"document.getElementById('activeWeight').value = '{weight}'; document.getElementById('completedReps').value = '{reps}'; document.getElementById('completeSetBtn').click();")
        cdp.pause(0.2)

    def start_saved(workout_id):
        open_tracker()
        t.start_saved(workout_id)
        cdp.wait(ACTIVE)
        cdp.pause(0.5)

    def end():
        t.end_workout()

    def finish():
        for _ in range(10):
            if cdp.ev(HIDDEN):
                break
            click('nextExerciseBtn')
        cdp.pause(0.6)

    def current():
        return text('activeExerciseName')

    def settings(**checks):
        cdp.ev("document.getElementById('settingsButton').click()")
        for element, value in checks.items():
            cdp.ev(f"document.getElementById('{element}').checked = {str(value).lower()}")
        cdp.ev("document.getElementById('settingsForm').requestSubmit()")
        cdp.pause(0.3)

    lift_day = seed('Lift Day', 5, [ex('Bench Press', 100, 8, [(8, 100), (8, 100), (8, 100)]), ex('Barbell Row', 80, 8, [(8, 80), (8, 80)]),
                                    ex('Curl', 30, 10, [(10, 30)])])
    heavy_day = seed('Heavy Day', 6, [ex('Back Squat', 200, 5, [(5, 200), (5, 200), (5, 200)])])
    fade_day = seed('Fade Day', 7, [ex('Deadlift', 300, 5, [(5, 300), (5, 300), (3, 300)])])
    t.api('POST', '/api/workouts', {'name': 'Grind Day', 'notes': '', 'createdAt': t.t0 + 8 * 86400000,
                                    'exercises': [{'name': 'Pendlay Row', 'weight': 150, 'reps': 8,
                                                   'sets': [{'weight': 150, 'reps': 8, 'rir': 1}, {'weight': 150, 'reps': 8, 'rir': 0}]}]}, token)
    grind_day = [w for w in t.workouts() if w['name'] == 'Grind Day'][0]['id']
    # Dumbbell and cable moves only, and a machine: Bench Press and the others above keep their history, which the checks above read.
    step_day = seed('Step Day', 9, [ex('Dumbbell Row', 10, 8, [(8, 10), (8, 10)]), ex('Cable Row', 40, 8, [(8, 40), (8, 40)]),
                                    ex('Leg Extension', 60, 10, [(10, 60), (10, 60)])])

    # ------------------------------------------------------------------ N notes kept with an exercise
    print('N   a note kept with an exercise shows whenever it comes up')
    start_saved(lift_day)
    check('no note yet, and a button to add one', not visible('exerciseNote') and text('noteToggle') == 'Add note')
    click('noteToggle')
    check('which opens a place to write it', visible('notePanel') and cdp.ev('document.activeElement.id') == 'noteText')
    set_field('noteText', 'Grip on the rings\nFeet flat')
    click('noteSave')
    check('the note shows under the exercise', visible('exerciseNote') and text('exerciseNote') == 'Grip on the rings\nFeet flat' and not visible('notePanel'), text('exerciseNote'))
    check('and the button offers to edit it', text('noteToggle') == 'Edit note')
    check('it reaches the account', wait_for(lambda: api('GET', '/api/state', token=token)[0].get('exerciseNotes') == {'bench press': 'Grip on the rings\nFeet flat'}),
          api('GET', '/api/state', token=token)[0].get('exerciseNotes'))
    click('nextExerciseBtn')
    check('another exercise does not show it', current() == 'Barbell Row' and not visible('exerciseNote'))
    end()
    open_tracker()
    t.start(0)  # Push Day: Bench Press first
    cdp.pause(0.4)
    check('another workout with the same exercise shows it too', current() == 'Bench Press' and text('exerciseNote') == 'Grip on the rings\nFeet flat')
    cdp.send('Page.reload')
    cdp.wait(ACTIVE)
    cdp.pause(0.6)
    check('and so does the page after a reload', text('exerciseNote') == 'Grip on the rings\nFeet flat')
    click('noteToggle')
    check('editing starts from the note as it is', cdp.ev("document.getElementById('noteText').value") == 'Grip on the rings\nFeet flat')
    set_field('noteText', '   ')
    click('noteSave')
    check('saving it empty removes it', not visible('exerciseNote') and text('noteToggle') == 'Add note'
          and wait_for(lambda: api('GET', '/api/state', token=token)[0].get('exerciseNotes') == {}))
    click('noteToggle')
    set_field('noteText', 'Grip on the rings')
    click('noteSave')
    end()

    # ------------------------------------------------------------------ H going heavier
    print('H   going heavier once every set reached its target')
    start_saved(heavy_day)
    check('every set at 200 × 5 last time: go heavier', visible('progressionHint')
          and text('progressionText') == 'Last time every set at 200 lbs reached 5 reps: time to go heavier.' and text('progressionUse') == 'Use 205 lbs',
          f"{visible('progressionHint')} {text('progressionText')} {text('progressionUse')}")
    click('progressionUse')
    check('one tap fills in the heavier weight', cdp.ev("document.getElementById('activeWeight').value") == '205')
    log(205, 5)
    check('and once a set is logged the hint has done its job', not visible('progressionHint'))
    end()
    start_saved(fade_day)
    check('a set that fell short (5, 5, 3) means staying at the weight', not visible('progressionHint'))
    end()
    start_saved(grind_day)
    check('so does a set with no reps left, even at the target', not visible('progressionHint'))
    end()

    # ------------------------------------------------------------------ W warm-up sets
    print('W   warm-up sets for a barbell lift')
    start_saved(heavy_day)
    check('the ramp to 200 lbs: the bar, then about 40%, 60% and 80%', visible('warmupHint')
          and text('warmupHint') == 'Warm up first: 45 × 10, 80 × 5, 120 × 3, 160 × 2 (lbs)', text('warmupHint'))
    click('progressionUse')
    check('it follows the weight to lift', text('warmupHint') == 'Warm up first: 45 × 10, 80 × 5, 125 × 3, 165 × 2 (lbs)', text('warmupHint'))
    log(205, 5)
    check('and goes once the first working set is done', not visible('warmupHint'))
    end()
    start_saved(lift_day)
    jump = "if (document.getElementById('exerciseJump').hidden) document.getElementById('activeWorkoutProgress').click(); document.querySelector('#exerciseJump [data-jump=\"2\"]').click()"
    cdp.ev(jump)
    cdp.pause(0.2)
    check('not for a lift without a barbell', current() == 'Curl' and not visible('warmupHint'))
    end()
    settings(warmupSetting=False)
    start_saved(heavy_day)
    check('and not at all with warm-ups turned off in Settings', not visible('warmupHint'))
    end()
    settings(warmupSetting=True)

    # ------------------------------------------------------------------ E effort
    print('E   how many reps each set had left')
    start_saved(lift_day)
    check('asked, but optional: nothing chosen yet', visible('effortChoices')
          and cdp.ev("[...document.querySelectorAll('#effortChoices [aria-pressed=true]')].length") == 0)
    cdp.ev("document.querySelector('#effortChoices [data-effort=\"2\"]').click()")
    check('tapping one chooses it', cdp.ev("document.querySelector('#effortChoices [data-effort=\"2\"]').getAttribute('aria-pressed')") == 'true')
    log(100, 8)
    check('the set keeps it, and says so', cdp.ev('activeSession.exercises[0].sets[0].rir') == 2
          and cdp.ev("document.querySelector('#completedSets .set-effort').textContent") == '2 left', cdp.ev('activeSession.exercises[0].sets[0]'))
    check('the next set starts with nothing chosen', cdp.ev("[...document.querySelectorAll('#effortChoices [aria-pressed=true]')].length") == 0)
    cdp.ev("document.querySelector('#effortChoices [data-effort=\"4\"]').click(); document.querySelector('#effortChoices [data-effort=\"4\"]').click()")
    check('tapping the chosen one again takes it back', cdp.ev("[...document.querySelectorAll('#effortChoices [aria-pressed=true]')].length") == 0)
    cdp.ev("document.querySelector('#effortChoices [data-effort=\"0\"]').click()")
    log(100, 8)
    log(100, 7)
    check('each set has its own, or none', cdp.ev('activeSession.exercises[0].sets.map(s => s.rir ?? null)') == [2, 0, None])
    known = {w['id'] for w in t.workouts()}
    finish()
    saved = [w for w in t.workouts() if w['id'] not in known]
    check('the saved workout keeps them', saved and [s.get('rir') for s in saved[0]['exercises'][0]['sets']] == [2, 0, None],
          saved[0]['exercises'][0]['sets'] if saved else 'none')
    settings(effortSetting=False)
    start_saved(lift_day)
    check('turned off in Settings, it is not asked', not visible('effortChoices'))
    log(100, 8)
    check('and nothing is recorded', cdp.ev("'rir' in activeSession.exercises[0].sets[0]") is False)
    end()
    settings(effortSetting=True)

    # ------------------------------------------------------------------ P past sessions
    print('P   the past sessions of an exercise')
    start_saved(lift_day)
    sessions = cdp.ev("[...document.querySelectorAll('#pastSessionList li')].map(li => [...li.querySelectorAll('span')].map(s => s.textContent))") or []
    check('in a workout, the last few times it was done, newest first', visible('pastSessions') and 1 < len(sessions) <= 5
          and sessions[0][1] == '100 lbs × 8, 8, 7 · reps left 2, 0' and 'Lift Day' in sessions[0][0], sessions)
    check('with older workouts too', any(line[1] == '105 lbs × 8' and 'Seed Push' in line[0] for line in sessions), sessions)
    link = cdp.ev("document.getElementById('exerciseHistoryLink').getAttribute('href')")
    check('and a link to every session', link == 'progress.html?exercise=bench%20press', link)
    end()
    cdp.goto('/' + link)
    cdp.wait("!document.getElementById('sessionsCard').hidden && document.querySelectorAll('#sessionList li.session').length > 0")
    cdp.pause(0.3)
    all_sessions = cdp.ev("[...document.querySelectorAll('#sessionList li.session')].map(li => li.textContent)") or []
    bench_workouts = [w for w in t.workouts() if any(e['name'] == 'Bench Press' and e.get('sets') for e in w['exercises'])]
    check('Progress opens on that exercise', cdp.ev("document.getElementById('exerciseFilter').value") == 'bench press'
          and text('sessionsTitle') == 'Every session of Bench Press')
    check('and lists every session of it, newest first', len(all_sessions) == len(bench_workouts) and all_sessions[0].endswith('100 lbs × 8, 8, 7 · reps left 2, 0'),
          (len(all_sessions), len(bench_workouts), all_sessions[:2]))
    check('with the note kept with it', visible('sessionsNote') and text('sessionsNote') == 'Your note: Grip on the rings', text('sessionsNote'))
    cdp.ev("(e => { e.value = 'all'; e.dispatchEvent(new Event('change')); })(document.getElementById('exerciseFilter'))")
    cdp.pause(0.2)
    check('across all exercises there is no such list', not visible('sessionsCard'))
    cdp.goto('/history.html')
    cdp.wait("document.querySelectorAll('.history-workout').length > 0")
    href = cdp.ev("[...document.querySelectorAll('.workout-details li strong a')].find(a => a.textContent === 'Barbell Row').getAttribute('href')")
    check('History links each exercise to it', href == 'progress.html?exercise=barbell%20row', href)

    # ------------------------------------------------------------------ S supersets
    print('S   supersets made mid-workout')
    start_saved(lift_day)
    check('an exercise can be paired with the next', visible('supersetToggle') and text('supersetToggle') == 'Superset with next')
    click('supersetToggle')
    check('which makes them a superset', visible('supersetLine') and text('supersetLine') == 'Superset with Barbell Row: a set of each in turn, then rest.'
          and text('supersetToggle') == 'Leave superset', text('supersetLine'))
    # The completed sets are open on the first move; a hop to the next one folds them away, as moving to another exercise does.
    cdp.ev("document.getElementById('completedSetsToggle').open = true")
    log(100, 8)
    check('a set goes straight on to the other, with no rest', current() == 'Barbell Row' and not visible('restPanel'))
    check('and the completed sets fold away on that hop, so the controls below are not pushed down',
          cdp.ev("document.getElementById('completedSetsToggle').open") is False, cdp.ev("document.getElementById('completedSetsToggle').open"))
    log(80, 8)
    check('which ends the round: rest, and back to the first', current() == 'Bench Press' and visible('restPanel'))
    cdp.ev("document.getElementById('addActiveExercise').open = true")
    set_field('activeAddName', 'Face Pull')
    set_field('activeAddReps', 15)
    click('activeAddBtn')
    check('an exercise added mid-superset goes after it, not into it', cdp.ev('activeSession.exercises.map(e => e.name)') == ['Bench Press', 'Barbell Row', 'Face Pull', 'Curl'],
          cdp.ev('activeSession.exercises.map(e => e.name)'))
    click('supersetToggle')
    check('leaving it undoes the superset for both', cdp.ev('activeSession.exercises.map(e => e.group || null)') == [None, None, None, None] and not visible('supersetLine'))
    end()

    # ------------------------------------------------------------------ a new personal record sets off a firework
    print('F   a set that beats your best sets off a firework, once per new record')
    open_tracker()
    cdp.ev("personalBests = { [exerciseKey('Bench Press')]: { weight: 100, oneRepMax: 115, reps: 0, seconds: 0 } }")
    t.start(0)
    cdp.pause(0.4)
    fireworks = "document.querySelectorAll('.firework').length"
    log(95, 5)
    check('a set short of the best sets off nothing', cdp.ev(fireworks) == 0, cdp.ev(fireworks))
    log(105, 5)
    check('a heavier weight than ever does', cdp.ev(fireworks) == 1, cdp.ev(fireworks))
    check("a record's size: bursts of sparks that carry their own direction, over the whole screen",
          cdp.ev("document.querySelector('.firework').dataset.size") == 'record' and cdp.ev("document.querySelectorAll('.firework .firework-burst').length") == 3
          and cdp.ev("!!document.querySelector('.firework i').style.getPropertyValue('--dx')")
          and cdp.ev("(box => Math.abs(box.width - document.documentElement.clientWidth) <= 1 && Math.abs(box.height - innerHeight) <= 1)(document.querySelector('.firework').getBoundingClientRect())") is True,
          cdp.ev("document.querySelectorAll('.firework .firework-burst').length"))
    check('the first burst goes up from the button that was tapped', cdp.ev("""(burst => { const button = document.getElementById('completeSetBtn').getBoundingClientRect();
        return Math.abs(parseFloat(burst.style.left) - (button.left + button.width / 2)) < 1 && Math.abs(parseFloat(burst.style.top) - (button.top + button.height / 2)) < 1; })
        (document.querySelector('.firework-burst'))""") is True)
    check('never in the way of a tap', cdp.ev("getComputedStyle(document.querySelector('.firework')).pointerEvents") == 'none')
    cdp.pause(2.0)
    check('and clears itself away', cdp.ev(fireworks) == 0, cdp.ev(fireworks))
    log(105, 5)
    check('repeating the same record sets off nothing new', cdp.ev(fireworks) == 0, cdp.ev(fireworks))
    log(110, 5)
    check('beating it again does', cdp.ev(fireworks) == 1, cdp.ev(fireworks))
    cdp.pause(2.0)
    cdp.ev("saveLocalState('goals', { 'bench press': { name: 'Bench Press', target: 120, unit: 'lbs', by: '' }, 'squat': { name: 'Squat', target: 100, unit: 'kg', by: '' } })")
    log(115, 5)
    check('a set short of a goal is only a record', cdp.ev(fireworks) == 1 and cdp.ev("document.querySelector('.firework').dataset.size") == 'record'
          and 'Goal reached' not in text('formFeedback'), text('formFeedback'))
    cdp.pause(2.0)
    log(120, 5)
    check('a set that reaches a goal sets off a bigger show, once, with confetti across the screen', cdp.ev(fireworks) == 1
          and cdp.ev("document.querySelector('.firework').dataset.size") == 'goal' and cdp.ev("document.querySelectorAll('.firework .firework-burst').length") == 5
          and cdp.ev("document.querySelectorAll('.firework b').length") > 0, cdp.ev("document.querySelector('.firework').dataset.size"))
    check('and says which goal', text('formFeedback') == 'Goal reached: Bench Press, 120 lbs!', text('formFeedback'))
    cdp.pause(3.0)
    log(125, 5)
    check('going past it is a record again, not the goal', cdp.ev(fireworks) == 1 and cdp.ev("document.querySelector('.firework').dataset.size") == 'record'
          and 'Goal reached' not in text('formFeedback'), text('formFeedback'))
    end()

    # ------------------------------------------------------------------ D the weight buttons' step
    print('D   the weight buttons step 2.5 lbs for a dumbbell or cable move, and 5 for the rest')
    steps = "[...document.querySelectorAll('#weightStepper [data-weight-step]')].map(b => b.textContent)"
    start_saved(step_day)
    check('a dumbbell move: the buttons say 2.5, and Go heavier goes up 2.5', cdp.ev(steps) == ['−2.5', '+2.5'] and text('progressionUse') == 'Use 12.5 lbs',
          (current(), cdp.ev(steps), text('progressionUse')))
    cdp.ev("document.querySelector('#weightStepper [data-weight-step=\"2.5\"]').click()")
    check('one tap goes from 10 to 12.5', cdp.ev("document.getElementById('activeWeight').value") == '12.5', cdp.ev("document.getElementById('activeWeight').value"))
    click('nextExerciseBtn')
    check('a cable move steps by 2.5 too', current() == 'Cable Row' and cdp.ev(steps) == ['−2.5', '+2.5'] and text('progressionUse') == 'Use 42.5 lbs',
          (current(), cdp.ev(steps), text('progressionUse')))
    click('nextExerciseBtn')
    check('any other move keeps the 5 lbs of Settings', current() == 'Leg Extension' and cdp.ev(steps) == ['−5', '+5'] and text('progressionUse') == 'Use 65 lbs',
          (current(), cdp.ev(steps), text('progressionUse')))
    cdp.ev("document.querySelector('#weightStepper [data-weight-step=\"5\"]').click()")
    check('and one tap goes up 5', cdp.ev("document.getElementById('activeWeight').value") == '65', cdp.ev("document.getElementById('activeWeight').value"))
    end()
