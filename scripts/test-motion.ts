import { EXERCISES } from '../src/domain/exercises.generated';
import {
  blendPose,
  distance,
  GROUND,
  loadKindFor,
  lerpAngle,
  repProgress,
  sampleMotion,
  REP_MS,
  SEG,
  solve,
  solveSide,
  templateIdFor,
  TEMPLATES,
  VIEW,
  type MotionId,
  type Pose,
  type SidePose,
} from '../src/domain/motion';
import { figureShapes, sideBoneLengths } from '../src/domain/motionShapes';
import { getExerciseDemonstration } from '../src/domain/exerciseDemonstration';
import { EXERCISE_MOTION_SPECS, getExerciseMotion } from '../src/domain/exerciseMotions';
import guides from '../data/exercise-guides.json';

let failed = 0;

function assert(cond: boolean, label: string) {
  if (cond) {
    console.log(`OK   ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL ${label}`);
  }
}

const STEPS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const near = (a: number, b: number, tol = 0.05) => Math.abs(a - b) <= tol;

// --- every template is well formed and physically consistent ---
for (const [id, t] of Object.entries(TEMPLATES)) {
  const a = t.a as Pose;
  const b = t.b as Pose;
  const sameShape =
    a.view === b.view &&
    a.view === t.view &&
    JSON.stringify(Object.keys(a).sort()) === JSON.stringify(Object.keys(b).sort()) &&
    (a.view !== 'side' || (a as SidePose).anchor === (b as SidePose).anchor);
  assert(sameShape, `${id}: poses A and B share a view, anchor and fields`);
  if (!sameShape) continue;

  let bonesOk = true;
  let inFrame = true;
  let aboveGround = true;
  let planted = true;
  for (const step of STEPS) {
    const pose = blendPose(a, b, step);
    const s = solve(pose);
    const pts =
      s.view === 'side'
        ? [s.head, s.shoulder, s.elbow, s.wrist, s.handTip, s.hip, s.knee, s.ankle, s.toe, ...(s.rear ? [s.rear.knee, s.rear.ankle, s.rear.toe] : [])]
        : [s.head, ...s.shoulders, ...s.elbows, ...s.wrists, ...s.hips, ...s.knees, ...s.ankles];
    for (const p of pts) {
      if (p.x < 2 || p.x > VIEW.width - 2 || p.y < 2 || p.y > VIEW.height - 2) inFrame = false;
      if (p.y > GROUND + 3) aboveGround = false;
    }
    if (s.view === 'side') {
      const len = sideBoneLengths(s);
      for (const bone of ['shin', 'thigh', 'torso', 'upperArm', 'forearm'] as const) {
        if (!near(len[bone], SEG[bone])) bonesOk = false;
      }
      const p = pose as SidePose;
      if (p.anchor === 'ankle' && distance(s.ankle, p.at) > 0.01) planted = false;
      if (p.anchor === 'toe' && distance(s.toe, p.at) > 0.01) planted = false;
      if (p.feet && distance(s.ankle, p.feet.at) > 1.5) planted = false;
      if (p.hands?.frame === 'world' && distance(s.wrist, p.hands.at) > 1.5) planted = false;
    } else {
      for (let i = 0; i < 2; i++) {
        if (!near(distance(s.shoulders[i], s.elbows[i]), SEG.upperArm) || !near(distance(s.elbows[i], s.wrists[i]), SEG.forearm)) bonesOk = false;
      }
    }
  }
  assert(bonesOk, `${id}: no limb stretches or shrinks through the motion`);
  assert(planted, `${id}: anchored and planted points stay put`);
  assert(inFrame, `${id}: the figure stays inside the frame`);
  assert(aboveGround, `${id}: nothing sinks below the floor`);
}

// --- candidate geometry only; this does not authorize user-facing figures ---
{
  const unknown = EXERCISES.filter((e) => !(templateIdFor(e) in TEMPLATES));
  assert(unknown.length === 0, `all ${EXERCISES.length} exercises map to a template`);

  const dark = EXERCISES.filter((e) => {
    const t = TEMPLATES[templateIdFor(e)];
    const shapes = figureShapes(t, solve(t.b as Pose), { primary: e.primary_muscles, secondary: e.secondary_muscles }, loadKindFor(e.equipment));
    return !shapes.some((s) => s.role === 'primary');
  });
  assert(dark.length === 0, `every exercise highlights a primary muscle on the figure${dark.length ? ` (missing: ${dark.slice(0, 5).map((e) => e.name).join(', ')})` : ''}`);

}

