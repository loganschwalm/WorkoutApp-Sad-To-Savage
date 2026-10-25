"""Kilograms: the unit setting, showing pound workouts in kilograms and back, logging in kilograms, a unit change in the
middle of a workout, Progress, and the program, which has no weights of its own to convert."""

import json

INTERCEPT = True

LBS_TO_KG = 0.45359237


def kg(lbs):
    """Pounds as the app converts them: to 2 decimals."""
    return round(lbs * LBS_TO_KG, 2)


def run(t):
    cdp, check, api, token, wait_for = t.cdp, t.check, t.api, t.token, t.wait_for
    open_tracker, safe_ev = t.open_tracker, t.safe_ev

    text, field, set_field = t.text, t.field, t.set_field

    def choose_unit(unit):
        cdp.ev("document.getElementById('settingsButton').click()")
        cdp.ev(f"document.getElementById('unitSetting').value = '{unit}'; document.getElementById('settingsForm').requestSubmit()")
        cdp.pause(0.5)

    def server_settings():
        return api('GET', '/api/state', token=token)[0]['settings']

    def details(name):
        """The exercise lines of the newest saved workout with this name, as History shows it, opened."""
        cdp.goto('/history.html')
        cdp.wait("document.querySelectorAll('.history-workout').length >= 3")
        return cdp.ev(f"""(() => {{ const row = [...document.querySelectorAll('.history-workout')].find(li => li.querySelector('strong').textContent === {json.dumps(name)});
          row.querySelector('[data-action=view]').click();
          return [...row.querySelectorAll('.workout-details li')].map(li => li.textContent); }})()""")

    def complete_set(weight, reps):
        set_field('activeWeight', weight)
        cdp.ev(f"document.getElementById('completedReps').value = '{reps}'; document.getElementById('completeSetBtn').click()")
        cdp.pause(0.2)

    def finish():
        for _ in range(8):
            if cdp.ev("document.getElementById('activeWorkout').hidden"):
                break
            cdp.ev("document.getElementById('nextExerciseBtn').click()")
            cdp.pause(0.25)
        cdp.pause(0.6)

    # ------------------------------------------------------------------ K1 the setting
    print('K1  the weight unit is a setting')
    open_tracker()
    cdp.ev("document.getElementById('settingsButton').click()")
    check('Settings offers pounds and kilograms, pounds to start', cdp.ev("[...document.getElementById('unitSetting').options].map(o => o.value)") == ['lbs', 'kg']
          and field('unitSetting') == 'lbs')
    cdp.ev("document.getElementById('closeSettings').click()")
    choose_unit('kg')
    check('choosing kilograms is saved to the account', wait_for(lambda: server_settings().get('unit') == 'kg'), server_settings())

    # ------------------------------------------------------------------ K2 the tracker in kilograms
    print('K2  the Tracker in kilograms')
    labels = cdp.ev("[...document.querySelectorAll('.unit-label')].map(l => l.textContent)")
    check('weight labels say kg', labels == ['kg', 'kg'], labels)
    steppers = cdp.ev("[...document.querySelectorAll('#weightStepper [data-weight-step]')].map(b => [b.textContent, b.dataset.weightStep, b.getAttribute('aria-label')])")
    check('the weight buttons step 2.5 kg', steppers == [['−2.5', '-2.5', '2.5 kg lighter'], ['+2.5', '2.5', '2.5 kg heavier']], steppers)
    shown = details('Seed Push')
    check('saved pound workouts are shown in kilograms', shown == ['Bench Press' + f'{kg(105)} kg × 8', 'Overhead Press' + f'{kg(62)} kg × 8'], shown)
    open_tracker()
    stored = t.workout(t.W1)
    check('while the stored workout is untouched, in pounds', stored.get('unit') is None and stored['exercises'][0]['sets'][0]['weight'] == 100, stored)

    # ------------------------------------------------------------------ K2b editing a pound workout in kilograms
    print('K2b editing a pound workout while kilograms are shown')

    def edit_set(field, index, value, exercise=0):
        cdp.ev(f"""(i => {{ i.value = '{value}'; i.dispatchEvent(new Event('change', {{ bubbles: true }})); }})
            (document.querySelector('#exerciseList [data-exercise="{exercise}"][data-set="{index}"][data-field={field}]'))""")

    def edit_and_save(*changes):
        cdp.ev(f"loadWorkoutIntoForm(savedWorkouts.find(w => String(w.id) === '{t.W1}'), true)")
        for change in changes:
            edit_set(*change)
        cdp.ev("document.getElementById('saveBtn').click()")
        cdp.pause(1.0)
        return t.workout(t.W1)

    cdp.ev(f"loadWorkoutIntoForm(savedWorkouts.find(w => String(w.id) === '{t.W1}'), true)")
    shown = cdp.ev("[...document.querySelectorAll('#exerciseList [data-field=weight]')].map(input => input.value)")
    check('the form shows the workout in kilograms', shown == [str(kg(100)), str(kg(100)), str(kg(60))], shown)
    cdp.ev("document.getElementById('clearBtn').click()")
    weights = lambda w: [[s['weight'] for s in e['sets']] for e in w['exercises']]
    edited = edit_and_save(('reps', 1, 9))
    check('changing only some reps saves the pounds as they were, not 45.36 kg turned back (134.99 lbs for 135)',
          weights(edited) == [[100, 100], [60]] and edited['exercises'][0]['sets'][1]['reps'] == 9, json.dumps(edited['exercises'])[:300])
    check('in the unit the workout was kept in, with the weights of its exercises as they were',
          edited.get('unit') is None and [e['weight'] for e in edited['exercises']] == [100, 60], json.dumps(edited)[:300])
    edited = edit_and_save(('weight', 0, 50))
    check('a weight typed in kilograms is saved in pounds, and the rest are as they were', weights(edited) == [[110.23, 100], [60]], weights(edited))
    check('the heaviest set is the exercise’s weight', edited['exercises'][0]['weight'] == 110.23 and edited.get('unit') is None, json.dumps(edited)[:300])
    edit_and_save(('weight', 0, kg(100)))
    check('typing the weight it showed saves the weight it was', weights(t.workout(t.W1)) == [[100, 100], [60]], weights(t.workout(t.W1)))
    edit_and_save(('reps', 1, 8))
    check('and the reps put back, for the checks that follow', t.workout(t.W1)['exercises'][0]['sets'][1]['reps'] == 8)

    # ------------------------------------------------------------------ K3 a workout in kilograms
    print('K3  logging a workout in kilograms')
    known = t.ids()
    t.start_saved(t.W3)
    cdp.pause(0.5)
    check('last time is shown in kilograms', text('activeExerciseLast').endswith(f'{kg(105)} kg × 8'), text('activeExerciseLast'))
    check('the weight to lift is rounded to the nearest half kilo', text('activeExerciseTarget') == 'Target: 8 reps at 47.5 kg'
          and field('activeWeight') == '47.5', f"{text('activeExerciseTarget')} {field('activeWeight')}")
    check('with plates for a 20 kg bar', text('plateHint') == 'Each side of a 20 kg bar: 10 + 2.5 + 1.25', text('plateHint'))
    cdp.ev("document.querySelector('#weightStepper [data-weight-step=\"2.5\"]').click()")
    check('+2.5 adds 2.5 kg', field('activeWeight') == '50' and text('plateHint') == 'Each side of a 20 kg bar: 15', f"{field('activeWeight')} {text('plateHint')}")
    complete_set(60, 5)
    row = cdp.ev("(() => { const li = document.querySelector('#completedSets li'); return [li.querySelector('[data-field=weight]').value, li.querySelector('.set-field span').textContent, li.querySelector('[data-field=weight]').getAttribute('aria-label')]; })()")
    check('the logged set says kg', row == ['60', 'kg', 'Set 1 weight in kg'], row)
    check('the workout in progress is in kilograms', safe_ev('readLocalActive().session.unit') == 'kg')
    finish()
    check('it is saved', wait_for(lambda: len(t.ids() - known) == 1))
    saved = next(w for w in t.workouts() if w['id'] not in known)
    check('in kilograms, as logged', saved.get('unit') == 'kg' and saved['exercises'][0]['sets'] == [{'reps': 5, 'weight': 60}], json.dumps(saved)[:300])

    # ------------------------------------------------------------------ K4 back to pounds
    print('K4  back to pounds')
    cdp.goto('/history.html')
    cdp.wait("document.querySelectorAll('.history-workout').length >= 4")
    choose_unit('lbs')
    lines = cdp.ev("[...document.querySelectorAll('.history-workout')].map(li => li.querySelector('.workout-details li').textContent)")
    kg_in_lbs = round(60 / LBS_TO_KG, 2)
    check('History shows the kilogram workout in pounds', lines[0] == f'Bench Press{kg_in_lbs} lbs × 5', lines[0])
    check('and the pound workouts exactly as logged', lines[1:] == ['Bench Press105 lbs × 8', 'Barbell Row80 lbs × 8', 'Bench Press2 × 8 at 100 lbs'], lines[1:])
    open_tracker()
    t.start(0)
    cdp.pause(0.5)
    check('last time, logged in kilograms, is shown in pounds', text('activeExerciseLast').endswith(f'{kg_in_lbs} lbs × 5'), text('activeExerciseLast'))
    check('and filled in rounded to the nearest half pound', field('activeWeight') == '132.5', field('activeWeight'))
    check('the weight buttons are back to 5 lbs', cdp.ev("document.querySelector('#weightStepper [data-weight-step]').textContent") == '−5')

    # ------------------------------------------------------------------ K5 changing unit mid-workout
    print('K5  changing the unit in the middle of a workout')
    complete_set(100, 5)
    # A set half typed survives a setting that has nothing to do with the unit, however the page hears of it, and is converted by one.
    set_field('activeWeight', '112.5')
    set_field('completedReps', '7')
    cdp.ev("window.dispatchEvent(new Event('settingschange'))")
    typed = [field('activeWeight'), field('completedReps')]
    check('a settings change from elsewhere leaves a set being typed alone', typed == ['112.5', '7'], typed)
    cdp.ev("document.getElementById('settingsButton').click()")
    cdp.ev("const box = document.getElementById('confirmEndSetting'); box.checked = !box.checked; box.dispatchEvent(new Event('change', { bubbles: true }));"
           "document.getElementById('settingsForm').requestSubmit()")
    cdp.pause(0.5)
    typed = [field('activeWeight'), field('completedReps')]
    check('so does one made in Settings', typed == ['112.5', '7'], typed)
    choose_unit('kg')
    typed = [field('activeWeight'), field('completedReps')]
    check('a change of unit converts the weight being typed and keeps its reps', typed == [str(kg(112.5)), '7'], typed)
    row = cdp.ev("(() => { const li = document.querySelector('#completedSets li'); return [li.querySelector('[data-field=weight]').value, li.querySelector('.set-field span').textContent]; })()")
    check('the logged set is converted', row == [str(kg(100)), 'kg'], row)
    check('and the workout in progress is saved in kilograms', safe_ev('readLocalActive().session.unit') == 'kg'
          and wait_for(lambda: (t.active_session() or {}).get('unit') == 'kg'), t.active_session())
    known = t.ids()
    finish()
    check('finishing saves it in kilograms', wait_for(lambda: len(t.ids() - known) == 1))
    saved = next(w for w in t.workouts() if w['id'] not in known)
    check('with the converted weight', saved.get('unit') == 'kg' and saved['exercises'][0]['sets'][0]['weight'] == kg(100), json.dumps(saved)[:300])

    # ------------------------------------------------------------------ K6 Progress
    print('K6  Progress in kilograms')
    cdp.goto('/progress.html')
    cdp.wait('chartData && chartData.points.length > 0')
    cdp.pause(0.3)
    set_field('exerciseFilter', 'bench press')
    cdp.pause(0.3)
    values = cdp.ev("chartData.types.flatMap(type => [...type.values.values()]).sort((a, b) => a - b)")
    check('the chart plots every workout in kilograms', values == sorted([kg(100), kg(105), 60, kg(100)]), values)
    choose_unit('lbs')
    values = cdp.ev("chartData.types.flatMap(type => [...type.values.values()]).sort((a, b) => a - b)")
    check('and redraws in pounds when the unit changes', values == sorted([100, 105, kg_in_lbs, round(kg(100) / LBS_TO_KG, 2)]), values)

    # ------------------------------------------------------------------ K7 the program in kilograms
    print('K7  the program has no weights of its own, so a change of unit leaves it alone')
    open_tracker()
    cdp.ev("document.querySelector('#programNext [data-program-action=setup]').click()")
    cdp.ev("document.getElementById('programLevel').value = 'sw'")
    cdp.ev("document.getElementById('programForm').requestSubmit()")
    cdp.pause(0.4)
    before = cdp.ev('currentProgram')
    choose_unit('kg')
    check('changing the unit leaves the program as it was', cdp.ev('currentProgram') == before and 'unit' not in before, before)
    check('and its days ask for no weights: the range is the lifter’s, in the text the plan gives', cdp.ev("programWorkout(currentProgram, 0, 0).exercises.every(e => e.plan.every(s => s.weight === ''))") is True)
    cdp.ev("document.querySelector('#programNext [data-program-action=start]').click()")
    cdp.pause(0.4)
    check('the first set of a workout is a warm-up of reps, in no unit', 'kg' not in text('activeExerciseTarget') and 'lbs' not in text('activeExerciseTarget'), text('activeExerciseTarget'))
    check('the weight to lift is still in kilograms', cdp.ev("document.querySelector('.unit-label').textContent") == 'kg')
    cdp.ev("confirm = () => true; document.getElementById('endWorkoutBtn').click()")
    cdp.pause(0.4)

    # ------------------------------------------------------------------ K8b a unit changed elsewhere
    print('K8b a unit changed on another device')
    api('PUT', '/api/state', {'settings': {**server_settings(), 'unit': 'lbs'}}, token)
    for attempt in range(3):
        # The page starts from this device's copy (kilograms) and learns of pounds from the server as it loads.
        open_tracker()
        cdp.wait("initialLoadDone")
        cdp.pause(0.3)
        shown = details('Seed Push')
        # The newest Seed Push is the one logged in kilograms in K3.
        if shown != [f'Bench Press{kg_in_lbs} lbs × 5']:
            break
    check('the saved workouts follow it, however the page load goes', shown == [f'Bench Press{kg_in_lbs} lbs × 5']
          and cdp.ev('getWorkoutSettings().unit') == 'lbs', shown)
    choose_unit('kg')

    # ------------------------------------------------------------------ K9 the server
    print('K9  the server keeps units honest')
    status, _, reply = t.request('POST', '/api/workouts', json.dumps({'name': 'Stones', 'unit': 'stone', 'exercises': []}).encode(), {'Content-Type': 'application/json'}, token=token)
    check('a workout in any other unit is refused', status == 400 and reply.get('error') == 'unit must be lbs or kg.', f'{status} {reply}')
    stored = t.workout(t.W1)
    check('after all that, the pound workouts on the server are still exactly as logged',
          stored.get('unit') is None and [s['weight'] for s in stored['exercises'][0]['sets']] == [100, 100], stored)
    check('no page errors along the way', not [line for line in cdp.console if line.startswith('exceptionThrown')], [line for line in cdp.console if line.startswith('exceptionThrown')][:3])
