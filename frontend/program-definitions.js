// The program the app is built around: Shelby Sacco's Sad to Savage. program.js does everything the Tracker does with it (keeping it,
// the card, starting a day as a workout, recording it once it is finished); the definition here supplies the rest:
//
//   id, name, shortName, summary, schedule  how the program is named and described; workouts are named by workoutName
//   options                  settings asked for at setup: { id, type:'select', label, choices:[{ value, label, help }], default }
//   weeks(program)           the weeks, [{ name, summary }]
//   days(program)            the days of each week, [{ name }]: the same slots every week
//   dayName(program, week, day)  what a day is, when it differs from week to week
//   workout(program, week, day)  the day's exercises; each has a plan, one entry per set: { weight, reps } plus repsMax for a range,
//                            unit ('seconds', 'steps'), per ('each side'), warmup. A weight of '' is the lifter's call. An
//                            exercise's group puts it in a superset with its neighbours, and its rest is the seconds the rest
//                            timer counts after each round.
//   workoutName(program, day, week), blockLabel(program, week), dayDescription(program, week, day)  a day's workout name, where
//                            in the program it was (History) and its line in the list of weeks
//   planLines(program, week, day), walkGoal(program, next)  what the card says of the next day, and the day's walk goal
//   setup.intro(editing)     what the setup dialog says
//
// A program's workouts keep the program's name and the day they came from (see programInfo), so History can say where each was.

function repeatSets(count, set) {
  return Array.from({ length:count }, () => ({ ...set }));
}

// ---- Sad to Savage --------------------------------------------------------
// Shelby Sacco's six-week plan, which this whole app is built around. The plan itself is sad-to-savage-data.js; here it is
// turned into what the program machinery runs. A program of five days a week for six weeks has no numbers per lift to
// move: how heavy to go is the lifter's call, within the range the plan gives for their level, so the only option is that
// level. It is a fixed length: when the thirtieth day is done the program is finished (see settleProgram), not started over.
const sadToSavageDaysPerWeek = 5;
const sadToSavageLevels = [
  { value:'nts', label:'New to strength', help:'The lighter range for each exercise, for someone new to lifting or coming back to it.' },
  { value:'sw', label:'Shelby\'s weights', help:'The heavier range for each exercise: the weights Shelby uses herself.' }
];
// "1-2 minutes after each round", the plan says; a minute and a half is the middle of that. The warm-up circuit's rest is
// shortened by the rest timer itself (WARMUP_REST_SECONDS).
const sadToSavageRest = 90;
// The plan gives the cool-down as 3-5 minutes of static stretching; four is the middle, and the timer's length can be changed.
const sadToSavageCooldownSeconds = 240;

function sadToSavageDay(week, day) {
  return sadToSavagePlan.days[week * sadToSavageDaysPerWeek + day];
}

function sadToSavageLevel(program) {
  return sadToSavageLevels.find(level => level.value === program.options.level) || sadToSavageLevels[0];
}

// What the plan asks of the lifter for one move, as the plan writes it: "12 reps each side", "30 seconds", "10 steps each way".
function sadToSavageMoveTarget(move) {
  const count = move.repsMax ? `${move.reps}\u2013${move.repsMax}` : String(move.reps);
  return `${count} ${move.unit || 'reps'}${move.per ? ` ${move.per}` : ''}`;
}

// One move of a circuit as an exercise of the workout: a set of it per round, all at the weight the lifter chooses. The
// moves of a circuit share a group, which is how the workout knows they are done as rounds (a set of each in turn, then rest).
function sadToSavageExercise(move, rounds, group, level, warmup) {
  const timed = move.unit === 'seconds';
  const range = !warmup && level ? move[level.value] : '';
  const notes = [range ? `${level.label}: ${range}` : '', move.note || ''].filter(Boolean).join('. ');
  const set = { weight:'', reps:move.reps, ...(move.repsMax ? { repsMax:move.repsMax } : {}), ...(move.unit ? { unit:move.unit } : {}),
    ...(move.per ? { per:move.per } : {}), ...(warmup ? { warmup:true } : {}) };
  return { name:move.name, weight:'', reps:String(move.reps), group, rest:sadToSavageRest, ...(timed ? { timed:true } : {}),
    ...(notes ? { note:notes } : {}), plan:repeatSets(rounds, set) };
}