// --- name rules: regressions caught during review ---
{
  const cases: [string, MotionId][] = [
    ['Snatch Deadlift', 'hinge'],
    ['Clean Deadlift', 'hinge'],
    ['Calf-Machine Shoulder Shrug', 'shrug'],
    ['Upright Cable Row', 'upright_row'],
    ['Jerk Dip Squat', 'squat'],
    ['Front Squat (Clean Grip)', 'squat'],
    ['Hanging Bar Good Morning', 'hinge'],
    ['Barbell Deadlift', 'hinge'],
    ['Barbell Incline Bench Press - Medium Grip', 'incline_press'],
    ['Decline Dumbbell Bench Press', 'decline_press'],
    ['Seated Barbell Military Press', 'seated_press'],
    ['Power Clean', 'clean'],
    ['Muscle Snatch', 'snatch'],
    ['Barbell Hip Thrust', 'hip_thrust'],
    ['Barbell Glute Bridge', 'bridge'],
    ['Narrow Stance Leg Press', 'leg_press'],
    ['Bent Over Barbell Row', 'row'],
    ['Seated One-arm Cable Pulley Rows', 'seated_row'],
    ['V-Bar Pulldown', 'pulldown'],
    ['Barbell Shrug', 'shrug'],
    ['Standing Dumbbell Upright Row', 'upright_row'],
    ['Palms-Up Barbell Wrist Curl Over A Bench', 'wrist_curl'],
    ['Barbell Curl', 'curl'],
    ['Seated Close-Grip Concentration Barbell Curl', 'seated_curl'],
    ['Standing Cable Wood Chop', 'rotation'],
    ['Bent-Arm Dumbbell Pullover', 'pullover'],
  ];
  for (const [name, expected] of cases) {
    const ex = EXERCISES.find((e) => e.name === name);
    assert(Boolean(ex) && templateIdFor(ex!) === expected, `${name} → ${expected}${ex ? '' : ' (not in catalog)'}`);
  }
}

// --- every exercise remains an articulated animation, with an exact source mapping ---
{
  assert(Object.keys(EXERCISE_MOTION_SPECS).length === EXERCISES.length, 'each catalog exercise has an explicit motion specification');
  for (const exercise of EXERCISES) {
    const demo = getExerciseDemonstration(exercise.id);
    const spec = EXERCISE_MOTION_SPECS[exercise.id];
    assert(demo.kind === 'motion', `${exercise.name}: animated figure, never a photo substitution`);
    assert(spec.sourceId === (guides as Record<string, { sourceId: string }>)[exercise.id].sourceId,
      `${exercise.name}: exact source identity`);
    const t = getExerciseMotion(exercise.id)!;
    let geometry = true;
    let contacts = true;
    for (let i = 0; i <= 20; i++) {
      for (const alternate of [false, true]) {
        const pose = sampleMotion(t, i / 20, alternate);
        const skeleton = solve(pose);
        const shapes = figureShapes(t, skeleton, { primary: exercise.primary_muscles, secondary: exercise.secondary_muscles }, loadKindFor(exercise.equipment));
        const points = shapes.flatMap(shape => shape.kind === 'line' ? [shape.a, shape.b] : shape.kind === 'circle' ? [shape.c] : shape.points);
        if (points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) geometry = false;
        if (skeleton.view === 'side' && pose.view === 'side') {
          for (const [bone, length] of Object.entries(sideBoneLengths(skeleton))) {
            if (!near(length, SEG[bone as keyof typeof SEG])) geometry = false;
          }
          if (pose.feet && distance(skeleton.ankle, pose.feet.at) > 1.5) contacts = false;
          if (pose.hands?.frame === 'world' && distance(skeleton.wrist, pose.hands.at) > 1.5) contacts = false;
        } else if (skeleton.view === 'front') {
          for (let arm = 0; arm < 2; arm++) {
            if (!near(Math.hypot(distance(skeleton.shoulders[arm], skeleton.elbows[arm]), skeleton.armDepths?.upper ?? 0), SEG.upperArm)) geometry = false;
            if (!near(Math.hypot(distance(skeleton.elbows[arm], skeleton.wrists[arm]), skeleton.armDepths?.forearm ?? 0), SEG.forearm)) geometry = false;
          }
        }
      }
    }
    assert(geometry, `${exercise.name}: finite geometry and constant bone lengths throughout both limb phases`);
    assert(contacts, `${exercise.name}: supported hands and feet remain reachable`);
  }
  assert(getExerciseDemonstration('unrecognized-id').kind === 'unavailable', 'unknown exercise never gets a guessed figure');
}

