// What a training program is made of, as far as knowing which workout comes next: finding its definition, its weeks and days,
// and the first day not done. Kept apart from program.js, which is the Tracker's program card, so the History page can say
// what is planned for each training day without the card's page. Loaded after program-definitions.js.

function findProgramDefinition(id) {
  return programDefinitions.find(definition => definition.id === id) || null;
}

// The definition as this program has it: a program the lifter built (Your own program) goes by its own name.
function programDefinition(program) {
  const definition = findProgramDefinition(program.definition);
  return definition && definition.forProgram ? definition.forProgram(program) : definition;
}

// ---- The plan -------------------------------------------------------------

function programWeeks(program) {
  return programDefinition(program).weeks(program);
}

function programDays(program) {
  return programDefinition(program).days(program);
}

function dayKey(week, day) {
  return `${week}-${day}`;
}

// A day's name. Most programs have the same days every week; one whose days differ week to week (Sad to Savage's second day is
// full body in one week and arms and abs in the next) gives `dayName` to say what a day is in a week.
function dayTitle(program, week, day) {
  const definition = programDefinition(program);
  return definition.dayName ? definition.dayName(program, week, day) : programDays(program)[day].name;
}

// The plates a day wears in the lists (what kind of day it is, what it works), as { label, tone }; none for a program that names none.
function dayTags(program, week, day) {
  const definition = programDefinition(program);
  return definition.dayTags ? definition.dayTags(program, week, day) : [];
}

// Where a day sits in its week, as the card says it: "day 3", or "workout 2 of 3" for a program whose definition counts it that way.
// Lower case, so the card can capitalise it or put it mid-sentence.
function dayPlace(program, week, day) {
  const definition = programDefinition(program);
  return definition.dayPlace ? definition.dayPlace(program, week, day) : `day ${day + 1}`;
}

// "day" or "workout": what the days of a run are counted as. "day" unless the definition says otherwise.
function dayNoun(program) {
  const definition = programDefinition(program);
  return definition.dayNoun ? definition.dayNoun(program) : 'day';
}

// "Deadlift Day, week 1" in a program of several weeks a block; just the day's name when a block is one week.
function dayLabel(program, week, day) {
  const name = dayTitle(program, week, day);
  return programWeeks(program).length > 1 ? `${name}, week ${week + 1}` : name;
}

// Whether a day is part of this run of the program. A program that can leave some days out (Sad to Savage without its Pilates days)
// says which through `dayActive`; a day left out is never next, never counted and never listed.
function dayActive(program, week, day) {
  const definition = programDefinition(program);
  return definition.dayActive ? definition.dayActive(program, week, day) : true;
}

// How many days this run has, and how many of them are done.
function activeDayCount(program) {
  const days = programDays(program);
  return programWeeks(program).reduce((count, entry, week) => count + days.filter((item, day) => dayActive(program, week, day)).length, 0);
}

function activeDaysDone(program) {
  return Object.keys(program.done).filter(key => {
    const [week, day] = key.split('-').map(Number);
    return dayActive(program, week, day);
  }).length;
}

function nextProgramDay(program) {
  const weeks = programWeeks(program), days = programDays(program);
  for (let week = 0; week < weeks.length; week += 1) {
    for (let day = 0; day < days.length; day += 1) if (dayActive(program, week, day) && !program.done[dayKey(week, day)]) return { week, day };
  }
  return null;
}
