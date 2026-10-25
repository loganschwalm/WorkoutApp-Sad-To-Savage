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

// "Deadlift Day, week 1" in a program of several weeks a block; just the day's name when a block is one week.
function dayLabel(program, week, day) {
  const name = dayTitle(program, week, day);
  return programWeeks(program).length > 1 ? `${name}, week ${week + 1}` : name;
}

function nextProgramDay(program) {
  const weeks = programWeeks(program), days = programDays(program);
  for (let week = 0; week < weeks.length; week += 1) {
    for (let day = 0; day < days.length; day += 1) if (!program.done[dayKey(week, day)]) return { week, day };
  }
  return null;
}