// --- regressions tied to the action and setup described in the source ---
{
  const motion = (name: string) => getExerciseMotion(EXERCISES.find(e => e.name === name)!.id)!;
  const at = (name: string, progress: number) => solve(sampleMotion(motion(name), progress));
  const asSide = (name: string, progress: number) => {
    const skeleton = at(name, progress);
    if (skeleton.view !== 'side') throw new Error('Expected side view: ' + name);
    return skeleton;
  };
  for (const name of ['Snatch Deadlift', 'Clean Deadlift']) {
    const end = asSide(name, 1);
    assert(end.wrist.y > end.shoulder.y + 35, `${name}: deadlift ends with bar down, without a catch or overhead lift`);
  }
  const dipA = asSide('Bench Dips', 0), dipB = asSide('Bench Dips', 1);
  assert(distance(dipA.wrist, dipB.wrist) < 0.1 && distance(dipA.ankle, dipB.ankle) < 0.1,
    'bench dips: hands and supported feet stay fixed as body lowers');
  assert(dipB.wrist.x < dipB.hip.x && dipB.ankle.x > dipB.hip.x + 40,
    'bench dips: hands behind body, legs forward rather than suspended');
  const kickA = asSide('Glute Kickback', 0), kickB = asSide('Glute Kickback', 1);
  assert(distance(kickA.wrist, kickB.wrist) < 0.1 && Math.abs(kickB.rear!.knee.y - GROUND) < 1,
    'quadruped kickback: hands and non-working knee supported on floor');
  assert(kickB.ankle.y < kickA.ankle.y - 50, 'quadruped kickback: bent working leg rises behind torso');
  const hamA = asSide('Glute Ham Raise', 0), hamB = asSide('Glute Ham Raise', 1);
  assert(distance(hamA.knee, hamB.knee) < 0.1 && distance(hamA.ankle, hamB.ankle) < 0.1 && hamB.head.y < hamA.head.y - 70,
    'glute-ham raise: body rises over fixed knees and lower legs, not a leg curl');
  const sit = asSide('Press Sit-Up', 1);
  assert(sit.head.y < asSide('Press Sit-Up', 0).head.y - 25 && sit.wrist.y < sit.shoulder.y - 40,
    'press sit-up: combines sitting up with an overhead press');
  const calfA = asSide('Seated Calf Raise', 0), calfB = asSide('Seated Calf Raise', 1);
  assert(distance(calfA.hip, calfB.hip) < 0.1 && distance(calfA.toe, calfB.toe) < 0.5 && calfB.ankle.y < calfA.ankle.y - 5,
    'seated calf raise: hips stay seated and toes stay planted as heels rise');
  const shoulderA = asSide('Barbell Incline Shoulder Raise', 0), shoulderB = asSide('Barbell Incline Shoulder Raise', 1);
  assert(distance(shoulderA.hip, shoulderB.hip) < 0.1 && distance(shoulderA.shoulder, shoulderB.shoulder) < 0.1 && distance(shoulderA.armShoulder!, shoulderB.armShoulder!) > 5,
    'incline shoulder raise: scapular movement rather than a whole-body lift or elbow press');
  const fingerA = asSide('Finger Curls', 0), fingerB = asSide('Finger Curls', 1);
  assert(distance(fingerA.wrist, fingerB.wrist) < 0.1 && distance(fingerA.fingers!.palm, fingerB.fingers!.palm) < 0.1 && distance(fingerA.handTip, fingerB.handTip) > 5,
    'finger curls: fingers close around the load without bending the wrist');
  for (const name of ['Isometric Neck Exercise - Front And Back', 'Isometric Neck Exercise - Sides']) {
    assert(distance(at(name, 0).head, at(name, 1).head) === 0 && Boolean(motion(name).isometric),
      `${name}: head holds still against resistance`);
  }
  assert((motion('Clean and Press').keyframes?.length ?? 0) >= 3, 'clean-and-press includes a shoulder catch before overhead lockout');
  assert((motion('Cuban Press').keyframes?.length ?? 0) >= 3, 'Cuban press includes rotation before pressing');
  assert(motion('Around The Worlds').camera === 'overhead' && motion('Around The Worlds').scenery.length > 0,
    'around-the-world uses a lying bench setup viewed from above');
  const highA = at('High Cable Curls', 0), highB = at('High Cable Curls', 1);
  assert(highA.view === 'front' && highB.view === 'front' && distance(highA.elbows[0], highB.elbows[0]) < 0.1,
    'high cable curl: raised upper arms stay stationary');
  const flutterA = asSide('Flutter Kicks', 0), flutterB = asSide('Flutter Kicks', 1);
  assert(flutterA.ankle.y > flutterA.rear!.ankle.y + 20 && flutterB.ankle.y < flutterB.rear!.ankle.y - 20,
    'flutter kicks: legs alternate rather than rising together');
  const uprightA = at('Upright Cable Row', 0), uprightB = at('Upright Cable Row', 1);
  assert(uprightA.view === 'front' && uprightB.view === 'front' && distance(uprightA.hips[0], uprightB.hips[0]) < 0.1 && uprightB.wrists[0].y < uprightA.wrists[0].y - 40,
    'upright cable row: standing vertical pull, not a seated row');
}

