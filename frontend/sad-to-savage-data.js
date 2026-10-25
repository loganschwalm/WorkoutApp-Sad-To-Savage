// Shelby Sacco's Sad to Savage: the program the whole app is built around. Six weeks of five days, three of strength and two of mat
// Pilates, each with a daily walk. This file is the plan and only the plan; sad-to-savage.js turns it into workouts and days.
//
// A day is { id, week, day, kind, focus, walk, ... }. kind is 'strength' or 'pilates'.
//   strength  warmup { name, rounds, moves }, blocks [{ name, rounds, moves, equipment }] and cooldown { minutes, text }
//   pilates   minutes, message (Shelby's note for the day), equipment and cooldown
// A move is { name, reps, repsMax?, unit?, per?, note?, nts?, sw? }: reps is a count (repsMax makes it a range, 8–10), unit is 'seconds'
// or 'steps' when it is not reps, per says "each side", and nts / sw are the weight or band for someone new to strength and for Shelby's
// own weights. A move with neither (a plank hold, a push-up) is bodyweight at every level. Each block is done for `rounds` rounds, one set of
// each move in turn, with 1–2 minutes' rest after each round.
const sadToSavagePlan = {
  quotes:[
    'Small steps create big change.',
    'Discipline beats motivation every time.',
    'Who you become is built by what you do daily.',
    'Progress is power—keep going.',
    'Habits shape your future self.',
    'Your consistency is your superpower.',
  ],
  days:[
    {
      id:'W1D1',
      week:1,
      day:1,
      kind:'strength',
      focus:'Upper Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      warmup:{ name:'Upper Body Warm-up', rounds:3, moves:[
        { name:'Elevated Shoulder Taps', reps:15, per:'each side' },
        { name:'Single DB Curl + Press', reps:15 },
        { name:'Band Pull Apart', reps:15 },
      ] },
      blocks:[
        { name:'Superset 1', rounds:3, equipment:['2 DBs', 'Long Resistance Band', 'Bench'], moves:[
          { name:'DB Bench Chest Press', reps:12, nts:'7.5-10lb DBs', sw:'12.5-15lb DBs' },
          { name:'Banded Single Arm Reverse Fly', reps:12, per:'each side', nts:'light band', sw:'light band' },
        ] },
        { name:'Superset 2', rounds:3, equipment:['2 DBs', 'Cable Machine', 'Bench'], moves:[
          { name:'Alternating DB Arnold Press', reps:10, per:'each side', nts:'5-7.5lb DBs', sw:'10-12.5lb DBs' },
          { name:'Seated Cable Lat Pulldown', reps:12, nts:'25-35lbs', sw:'45-55lbs' },
        ] },
        { name:'Superset 3', rounds:3, equipment:['2 DBs', 'Mat'], moves:[
          { name:'Front Raise to Lateral Raise', reps:10, per:'of each', nts:'3-5lb DBs', sw:'5-10lb DBs' },
          { name:'Forearm Plank Reach', reps:10, per:'each side', nts:'on bench', sw:'on floor' },
        ] },
        { name:'Superset 4', rounds:3, equipment:['2 DBs', 'Bench', 'Mat'], moves:[
          { name:'Alternating DB Bicep Curl', reps:10, per:'each side', nts:'5-10lb DBs', sw:'10-15lb DBs' },
          { name:'DB Skull Crusher', reps:15, nts:'5-10lb DBs', sw:'10-15lb DBs' },
        ] },
      ],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as child pose, crossbody shoulder stretch, side bends, wrist stretch' }
    },
    {
      id:'W1D2',
      week:1,
      day:2,
      kind:'pilates',
      focus:'Full Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      minutes:25,
      message:'Today we are going to do a 25 minute full body mat pilates workout together. I am SO happy you are here and SO proud of you.',
      equipment:['Mat', 'Hand Weights', 'Ankle Weights'],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as child pose, crossbody shoulder stretch, side bends, wrist stretch' }
    },
    {
      id:'W1D3',
      week:1,
      day:3,
      kind:'strength',
      focus:'Lower Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      warmup:{ name:'Lower Body Warm-up', rounds:3, moves:[
        { name:'Banded Lateral Walk', reps:10, unit:'steps', per:'each way' },
        { name:'Weighted Hinge', reps:10 },
        { name:'Glute Bridge March', reps:10, per:'each side' },
      ] },
      blocks:[
        { name:'Superset 1', rounds:3, equipment:['Bench', '2 DBs'], moves:[
          { name:'Weighted Goblet Squat', reps:12, nts:'10-20lb DB', sw:'25-35lb DB' },
          { name:'Deficit Reverse Lunge', reps:8, per:'each side', nts:'body weight', sw:'10lb DBs' },
        ] },
        { name:'Superset 2', rounds:3, equipment:['Bench', '2 DBs'], moves:[
          { name:'Single Leg Hip Thrust', reps:10, per:'each side', nts:'body weight', sw:'10-15lb DB' },
          { name:'DB RDL', reps:12, nts:'10-15lb DBs', sw:'15-20lb DBs' },
        ] },
        { name:'Superset 3', rounds:3, equipment:['Cable Machine', 'Resistance Band'], moves:[
          { name:'Cable Kickbacks', reps:10, per:'each side', nts:'10lbs', sw:'20lbs' },
          { name:'Bear Hold Abductions', reps:20, nts:'light band', sw:'medium band' },
        ] },
        { name:'Core Burnout', rounds:3, equipment:['Mat', 'Timer', '1 DB (optional)'], moves:[
          { name:'Leg Raises', reps:10, per:'each side', nts:'body weight', sw:'10lb DB' },
          { name:'Toe Reach Sit-Ups', reps:15, nts:'body weight', sw:'10lb DB' },
          { name:'Plank Hold', reps:30, unit:'seconds' },
        ] },
      ],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as Pigeon Pose, forward fold seated hamstring stretch, seated spinal twists, standing calf stretch' }
    },
    {
      id:'W1D4',
      week:1,
      day:4,
      kind:'pilates',
      focus:'Core Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      minutes:10,
      message:'Today we are going to do a 10 minute core focused mat pilates workout together. You don\'t need hours, just intention. Let\'s move with purpose.',
      equipment:['Mat', 'Hand Weights', 'Ankle Weights'],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as child pose, crossbody shoulder stretch, side bends, wrist stretch' }
    },
    {
      id:'W1D5',
      week:1,
      day:5,
      kind:'strength',
      focus:'Full Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      warmup:{ name:'Full Body Warm-up', rounds:3, moves:[
        { name:'Lateral Skaters', reps:10, per:'each side' },
        { name:'Ground to Overhead Press', reps:15 },
        { name:'Plank Step-Outs', reps:15, per:'each side' },
      ] },
      blocks:[
        { name:'Superset 1', rounds:3, equipment:['Bench', '1 DB'], moves:[
          { name:'Single Arm Bent Over Row', reps:12, per:'each side', nts:'7.5-12.5lb DB', sw:'15-20lb DB' },
          { name:'Bench Lateral Step Over', reps:10, per:'each side', nts:'supported body weight', sw:'unsupported body weight' },
        ] },
        { name:'Superset 2', rounds:3, equipment:['Bench', '2 DBs', '1 KB'], moves:[
          { name:'KB Deadlift', reps:10, nts:'20-30lbs', sw:'40-50lbs' },
          { name:'DB Reverse Fly', reps:12, nts:'3-5lb DBs', sw:'5-10lb DBs' },
        ] },
        { name:'Superset 3', rounds:3, equipment:['Cable Machine', '1 DB', 'Mat'], moves:[
          { name:'Half Kneeling DB Curl to Press', reps:10, per:'each side', nts:'7.5-10lb DB', sw:'10-15lb DB' },
          { name:'Cable Pallof Press', reps:12, per:'each side', nts:'10-15lbs', sw:'15-20lbs' },
        ] },
        { name:'Superset 4', rounds:3, equipment:['1 DB', 'Resistance Band', 'Mat'], moves:[
          { name:'DB Snatch', reps:6, per:'each side', nts:'7.5-12.5lb DB', sw:'15-20lb DB' },
          { name:'Banded Bicycle Crunch', reps:12, per:'each side', nts:'light band', sw:'medium band' },
        ] },
      ],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as seated single leg stretch, thread the needle, cobra pose, scorpion twist' }
    },
    {
      id:'W2D1',
      week:2,
      day:1,
      kind:'strength',
      focus:'Upper Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      warmup:{ name:'Upper Body Warm-up', rounds:3, moves:[
        { name:'Elevated Shoulder Taps', reps:15, per:'each side' },
        { name:'Single DB Curl + Press', reps:15 },
        { name:'Band Pull Apart', reps:15 },
      ] },
      blocks:[
        { name:'Superset 1', rounds:3, equipment:['2 DBs', 'Bench'], moves:[
          { name:'DB Bench Chest Press', reps:10, nts:'10-15lbs DBs', sw:'15-20lbs DBs' },
          { name:'Banded Single Arm Reverse Fly', reps:12, per:'each side', nts:'light band', sw:'light band' },
        ] },
        { name:'Superset 2', rounds:3, equipment:['2 DBs', 'Cable Machine', 'Bench'], moves:[
          { name:'Alternating DB Arnold Press', reps:8, per:'each side', nts:'5-10lbs DBs', sw:'10-15lbs DBs' },
          { name:'Seated Cable Lat Pulldown', reps:10, nts:'30-40lbs', sw:'50-60lbs' },
        ] },
        { name:'Superset 3', rounds:3, equipment:['2 DBs', 'Mat'], moves:[
          { name:'Hand Release Push-Ups', reps:10, nts:'from kneeling plank', sw:'from full plank' },
          { name:'DB Around the Worlds', reps:12, nts:'2-3lb DBs', sw:'3-5lb DBs' },
        ] },
        { name:'Superset 4', rounds:3, equipment:['2 DBs', 'Cable Machine'], moves:[
          { name:'DB Bicep Curl', reps:15, nts:'5-10lb DBs', sw:'10-15lb DBs' },
          { name:'Cable Tricep Pulldown', reps:15, nts:'10-15lbs', sw:'15-20lbs' },
        ] },
      ],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as child pose, crossbody shoulder stretch, side bends, wrist stretch' }
    },
    {
      id:'W2D2',
      week:2,
      day:2,
      kind:'pilates',
      focus:'Arms + Abs Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      minutes:20,
      message:'Today we are going to do a 20 minute arms & abs focused mat pilates workout. Mat time = me time. You deserve these 20 minutes.',
      equipment:['Mat', 'Hand Weights', 'Ankle Weights'],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as child pose, crossbody shoulder stretch, side bends, wrist stretch' }
    },
    {
      id:'W2D3',
      week:2,
      day:3,
      kind:'strength',
      focus:'Lower Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      warmup:{ name:'Lower Body Warm-up', rounds:3, moves:[
        { name:'Banded Lateral Walk', reps:10, unit:'steps', per:'each way' },
        { name:'Weighted Hinge', reps:10 },
        { name:'Glute Bridge March', reps:10, per:'each side' },
      ] },
      blocks:[
        { name:'Superset 1', rounds:3, equipment:['Bench', '2 DBs'], moves:[
          { name:'Weighted Goblet Squat', reps:10, nts:'15-25lbs DB', sw:'30-40lbs DB' },
          { name:'Deficit Reverse Lunge', reps:6, per:'each side', nts:'body weight', sw:'10-15lb DBs' },
        ] },
        { name:'Superset 2', rounds:3, equipment:['Bench', '2 DBs'], moves:[
          { name:'Single Leg Hip Thrust', reps:10, per:'each side', nts:'body weight', sw:'10-15lb DB' },
          { name:'DB RDL', reps:10, nts:'12.5-15lb DBs', sw:'20-25lb DBs' },
        ] },
        { name:'Superset 3', rounds:3, equipment:['Cable Machine'], moves:[
          { name:'Cable Abduction', reps:10, per:'each side', nts:'10lbs', sw:'15-20lbs' },
          { name:'Plank Kickback', reps:10, per:'each side', nts:'from bench', sw:'from floor' },
        ] },
        { name:'Core Burnout', rounds:3, equipment:['Mat', '1 DB', 'Timer'], moves:[
          { name:'Alternating Scissor Kicks', reps:10, per:'each leg' },
          { name:'Weighted Sit-Ups', reps:10, nts:'body weight', sw:'10-15lb DB' },
          { name:'Plank Step Outs', reps:30, unit:'seconds' },
        ] },
      ],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as Pigeon Pose, forward fold seated hamstring stretch, seated spinal twists, standing calf stretch' }
    },
    {
      id:'W2D4',
      week:2,
      day:4,
      kind:'pilates',
      focus:'Glutes Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      minutes:15,
      message:'Today we are going to do a 15 minute glutes focused mat pilates workout together. Let every rep remind you: you are strong, capable, and in control. I am SO proud of you.',
      equipment:['Mat', 'Hand Weights', 'Ankle Weights'],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as child pose, crossbody shoulder stretch, side bends, wrist stretch' }
    },
    {
      id:'W2D5',
      week:2,
      day:5,
      kind:'strength',
      focus:'Full Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      warmup:{ name:'Full Body Warm-up', rounds:3, moves:[
        { name:'Lateral Skaters', reps:10, per:'each side' },
        { name:'Ground to Overhead Press', reps:15 },
        { name:'Plank Step-Outs', reps:15, per:'each side' },
      ] },
      blocks:[
        { name:'Superset 1', rounds:3, equipment:['Bench', '1 DB'], moves:[
          { name:'Single Arm Bent Over Row', reps:10, per:'each side', nts:'10-15lb DB', sw:'20lb DB' },
          { name:'Bench Lateral Step Over', reps:10, per:'each side', nts:'supported body weight', sw:'unsupported body weight' },
        ] },
        { name:'Superset 2', rounds:3, equipment:['2 DBs', '1 KB'], moves:[
          { name:'KB Deadlift', reps:8, nts:'30-40lbs', sw:'50-60lbs' },
          { name:'DB Reverse Fly', reps:12, nts:'3-5lb DBs', sw:'5-10lb DBs' },
        ] },
        { name:'Superset 3', rounds:3, equipment:['Cable Machine', '1 DB'], moves:[
          { name:'DB Plank Pull Through', reps:10, per:'each side', nts:'7.5-10lb DB', sw:'15-20lb DB' },
          { name:'Cable Cross Body Chop', reps:12, per:'each side', nts:'10-15lbs', sw:'20-25lbs' },
        ] },
        { name:'Superset 4', rounds:3, equipment:['1 DB', '1 KB', 'Mat'], moves:[
          { name:'KB Swings', reps:15, nts:'15-20lbs', sw:'25-30lbs' },
          { name:'DB Knee Tuck Sit-ups', reps:15, nts:'5-10lb DB', sw:'10-15lb DB' },
        ] },
      ],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as seated single leg stretch, thread the needle, cobra pose, scorpion twist' }
    },
    {
      id:'W3D1',
      week:3,
      day:1,
      kind:'strength',
      focus:'Upper Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      warmup:{ name:'Upper Body Warm-up', rounds:3, moves:[
        { name:'Elevated Shoulder Taps', reps:15, per:'each side' },
        { name:'Single DB Curl + Press', reps:15 },
        { name:'Band Pull Apart', reps:15 },
      ] },
      blocks:[
        { name:'Superset 1', rounds:3, equipment:['2 DBs', 'Bench'], moves:[
          { name:'DB Alternating Chest Press', reps:10, per:'each side', nts:'5-10lb DBs', sw:'15-20lb DBs' },
          { name:'Bench Leg Raises', reps:15 },
        ] },
        { name:'Superset 2', rounds:3, equipment:['2 DBs', 'Bench', 'Pull-Up Bar', 'Long Band'], moves:[
          { name:'Seated DB Shoulder Press', reps:10, nts:'5-10lb DBs', sw:'10-15lb DBs' },
          { name:'Band Assisted Pull-Ups', reps:8, repsMax:10, nts:'heavy band', sw:'medium band' },
        ] },
        { name:'Superset 3', rounds:3, equipment:['Cable Machine', 'Mat', 'Weight Plate'], moves:[
          { name:'Cable Single Arm Seated Row', reps:10, per:'each side', nts:'10-15lbs', sw:'20-25lbs' },
          { name:'Plate Race Car Drivers', reps:10, per:'each side', nts:'5-10lb plate', sw:'10-15lb plate' },
        ] },
        { name:'Superset 4', rounds:3, equipment:['1 DB', 'Cable Machine'], moves:[
          { name:'DB Tricep Kickback', reps:10, per:'each side', nts:'5-10lb DB', sw:'10-15lb DB' },
          { name:'Banded Bicep Curl', reps:20, nts:'light band', sw:'light band' },
        ] },
      ],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as child pose, crossbody shoulder stretch, side bends, wrist stretch' }
    },
    {
      id:'W3D2',
      week:3,
      day:2,
      kind:'pilates',
      focus:'Full Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      minutes:20,
      message:'Today we are going to do a 20 minute full body mat pilates workout together. This isn\'t just a workout—it\'s a reset for your body and your mind.',
      equipment:['Mat', 'Hand Weights', 'Ankle Weights'],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as child pose, crossbody shoulder stretch, side bends, wrist stretch' }
    },
    {
      id:'W3D3',
      week:3,
      day:3,
      kind:'strength',
      focus:'Lower Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      warmup:{ name:'Lower Body Warm-up', rounds:3, moves:[
        { name:'Banded Lateral Walk', reps:10, unit:'steps', per:'each way' },
        { name:'Weighted Hinge', reps:10 },
        { name:'Glute Bridge March', reps:10, per:'each side' },
      ] },
      blocks:[
        { name:'Superset 1', rounds:3, equipment:['Squat Rack', 'Barbell', 'Plates', '2 DBs'], moves:[
          { name:'Barbell Bench Squat', reps:10, nts:'35-45lbs (total)', sw:'55-65lbs (total)' },
          { name:'Deficit Curtsy Lunge', reps:8, per:'each side', nts:'body weight', sw:'10lb DBs' },
        ] },
        { name:'Superset 2', rounds:3, equipment:['Bench', '2 DBs'], moves:[
          { name:'Single Leg Elevated Glute Bridge', reps:10, per:'each side', nts:'body weight', sw:'10lb DB' },
          { name:'B-Stance DB RDL', reps:8, per:'each side', nts:'7.5-10lb DBs', sw:'15-20lb DBs' },
        ] },
        { name:'Superset 3', rounds:3, equipment:['Cable Machine', 'Band'], moves:[
          { name:'Cable Kickbacks', reps:10, per:'each side', nts:'10lbs', sw:'20lbs' },
          { name:'Bear Hold Abductions', reps:20, nts:'light band', sw:'medium band' },
        ] },
        { name:'Core Burnout', rounds:3, equipment:['Mat', 'Timer', '1 DB (optional)'], moves:[
          { name:'Leg Raises', reps:10, nts:'body weight', sw:'10lb DB' },
          { name:'Toe Reach Sit-Ups', reps:10, nts:'body weight', sw:'10lb DB' },
          { name:'Plank Hold', reps:30, unit:'seconds' },
        ] },
      ],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as Pigeon Pose, forward fold seated hamstring stretch, seated spinal twists, standing calf stretch' }
    },
    {
      id:'W3D4',
      week:3,
      day:4,
      kind:'pilates',
      focus:'Abs Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      minutes:10,
      message:'Today we are going to do a 10 minute ab focused mat pilates workout together. This one may have taken me out BUT I am still proud! On the hard days or even the easy days, it\'s not about being perfect, it\'s about showing up and doing what you can!',
      equipment:['Mat', 'Hand Weights', 'Ankle Weights', 'Resistance band'],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as child pose, crossbody shoulder stretch, side bends, wrist stretch' }
    },
    {
      id:'W3D5',
      week:3,
      day:5,
      kind:'strength',
      focus:'Full Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      warmup:{ name:'Full Body Warm-up', rounds:3, moves:[
        { name:'Lateral Skaters', reps:10, per:'each side' },
        { name:'Ground to Overhead Press', reps:15 },
        { name:'Plank Step-Outs', reps:15, per:'each side' },
      ] },
      blocks:[
        { name:'Superset 1', rounds:3, equipment:['Bench', '2 DBs'], moves:[
          { name:'Single Arm Plank Row', reps:10, per:'each side', nts:'7.5-12.5lb DB', sw:'10-15lb DB' },
          { name:'Bench Step-Ups', reps:8, per:'each side', nts:'supported body weight', sw:'unsupported body weight + 10lb DBs' },
        ] },
        { name:'Superset 2', rounds:3, equipment:['1 DB', '1 KB'], moves:[
          { name:'KB B-Stance Deadlift', reps:10, per:'each side', nts:'15-25lbs', sw:'30-40lbs' },
          { name:'Reverse Lunge to Shoulder Press', reps:6, per:'each side', nts:'5-10lb DB', sw:'10-15lb DB' },
        ] },
        { name:'Superset 3', rounds:3, equipment:['Cable Machine', '1 DB'], moves:[
          { name:'DB Side Bends', reps:10, per:'each side', nts:'5-10lb DB', sw:'10-15lb DB' },
          { name:'Cable Seated Row', reps:12, nts:'20-30lbs', sw:'35-45lbs' },
        ] },
        { name:'Superset 4', rounds:3, equipment:['1 DB', 'Mat'], moves:[
          { name:'Weighted Dead Bugs', reps:10, per:'each side', nts:'5-10lb DB', sw:'10-15lb DB' },
          { name:'Russian Twists', reps:12, per:'each side', nts:'5-10lb DB', sw:'10-15lb DB' },
        ] },
      ],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as seated single leg stretch, thread the needle, cobra pose, scorpion twist' }
    },
    {
      id:'W4D1',
      week:4,
      day:1,
      kind:'strength',
      focus:'Upper Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      warmup:{ name:'Upper Body Warm-up', rounds:3, moves:[
        { name:'Elevated Shoulder Taps', reps:15, per:'each side' },
        { name:'Single DB Curl + Press', reps:15 },
        { name:'Band Pull Apart', reps:15 },
      ] },
      blocks:[
        { name:'Superset 1', rounds:3, equipment:['2 DBs', 'Bench'], moves:[
          { name:'DB Alternating Chest Press', reps:8, per:'each side', nts:'7.5-12.5lb DBs', sw:'20lb DBs' },
          { name:'Bench Leg Raises', reps:15 },
        ] },
        { name:'Superset 2', rounds:3, equipment:['2 DBs', 'Bench', 'Pull-Up Bar', 'Long Band'], moves:[
          { name:'Seated DB Shoulder Press', reps:8, nts:'7.5-10lb DBs', sw:'15-20lb DBs' },
          { name:'Band Assisted Pull-Ups', reps:6, repsMax:8, nts:'medium band', sw:'light band' },
        ] },
        { name:'Superset 3', rounds:3, equipment:['Mat', '2 DBs'], moves:[
          { name:'Hand Release Push-Ups', reps:10, nts:'from kneeling plank', sw:'from full plank' },
          { name:'DB Around the Worlds', reps:12, nts:'2-3lb DBs', sw:'3-5lb DBs' },
        ] },
        { name:'Superset 4', rounds:3, equipment:['2 DBs', 'Cable Machine'], moves:[
          { name:'DB Bicep Curl', reps:15, nts:'5-10lb DBs', sw:'10-15lb DBs' },
          { name:'Cable Tricep Pulldown', reps:15, nts:'10-15lbs', sw:'15-20lbs' },
        ] },
      ],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as child pose, crossbody shoulder stretch, side bends, wrist stretch' }
    },
    {
      id:'W4D2',
      week:4,
      day:2,
      kind:'pilates',
      focus:'Full Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      minutes:20,
      message:'Today we are going to do a 20 minute full body focused mat pilates workout. You made it to your mat—that\'s a win already. Let\'s flow!',
      equipment:['Mat', 'Hand Weights', 'Ankle Weights'],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as child pose, crossbody shoulder stretch, side bends, wrist stretch' }
    },
    {
      id:'W4D3',
      week:4,
      day:3,
      kind:'strength',
      focus:'Lower Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      warmup:{ name:'Lower Body Warm-up', rounds:3, moves:[
        { name:'Banded Lateral Walk', reps:10, unit:'steps', per:'each way' },
        { name:'Weighted Hinge', reps:10 },
        { name:'Glute Bridge March', reps:10, per:'each side' },
      ] },
      blocks:[
        { name:'Superset 1', rounds:3, equipment:['Squat Rack', 'Barbell', 'Plates', '2 DBs'], moves:[
          { name:'Barbell Bench Squat', reps:8, nts:'35-55lbs (total)', sw:'65-85lbs (total)' },
          { name:'Deficit Curtsy Lunge', reps:6, per:'each side', nts:'5-10lb DBs', sw:'10-15lb DBs' },
        ] },
        { name:'Superset 2', rounds:3, equipment:['Bench', '2 DBs'], moves:[
          { name:'Single Leg Elevated Glute Bridge', reps:10, per:'each side', nts:'body weight', sw:'10lb DB' },
          { name:'B-Stance DB RDL', reps:6, per:'each side', nts:'10-12.5lb DBs', sw:'20lb DBs' },
        ] },
        { name:'Superset 3', rounds:3, equipment:['Cable Machine'], moves:[
          { name:'Cable Abductions', reps:10, per:'each side', nts:'10lbs', sw:'15-20lbs' },
          { name:'Plank Kickback', reps:10, per:'each side', nts:'from bench', sw:'from floor' },
        ] },
        { name:'Core Burnout', rounds:3, equipment:['Mat', '1 DB', 'Timer'], moves:[
          { name:'Alternating Scissor Kicks', reps:10, per:'each leg' },
          { name:'Weighted Sit-Ups', reps:10, nts:'body weight', sw:'10-15lb DB' },
          { name:'Plank Step Outs', reps:30, unit:'seconds' },
        ] },
      ],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as Pigeon Pose, forward fold seated hamstring stretch, seated spinal twists, standing calf stretch' }
    },
    {
      id:'W4D4',
      week:4,
      day:4,
      kind:'pilates',
      focus:'Arms Focus',
      walk:'Work on daily habit of hitting 10k steps or 2 miles.',
      minutes:10,
      message:'Today we are going to do a 10 minute arms focused mat pilates workout together. Every rep is a vote for your future self. YOU ARE HER!!! Keep going!',
      equipment:['Mat', 'Hand Weights', 'Ankle Weights'],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as child pose, crossbody shoulder stretch, side bends, wrist stretch' }
    },
    {
      id:'W4D5',
      week:4,
      day:5,
      kind:'strength',
      focus:'Full Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      warmup:{ name:'Full Body Warm-up', rounds:3, moves:[
        { name:'Lateral Skaters', reps:10, per:'each side' },
        { name:'Ground to Overhead Press', reps:15 },
        { name:'Plank Step-Outs', reps:15, per:'each side' },
      ] },
      blocks:[
        { name:'Superset 1', rounds:3, equipment:['Bench', '2 DBs'], moves:[
          { name:'Single Arm Plank Row', reps:8, per:'each side', nts:'10-15lb DB', sw:'15-20lb DB' },
          { name:'Bench Step-Ups', reps:8, per:'each side', nts:'supported body weight', sw:'no support + 10lb DBs' },
        ] },
        { name:'Superset 2', rounds:3, equipment:['1 DB', '1 KB', 'Bench'], moves:[
          { name:'KB B-Stance Deadlift', reps:8, per:'each side', nts:'20-30lbs', sw:'35-45lbs' },
          { name:'Reverse Lunge to Shoulder Press', reps:6, per:'each side', nts:'5-10lb DB', sw:'10-15lb DB' },
        ] },
        { name:'Superset 3', rounds:3, equipment:['Cable Machine', '1 DB'], moves:[
          { name:'Half Kneeling DB Curl to Press', reps:10, per:'each side', nts:'7.5-10lb DB', sw:'10-15lb DB' },
          { name:'Cable Pallof Press', reps:12, per:'each side', nts:'10-15lbs', sw:'15-20lbs' },
        ] },
        { name:'Superset 4', rounds:3, equipment:['1 DB', 'Mat', 'Band'], moves:[
          { name:'DB Snatch', reps:6, per:'each side', nts:'7.5-12.5lb DB', sw:'15-20lb DB' },
          { name:'Banded Bicycle Crunch', reps:12, per:'each side', nts:'light band', sw:'medium band' },
        ] },
      ],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as seated single leg stretch, thread the needle, cobra pose, scorpion twist' }
    },
    {
      id:'W5D1',
      week:5,
      day:1,
      kind:'strength',
      focus:'Upper Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      warmup:{ name:'Upper Body Warm-up', rounds:3, moves:[
        { name:'Elevated Shoulder Taps', reps:15, per:'each side' },
        { name:'Single DB Curl + Press', reps:15 },
        { name:'Band Pull Apart', reps:15 },
      ] },
      blocks:[
        { name:'Superset 1', rounds:3, equipment:['Barbell Rack', 'Barbell', 'Plates', 'Bench', '2 DBs'], moves:[
          { name:'Barbell Bench Press', reps:8, nts:'35-45lbs (total)', sw:'45-55lbs (total)' },
          { name:'Alternating Chest Fly', reps:10, per:'each side', nts:'5-10lb DBs', sw:'10-15lb DBs' },
        ] },
        { name:'Superset 2', rounds:3, equipment:['1 DB', 'Barbell', 'Squat Rack'], moves:[
          { name:'Single Arm Push Press', reps:10, per:'each side', nts:'5-10lb DB', sw:'10-15lb DBs' },
          { name:'Elevated Push-Ups', reps:15 },
        ] },
        { name:'Superset 3', rounds:3, equipment:['Mat', '2 DBs'], moves:[
          { name:'Front Raise to Lateral Raise', reps:10, per:'of each', nts:'3-5lb DBs', sw:'7.5-10lb DBs' },
          { name:'Forearm Plank Reach', reps:10, per:'each side', nts:'from bench', sw:'from floor' },
        ] },
        { name:'Superset 4', rounds:3, equipment:['2 DBs', 'Bench', 'Mat'], moves:[
          { name:'Alternating DB Bicep Curl', reps:10, per:'each side', nts:'5-10lb DBs', sw:'10-15lb DBs' },
          { name:'DB Skull Crushers', reps:15, nts:'5-10lb DBs', sw:'10-15lb DBs' },
        ] },
      ],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as child pose, crossbody shoulder stretch, side bends, wrist stretch' }
    },
    {
      id:'W5D2',
      week:5,
      day:2,
      kind:'pilates',
      focus:'Obliques Focus',
      walk:'Work on daily habit of hitting 10k steps or 2 miles.',
      minutes:10,
      message:'Today we are going to do a 10 minute oblique focused mat pilates workout together. Tiny movements, total transformation. Let\'s go bestie! You are doing GREAT!',
      equipment:['Mat', 'Hand Weights', 'Ankle Weights'],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as child pose, crossbody shoulder stretch, side bends, wrist stretch' }
    },
    {
      id:'W5D3',
      week:5,
      day:3,
      kind:'strength',
      focus:'Lower Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      warmup:{ name:'Lower Body Warm-up', rounds:3, moves:[
        { name:'Banded Lateral Walk', reps:10, unit:'steps', per:'each way' },
        { name:'Weighted Hinge', reps:10 },
        { name:'Glute Bridge March', reps:10, per:'each side' },
      ] },
      blocks:[
        { name:'Superset 1', rounds:3, equipment:['Squat Rack', 'Barbell', 'Plates', '2 DBs'], moves:[
          { name:'Barbell Back Squat', reps:8, nts:'35-55lbs (total)', sw:'65-85lbs (total)' },
          { name:'Bulgarian Split Squat', reps:8, per:'each side', nts:'body weight', sw:'10-15lb DBs' },
        ] },
        { name:'Superset 2', rounds:3, equipment:['Barbell', 'Plates', 'Bench', '1 DB'], moves:[
          { name:'Barbell RDL', reps:10, nts:'35-45lbs (total)', sw:'50-60lbs (total)' },
          { name:'DB Hip Thrust', reps:20, note:'Last rep 10 sec hold', nts:'15-20lb DB', sw:'25-30lb DB' },
        ] },
        { name:'Superset 3', rounds:3, equipment:['Cable Machine', 'Band'], moves:[
          { name:'Cable Kickbacks', reps:10, per:'each side', nts:'10lbs', sw:'20lbs' },
          { name:'Bear Hold Abductions', reps:20, nts:'light band', sw:'medium band' },
        ] },
        { name:'Core Burnout', rounds:3, equipment:['Mat', 'Timer', '1 DB (optional)'], moves:[
          { name:'Leg Raises', reps:10, nts:'body weight', sw:'10lb DB' },
          { name:'Toe Reach Sit-Ups', reps:10, nts:'body weight', sw:'10lb DB' },
          { name:'Plank Hold', reps:30, unit:'seconds' },
        ] },
      ],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as Pigeon Pose, forward fold seated hamstring stretch, seated spinal twists, standing calf stretch' }
    },
    {
      id:'W5D4',
      week:5,
      day:4,
      kind:'pilates',
      focus:'Legs + Arms Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      minutes:20,
      message:'Today we are going to do a 20 minute legs & arms focused mat pilates workout together. You showed up—and that\'s the hardest part. Let\'s make it count.',
      equipment:['Mat', 'Hand Weights', 'Ankle Weights'],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as child pose, crossbody shoulder stretch, side bends, wrist stretch' }
    },
    {
      id:'W5D5',
      week:5,
      day:5,
      kind:'strength',
      focus:'Full Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      warmup:{ name:'Full Body Warm-up', rounds:3, moves:[
        { name:'Lateral Skaters', reps:10, per:'each side' },
        { name:'Ground to Overhead Press', reps:15 },
        { name:'Plank Step-Outs', reps:15, per:'each side' },
      ] },
      blocks:[
        { name:'Superset 1', rounds:3, equipment:['Barbell', 'Plates', 'Mat', '1 DB'], moves:[
          { name:'Barbell Bentover Row', reps:10, nts:'35-45lbs (total)', sw:'45-55lbs (total)' },
          { name:'Side Plank Reach Through', reps:12, per:'each side', nts:'body weight', sw:'3-7.5lb DB' },
        ] },
        { name:'Superset 2', rounds:3, equipment:['2 DBs', '1 KB'], moves:[
          { name:'KB Deadlift High Pull', reps:10, nts:'15-20lbs', sw:'25-35lbs' },
          { name:'DB Pullover', reps:12, nts:'10-15lbs', sw:'15-20lbs' },
        ] },
        { name:'Superset 3', rounds:3, equipment:['Cable Machine', '1 DB'], moves:[
          { name:'DB Plank Pull Through', reps:10, per:'each side', nts:'7.5-10lb DB', sw:'15-20lb DB' },
          { name:'Cable Cross Body Chop', reps:12, per:'each side', nts:'10-15lbs', sw:'20-25lbs' },
        ] },
        { name:'Superset 4', rounds:3, equipment:['1 KB', '1 DB', 'Mat'], moves:[
          { name:'KB Swings', reps:15, nts:'15-20lbs', sw:'25-30lbs' },
          { name:'DB Knee Tuck Sit-ups', reps:15, nts:'5-10lb DB', sw:'10-15lb DB' },
        ] },
      ],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as seated single leg stretch, thread the needle, cobra pose, scorpion twist' }
    },
    {
      id:'W6D1',
      week:6,
      day:1,
      kind:'strength',
      focus:'Upper Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      warmup:{ name:'Upper Body Warm-up', rounds:3, moves:[
        { name:'Elevated Shoulder Taps', reps:15, per:'each side' },
        { name:'Single DB Curl + Press', reps:15 },
        { name:'Band Pull Apart', reps:15 },
      ] },
      blocks:[
        { name:'Superset 1', rounds:3, equipment:['Barbell Rack', 'Barbell', 'Plates', 'Bench', '2 DBs'], moves:[
          { name:'Barbell Bench Press', reps:6, nts:'35-45lbs (total)', sw:'50-60lbs (total)' },
          { name:'Alternating Chest Fly', reps:8, per:'each side', nts:'5-10lb DBs', sw:'10-15lb DBs' },
        ] },
        { name:'Superset 2', rounds:3, equipment:['1 DB', 'Barbell', 'Squat Rack'], moves:[
          { name:'Single Arm Push Press', reps:8, per:'each side', nts:'5-10lb DB', sw:'10-15lb DB' },
          { name:'Elevated Push-Ups', reps:12 },
        ] },
        { name:'Superset 3', rounds:3, equipment:['Cable Machine', 'Mat', '2 DBs'], moves:[
          { name:'Cable Single Arm Seated Row', reps:10, per:'each side', nts:'10-15lbs', sw:'20-25lbs' },
          { name:'Plate Race Car Drivers', reps:10, per:'each side', nts:'5-10lbs', sw:'10-15lbs' },
        ] },
        { name:'Superset 4', rounds:3, equipment:['1 DB', 'Band'], moves:[
          { name:'DB Tricep Kickback', reps:10, per:'each side', nts:'5-10lb DB', sw:'10-15lb DB' },
          { name:'Banded Bicep Curl', reps:20, nts:'light band', sw:'light band' },
        ] },
      ],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as child pose, crossbody shoulder stretch, side bends, wrist stretch' }
    },
    {
      id:'W6D2',
      week:6,
      day:2,
      kind:'pilates',
      focus:'Full Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      minutes:30,
      message:'Today we are going to do a 30 minute full body focused mat pilates workout. Sore today, strong tomorrow. Let\'s keep going!',
      equipment:['Mat', 'Hand Weights', 'Ankle Weights'],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as child pose, crossbody shoulder stretch, side bends, wrist stretch' }
    },
    {
      id:'W6D3',
      week:6,
      day:3,
      kind:'strength',
      focus:'Lower Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      warmup:{ name:'Lower Body Warm-up', rounds:3, moves:[
        { name:'Banded Lateral Walk', reps:10, unit:'steps', per:'each way' },
        { name:'Weighted Hinge', reps:10 },
        { name:'Glute Bridge March', reps:10, per:'each side' },
      ] },
      blocks:[
        { name:'Superset 1', rounds:3, equipment:['Squat Rack', 'Barbell', 'Plates', '2 DBs'], moves:[
          { name:'Barbell Back Squat', reps:6, nts:'45-65lbs (total)', sw:'75-95lbs (total)' },
          { name:'Bulgarian Split Squat', reps:6, per:'each side', nts:'body weight + 5lbs', sw:'15-20lb DBs' },
        ] },
        { name:'Superset 2', rounds:3, equipment:['Barbell', 'Plates', 'Bench', '1 DB'], moves:[
          { name:'Barbell RDL', reps:8, nts:'35-50lbs (total)', sw:'55-70lbs (total)' },
          { name:'DB Hip Thrust', reps:20, note:'Last rep 10 sec hold', nts:'15-20lb DB', sw:'25-30lb DB' },
        ] },
        { name:'Superset 3', rounds:3, equipment:['Cable Machine'], moves:[
          { name:'Cable Abduction', reps:10, per:'each side', nts:'10lbs', sw:'15-20lbs' },
          { name:'Plank Kickback', reps:10, per:'each side', nts:'from a bench', sw:'from floor' },
        ] },
        { name:'Core Burnout', rounds:3, equipment:['Mat', 'Timer', '1 DB'], moves:[
          { name:'Alternating Scissor Kicks', reps:10, per:'each leg' },
          { name:'Weighted Sit-Ups', reps:10, nts:'body weight', sw:'10-15lb DB' },
          { name:'Plank Step Outs', reps:30, unit:'seconds' },
        ] },
      ],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as Pigeon Pose, forward fold seated hamstring stretch, seated spinal twists, standing calf stretch' }
    },
    {
      id:'W6D4',
      week:6,
      day:4,
      kind:'pilates',
      focus:'Full Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      minutes:20,
      message:'Today we are going to do a 20 minute full body focused mat pilates workout together. I cannot believe you are almost done with week 6! I am so proud of you and YOU should be so proud of yourself too.',
      equipment:['Mat', 'Hand Weights', 'Ankle Weights'],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as child pose, crossbody shoulder stretch, side bends, wrist stretch' }
    },
    {
      id:'W6D5',
      week:6,
      day:5,
      kind:'strength',
      focus:'Full Body Focus',
      walk:'Walking 10k steps, 2 miles, or showing up and doing what you can do!',
      warmup:{ name:'Full Body Warm-up', rounds:3, moves:[
        { name:'Lateral Skaters', reps:10, per:'each side' },
        { name:'Ground to Overhead Press', reps:15 },
        { name:'Plank Step-Outs', reps:15, per:'each side' },
      ] },
      blocks:[
        { name:'Superset 1', rounds:3, equipment:['Barbell', 'Plates', 'Mat', '1 DB'], moves:[
          { name:'Barbell Bentover Row', reps:8, nts:'35-55lbs (total)', sw:'50-65lbs (total)' },
          { name:'Side Plank Reach Through', reps:12, per:'each side', nts:'body weight', sw:'3-7.5lb DB' },
        ] },
        { name:'Superset 2', rounds:3, equipment:['1 DB', '1 KB'], moves:[
          { name:'KB Deadlift High Pull', reps:8, nts:'15-25lbs', sw:'30-35lbs' },
          { name:'DB Pullover', reps:12, nts:'10-15lb DB', sw:'15-20lb DB' },
        ] },
        { name:'Superset 3', rounds:3, equipment:['Cable Machine', '1 DB'], moves:[
          { name:'DB Side Bends', reps:10, per:'each side', nts:'5-10lb DB', sw:'10-15lb DB' },
          { name:'Cable Seated Row', reps:12, nts:'20-30lbs', sw:'35-45lbs' },
        ] },
        { name:'Superset 4', rounds:3, equipment:['1 DB', 'Mat'], moves:[
          { name:'Weighted Dead Bugs', reps:10, per:'each side', nts:'5-10lb DB', sw:'10-15lb DB' },
          { name:'Russian Twists', reps:12, per:'each side', nts:'5-10lb DB', sw:'10-15lb DB' },
        ] },
      ],
      cooldown:{ minutes:'3-5', text:'Static Stretching such as seated single leg stretch, thread the needle, cobra pose, scorpion twist' }
    },
  ]
};