// A strength day: the warm-up circuit, each superset (or the core burnout) as rounds, then the cool-down as a timed stretch.
function sadToSavageStrength(day, level) {
  const exercises = day.warmup.moves.map(move => sadToSavageExercise(move, day.warmup.rounds, 'warmup', level, true));
  day.blocks.forEach((block, index) => block.moves.forEach(move => exercises.push(sadToSavageExercise(move, block.rounds, `block${index + 1}`, level, false))));
  exercises.push({ name:'Cool-down', weight:'', reps:String(sadToSavageCooldownSeconds), rest:sadToSavageRest, timed:true, note:day.cooldown.text,
    plan:[{ weight:'', reps:sadToSavageCooldownSeconds, unit:'seconds' }] });
  return exercises;
}

// A Pilates day is the mat workout as one timed session, as long as Shelby's video is, then the cool-down.
function sadToSavagePilates(day) {
  const seconds = day.minutes * 60;
  return [{ name:`Mat Pilates: ${day.focus}`, weight:'', reps:String(seconds), rest:sadToSavageRest, timed:true, note:day.message, plan:[{ weight:'', reps:seconds, unit:'seconds' }] },
    { name:'Cool-down', weight:'', reps:String(sadToSavageCooldownSeconds), rest:sadToSavageRest, timed:true, note:day.cooldown.text,
      plan:[{ weight:'', reps:sadToSavageCooldownSeconds, unit:'seconds' }] }];
}

const sadToSavage = {
  id:'sad-to-savage',
  name:'Sad to Savage',
  shortName:'Sad to Savage',
  summary:'Shelby Sacco\'s six-week plan: three strength days and two mat Pilates days every week, and a walk every day. Each day opens with what to do, and the program moves on as you finish it.',
  schedule:'6 weeks \u00b7 5 days a week \u00b7 strength, Pilates and a daily walk',
  options:[
    { id:'level', type:'select', label:'Your level', default:'nts', choices:sadToSavageLevels.map(({ value, label, help }) => ({ value, label, help })) }
  ],
  weeks:() => sadToSavagePlan.quotes.map((quote, index) => ({ name:quote, summary:`${sadToSavagePlan.days.filter(day => day.week === index + 1 && day.kind === 'strength').length} strength \u00b7 `
    + `${sadToSavagePlan.days.filter(day => day.week === index + 1 && day.kind === 'pilates').length} Pilates` })),
  // The days of a week are the same five slots every week; what each is (its name, strength or Pilates) is dayName's.
  days:() => Array.from({ length:sadToSavageDaysPerWeek }, (entry, day) => ({ name:`Day ${day + 1}` })),
  dayName:(program, week, day) => sadToSavageDay(week, day).focus,
  workout(program, week, day) {
    const plan = sadToSavageDay(week, day);
    return plan.kind === 'pilates' ? sadToSavagePilates(plan) : sadToSavageStrength(plan, sadToSavageLevel(program));
  },
  workoutName:(program, day, week) => `${sadToSavageDay(week, day).id} ${sadToSavageDay(week, day).focus}`,
  blockLabel:(program, week) => `Week ${week + 1} of ${sadToSavagePlan.quotes.length}`,
  dayDescription(program, week, day) {
    const plan = sadToSavageDay(week, day);
    if (plan.kind === 'pilates') return `Mat Pilates \u00b7 ${plan.minutes} minutes`;
    const supersets = plan.blocks.filter(block => /^superset/i.test(block.name)).length;
    return `Strength \u00b7 ${supersets} supersets${supersets < plan.blocks.length ? ' and a core burnout' : ''}`;
  },
  // The panel for the day: what it asks for, a line each, ending with what to have to hand.
  planLines(program, week, day) {
    const plan = sadToSavageDay(week, day);
    const after = `Then ${plan.cooldown.minutes} minutes of stretching: ${plan.cooldown.text.replace(/^Static Stretching such as /i, '')}`;
    if (plan.kind === 'pilates') return [plan.message, after, `You need: ${plan.equipment.join(', ')}`];
    const circuit = (name, rounds, moves) => `${name} · ${rounds} rounds: ${moves.map(move => `${move.name} (${sadToSavageMoveTarget(move)})`).join(', ')}`;
    const equipment = [...new Set(plan.blocks.flatMap(block => block.equipment))];
    return [circuit(plan.warmup.name, plan.warmup.rounds, plan.warmup.moves), ...plan.blocks.map(block => circuit(block.name, block.rounds, block.moves)), after,
      `You need: ${equipment.join(', ')}`];
  },
  // The walk is the plan's goal for the day; once the program is over, the usual one.
  walkGoal:(program, next) => next ? sadToSavageDay(next.week, next.day).walk : sadToSavagePlan.days[0].walk,
  setup:{ intro:editing => editing ? 'Change your level any time: the days still to do show the range for the new one.'
    : 'Choose the range of weights the plan shows you. You can change this later.' }
};

const programDefinitions = [sadToSavage];