// --- angular wrap and load attachment regressions ---
{
  assert(near(lerpAngle(172, -55, 0.5), 238.5), 'skull crusher takes the short arc past the head, not across the torso');
  assert(near(lerpAngle(350, 10, 0.5), 360), 'angles cross zero by the short path');
  const t = TEMPLATES.wrist_curl;
  const positions = [0, 0.5, 1].map(progress => {
    const skeleton = solve(blendPose(t.a, t.b, progress));
    if (skeleton.view !== 'side') throw new Error('Expected side view');
    const load = figureShapes(t, skeleton, { primary: [], secondary: [] }, 'dumbbell').find(s => s.role === 'load');
    if (!load || load.kind !== 'line') throw new Error('Expected dumbbell');
    const center = { x: (load.a.x + load.b.x) / 2, y: (load.a.y + load.b.y) / 2 };
    assert(distance(center, skeleton.handTip) < 0.01, `wrist curl ${progress}: resistance follows the moving hand`);
    return center;
  });
  assert(distance(positions[0], positions[2]) > 5, 'wrist-curl weight moves with the hand rather than remaining fixed');
}

// --- rep timeline ---
{
  assert(repProgress(0) === 0, 'a rep starts in pose A');
  assert(repProgress(REP_MS * 0.55) === 1, 'it holds pose B after the lift');
  assert(repProgress(REP_MS * 0.999) < 0.01, 'it returns to pose A by the end');
  assert(repProgress(REP_MS * 1.3) === repProgress(REP_MS * 0.3), 'reps repeat');
  let monotonic = true;
  for (let f = 0.12; f < 0.48; f += 0.01) if (repProgress(REP_MS * (f + 0.01)) < repProgress(REP_MS * f)) monotonic = false;
  assert(monotonic, 'the lift moves one way, without jitter');
  const lift = 0.36 * REP_MS;
  const lower = (1 - 0.12 - 0.36 - 0.12) * REP_MS;
  assert(lower > lift, 'lowering is slower than lifting');
}

// --- equipment drawn in hand ---
{
  assert(loadKindFor(['cable', 'machine']) === 'cable', 'cable wins over the machine it hangs on');
  assert(loadKindFor(['barbell']) === 'barbell', 'barbell');
  assert(loadKindFor(['bodyweight']) === 'none', 'bodyweight draws nothing in hand');
  const s = solveSide({ view: 'side', anchor: 'ankle', at: { x: 95, y: 172 }, torso: 180, thigh: 0, shin: 0 });
  assert(near(s.head.y, 172 - SEG.shin - SEG.thigh - SEG.torso - SEG.neck - SEG.head), 'a standing figure stacks its segments vertically');
}

if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}

console.log('\nAll motion tests passed');
