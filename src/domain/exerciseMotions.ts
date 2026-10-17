/** Exercise-specific variants of the original articulated figure. No photo demos. */
import specs from '../../data/exercise-motions.json';
import { solve, TEMPLATES, type FrontPose, type MotionId, type MotionTemplate, type Pose, type Scenery, type SidePose } from './motion';

const side = (p: Partial<SidePose> = {}): SidePose => ({ view: 'side', anchor: 'ankle', at: { x: 95, y: 172 }, torso: 180, thigh: 0, shin: 0, upperArm: 0, forearm: 0, ...p });
const front = (p: Partial<FrontPose> = {}): FrontPose => ({ view: 'front', hands: [{ x: 76, y: 100 }, { x: 124, y: 100 }], ...p });
const bench = (x: number, y: number, w: number, h = 7): Scenery => ({ kind: 'bench', points: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }] });
const pair = (id: string, a: Pose, b: Pose, extra: Partial<MotionTemplate> = {}): MotionTemplate => ({ id, view: a.view, a, b, scenery: [], load: 'hands', ...extra });
const map = (t: MotionTemplate, edit: (p: Pose, end: boolean) => Pose, extra: Partial<MotionTemplate> = {}): MotionTemplate => ({ ...t, a: edit(t.a, false), b: edit(t.b, true), ...extra });
const editSide = (p: Pose, extra: Partial<SidePose>): Pose => p.view === 'side' ? { ...p, ...extra } : p;
const worldHands = (p: Pose): Pose => {
  const skeleton = solve(p);
  return p.view === 'side' && skeleton.view === 'side'
    ? { ...p, hands: { at: skeleton.wrist, frame: 'world', bend: p.hands?.bend ?? 1 } }
    : p;
};

const benchDip = () => pair('bench_dip',
  side({ anchor: 'hip', at: { x: 87, y: 129 }, feet: { at: { x: 145, y: 168 }, bend: -1 }, hands: { at: { x: 60, y: 120 }, frame: 'world', bend: 1 } }),
  side({ anchor: 'hip', at: { x: 77, y: 152 }, feet: { at: { x: 145, y: 168 }, bend: -1 }, hands: { at: { x: 60, y: 120 }, frame: 'world', bend: 1 } }),
  { load: 'none', scenery: [bench(35, 123, 40), bench(139, 171, 30)] });
const quadruped = () => pair('quadruped_kickback',
  side({ anchor: 'hip', at: { x: 95, y: 140 }, torso: 110, thigh: 0, shin: -90, rear: { thigh: 0, shin: -90 }, foot: 90, hands: { at: { x: 145, y: 172 }, frame: 'world', bend: 1 } }),
  side({ anchor: 'hip', at: { x: 95, y: 140 }, torso: 110, thigh: -90, shin: -180, rear: { thigh: 0, shin: -90 }, foot: 90, hands: { at: { x: 145, y: 172 }, frame: 'world', bend: 1 } }),
  { load: 'none', alternating: true });
const gluteHam = () => pair('glute_ham_raise',
  side({ anchor: 'knee', at: { x: 120, y: 130 }, thigh: 90, shin: 90, torso: 270, hands: { at: { x: 10, y: 6 }, frame: 'torso', bend: -1 } }),
  side({ anchor: 'knee', at: { x: 120, y: 130 }, thigh: 0, shin: 90, torso: 180, hands: { at: { x: 10, y: 6 }, frame: 'torso', bend: -1 } }),
  { load: 'none', scenery: [{ kind: 'pad', at: { x: 120, y: 136 }, r: 9 }, { kind: 'bar', from: { x: 160, y: 115 }, to: { x: 160, y: 146 } }] });
const floorPress = () => pair('floor_press',
  side({ anchor: 'hip', at: { x: 112, y: 164 }, torso: 270, feet: { at: { x: 150, y: 172 }, bend: -1 }, upperArm: 172, forearm: 172 }),
  side({ anchor: 'hip', at: { x: 112, y: 164 }, torso: 270, feet: { at: { x: 150, y: 172 }, bend: -1 }, upperArm: 90, forearm: 180 }));
const seatedCalf = () => pair('seated_calf_raise',
  side({ anchor: 'hip', at: { x: 92, y: 140 }, feet: { at: { x: 128, y: 172 }, bend: -1 }, foot: 90, upperArm: 20, forearm: 90 }),
  side({ anchor: 'hip', at: { x: 92, y: 140 }, feet: { at: { x: 130.825, y: 164.64 }, bend: -1 }, foot: 48, upperArm: 20, forearm: 90 }),
  { load: 'thighs', scenery: [bench(72, 146, 36), bench(136, 175, 20)] });
const pressSitUp = () => pair('press_sit_up',
  side({ anchor: 'hip', at: { x: 112, y: 128 }, torso: 270, feet: { at: { x: 150, y: 172 }, bend: -1 }, hands: { at: { x: 5, y: -10 }, frame: 'shoulder', bend: 1 } }),
  side({ anchor: 'hip', at: { x: 112, y: 128 }, torso: 190, feet: { at: { x: 150, y: 172 }, bend: -1 }, hands: { at: { x: 3, y: -48 }, frame: 'shoulder', bend: 1 } }),
  { scenery: [bench(40, 135, 90)] });
const highCurl = () => pair('high_cable_curl',
  front({ hands: [{ x: 32, y: 50 }, { x: 168, y: 50 }], elbows: [{ x: 56, y: 50 }, { x: 144, y: 50 }] }),
  front({ hands: [{ x: 78, y: 38 }, { x: 122, y: 38 }], elbows: [{ x: 56, y: 50 }, { x: 144, y: 50 }] }),
  { pulleys: [{ x: 15, y: 34 }, { x: 185, y: 34 }] });
const lyingCurl = (prone = false) => pair(prone ? 'prone_curl' : 'lying_curl',
  side({ anchor: 'hip', at: { x: 112, y: prone ? 124 : 164 }, torso: prone ? 235 : 270, feet: { at: { x: 150, y: 172 }, bend: -1 }, upperArm: prone ? 0 : 92, forearm: prone ? 0 : 92 }),
  side({ anchor: 'hip', at: { x: 112, y: prone ? 124 : 164 }, torso: prone ? 235 : 270, feet: { at: { x: 150, y: 172 }, bend: -1 }, upperArm: prone ? 0 : 92, forearm: prone ? 155 : 185 }),
  { scenery: prone ? [{ kind: 'bench', points: [{ x: 50, y: 96 }, { x: 60, y: 90 }, { x: 120, y: 132 }, { x: 112, y: 139 }] }] : [], pulley: { x: 192, y: 166 } });
const frontMachine = (adduction: boolean) => pair(adduction ? 'seated_adduction' : 'seated_abduction',
  front({ seated: true, legSpread: adduction ? 24 : 0, hands: [{ x: 78, y: 117 }, { x: 122, y: 117 }] }),
  front({ seated: true, legSpread: adduction ? 0 : 24, hands: [{ x: 78, y: 117 }, { x: 122, y: 117 }] }),
  { load: 'knees', scenery: [bench(73, 133, 54)] });
const stepUp = () => {
  const a = side({ at: { x: 80, y: 172 }, rear: { thigh: 0, shin: 0 } });
  const mid = side({ at: { x: 110, y: 148 }, thigh: 70, shin: -30, rear: { thigh: 0, shin: 0 } });
  const b = side({ at: { x: 110, y: 148 }, rear: { thigh: 110, shin: 0 } });
  return pair('step_up_knee_raise', a, b, { load: 'none', keyframes: [a, mid, b], scenery: [bench(100, 151, 38, 26)] });
};
const windmill = (press: boolean) => {
  const a = front({ hands: [{ x: 75, y: 100 }, { x: 120, y: press ? 50 : 3 }], sideBend: 0, hipDrop: 3 });
  const middle = front({ hands: [{ x: 55, y: 171 }, { x: 54, y: 42 }], sideBend: -70, hipDrop: 20 });
  const b = front({ hands: [{ x: 75, y: 100 }, { x: 118, y: 2 }], sideBend: 0, hipDrop: 3 });
  if (press) return pair('bent_press', a, b, { keyframes: [a, middle, b], handLoad: 'far' });
  return pair('windmill', { ...a, overheadArm: 1 }, { ...middle, sideBend: -90, hipDrop: 0, overheadArm: 1 }, { handLoad: 'both' });
};
const twist = (lift = false) => pair(lift ? 'cable_lift' : 'wood_chop',
  front({ hands: lift ? [{ x: 55, y: 118 }, { x: 65, y: 118 }] : [{ x: 138, y: 30 }, { x: 148, y: 30 }], torsoTwist: lift ? -40 : 40 }),
  front({ hands: lift ? [{ x: 137, y: 28 }, { x: 147, y: 28 }] : [{ x: 54, y: 118 }, { x: 64, y: 118 }], torsoTwist: lift ? 40 : -40 }),
  { pulley: lift ? { x: 15, y: 170 } : { x: 185, y: 15 } });
const kneelingSquat = (jump = false) => {
  const a = side({ anchor: 'knee', at: { x: 100, y: 172 }, thigh: 135, shin: -90, torso: 175, hands: { at: { x: -5, y: -2 }, frame: 'shoulder', bend: 1 }, foot: 90 });
  const b = side({ anchor: 'knee', at: { x: 100, y: jump ? 135 : 172 }, thigh: 180, shin: jump ? 0 : -90, torso: 180, hands: { at: { x: -5, y: -2 }, frame: 'shoulder', bend: 1 }, foot: 90 });
  // Hip must sit above a planted knee: hip->knee points down, not up.
  a.thigh = 75; b.thigh = jump ? 30 : 0;
  return pair(jump ? 'kneeling_jump' : 'kneeling_squat', a, b, { load: 'shoulders' });
};
const rollout = (benchSupported: boolean, plank = false) => {
  if (plank) return pair('plank_hip_rollout',
    side({ anchor: 'toe', at: { x: 28, y: 176 }, foot: 17, shin: -65, thigh: -65, torso: 115, hands: { at: { x: 130, y: 165 }, frame: 'world', bend: 1 } }),
    side({ anchor: 'toe', at: { x: 28, y: 176 }, foot: 17, shin: -35, thigh: -35, torso: 65, hands: { at: { x: 104, y: 165 }, frame: 'world', bend: 1 } }));
  const t = TEMPLATES.rollout;
  return map(t, (p, end) => editSide(p, { at: { x: 40, y: benchSupported ? 147 : 172 }, ...(benchSupported ? { torso: 70, hands: { at: { x: end ? 180 : 120, y: 165 }, frame: 'world' as const, bend: 1 as const } } : {}) }),
    { id: benchSupported ? 'bench_rollout' : 'kneeling_rollout', scenery: benchSupported ? [bench(25, 153, 66, 24)] : [] });
};
const isometricNeck = (sides: boolean) => {
  const pose = front({ hands: sides ? [{ x: 88, y: 28 }, { x: 124, y: 100 }] : [{ x: 96, y: 25 }, { x: 104, y: 25 }], headTilt: 0 });
  return pair(sides ? 'neck_isometric_sides' : 'neck_isometric_front_back', pose, pose, { load: 'none', isometric: true });
};

export const VARIANTS = {
  standard: (t: MotionTemplate) => t,
  bench_dip: benchDip,
  quadruped_kickback: quadruped,
  glute_ham: gluteHam,
  floor_press: floorPress,
  seated_calf: seatedCalf,
  press_sit_up: pressSitUp,
  high_curl: highCurl,
  lying_curl: () => lyingCurl(false),
  prone_curl: () => pair('prone_incline_curl',
    side({ anchor: 'hip', at: { x: 80, y: 124 }, torso: 120, thigh: -47, shin: -47, foot: 90, upperArm: 0, forearm: 0 }),
    side({ anchor: 'hip', at: { x: 80, y: 124 }, torso: 120, thigh: -47, shin: -47, foot: 90, upperArm: 0, forearm: 160 }),
    { scenery: [{ kind: 'bench', points: [{ x: 74, y: 132 }, { x: 109, y: 112 }, { x: 116, y: 119 }, { x: 82, y: 139 }] }] }),
  prone_high_curl: () => pair('prone_high_bench_curl',
    side({ anchor: 'hip', at: { x: 80, y: 110 }, torso: 90, thigh: -90, shin: -90, foot: 90, upperArm: 0, forearm: 0 }),
    side({ anchor: 'hip', at: { x: 80, y: 110 }, torso: 90, thigh: -90, shin: -90, foot: 90, upperArm: 0, forearm: 160 }),
    { scenery: [bench(10, 117, 100)] }),
  seated_abductor: () => frontMachine(false),
  seated_adductor: () => frontMachine(true),
  step_up: stepUp,
  windmill: () => windmill(false),
  bent_press: () => windmill(true),
  wood_chop: () => twist(false),
  cable_lift: () => twist(true),
  kneeling_squat: () => kneelingSquat(false),
  kneeling_jump: () => kneelingSquat(true),
  bench_rollout: () => rollout(true),
  plank_rollout: () => rollout(false, true),
  neck_sides: () => isometricNeck(true),
  neck_front_back: () => isometricNeck(false),
  good_morning: (t: MotionTemplate) => map(t, (p, end) => editSide(p, { shin: end ? 0 : -5, thigh: end ? 0 : 25, torso: end ? 180 : 110, hands: { at: { x: -6, y: -2 }, frame: 'shoulder', bend: 1 } }), { load: 'shoulders' }),
  dumbbell_bench_squat: (t: MotionTemplate) => map(t, p => editSide(p, { hands: undefined, upperArm: 0, forearm: 0 }), { scenery: [bench(45, 145, 45)] }),
  bench_squat: (t: MotionTemplate) => ({ ...t, load: 'shoulders' as const, scenery: [bench(45, 145, 45)] }),
  hack_squat: (t: MotionTemplate) => map(t, p => editSide(p, { hands: undefined, upperArm: -40, forearm: -10 })),
  jefferson: (t: MotionTemplate) => map(t, p => editSide(p, { hands: undefined, upperArm: 0, forearm: 0 }), { handLoad: 'near' }),
  back_lunge: (t: MotionTemplate) => map(t, p => editSide(p, { hands: { at: { x: -6, y: -2 }, frame: 'shoulder', bend: 1 } }), { load: 'shoulders' }),
  elevated_lunge: (t: MotionTemplate) => map(t, p => editSide(p, { at: { x: 110, y: 160 }, hands: { at: { x: -6, y: -2 }, frame: 'shoulder', bend: 1 } }), { load: 'shoulders', scenery: [bench(100, 163, 40, 14)] }),
  incline_curl: (t: MotionTemplate) => map(t, p => editSide(p, { anchor: 'hip', at: { x: 92, y: 132 }, torso: 220, thigh: 75, shin: 0 }), { scenery: [bench(74, 138, 40)] }),
  seated_press: () => TEMPLATES.seated_press,
  incline_shoulder_raise: (t: MotionTemplate) => map(t, (p, end) => editSide(p, { hands: undefined, upperArm: 180, forearm: 180, scapularLift: end ? 6 : 0 })),
  anti_gravity: () => pair('anti_gravity_press',
    side({ anchor: 'hip', at: { x: 90, y: 124 }, torso: 120, thigh: -47, shin: -47, foot: 90, hands: { at: { x: 10, y: 10 }, frame: 'shoulder', bend: 1 } }),
    side({ anchor: 'hip', at: { x: 90, y: 124 }, torso: 120, thigh: -47, shin: -47, foot: 90, hands: { at: { x: 48, y: 0 }, frame: 'shoulder', bend: 1 } }),
    { scenery: [{ kind: 'bench', points: [{ x: 86, y: 132 }, { x: 128, y: 108 }, { x: 134, y: 115 }, { x: 94, y: 139 }] }] }),
  calf_press: () => map(TEMPLATES.leg_press, (p, end) => editSide(p, { feet: { at: { x: 118, y: 96 }, bend: -1 }, foot: end ? 50 : 95 }), { footplate: true, load: 'none' }),
  reverse_calf: (t: MotionTemplate) => map(t, (p, end) => editSide(p, { anchor: 'ankle', at: { x: 95, y: 166 }, foot: end ? 130 : 90 }), { load: 'shoulders' }),
  flutter: () => pair('prone_bench_flutter_kicks',
    side({ anchor: 'hip', at: { x: 106, y: 118 }, torso: 90, thigh: -90, shin: -90, rear: { thigh: -115, shin: -115 }, hands: { at: { x: 158, y: 145 }, frame: 'world', bend: 1 } }),
    side({ anchor: 'hip', at: { x: 106, y: 118 }, torso: 90, thigh: -115, shin: -115, rear: { thigh: -90, shin: -90 }, hands: { at: { x: 158, y: 145 }, frame: 'world', bend: 1 } }),
    { load: 'none', scenery: [bench(95, 125, 65)] }),
  knee_pull_in: () => pair('knee_pull_in',
    side({ anchor: 'hip', at: { x: 96, y: 150 }, torso: 260, thigh: 95, shin: 95, hands: { at: { x: 100, y: 153 }, frame: 'world', bend: 1 } }),
    side({ anchor: 'hip', at: { x: 96, y: 150 }, torso: 260, thigh: 160, shin: 45, hands: { at: { x: 100, y: 153 }, frame: 'world', bend: 1 } }), { load: 'none', scenery: [bench(40, 157, 65)] }),
  gorilla: () => map(TEMPLATES.hanging_leg_raise, (p, end) => editSide(p, { at: { x: 100, y: 30 }, upperArm: end ? 35 : 180, forearm: 180, thigh: end ? 140 : 0, shin: end ? 50 : -90 }), { id: 'chin_up_crunch' }),
  standing_kickback: (t: MotionTemplate) => ({ ...t, load: 'ankles' as const, pulley: { x: 175, y: 172 } }),
  band_adduction: () => pair('single_leg_band_adduction',
    front({ hipDrop: 8, ankles: [{ x: 60, y: 174 }, { x: 112, y: 174 }] }),
    front({ hipDrop: 8, ankles: [{ x: 120, y: 174 }, { x: 112, y: 174 }] }),
    { load: 'ankles', workingLeg: 0, pulley: { x: 15, y: 174 }, cue: 'Draw the working leg inward' }),
  monster_walk: () => pair('monster_walk',
    front({ hipDrop: 10, hipShift: -8, ankles: [{ x: 62, y: 174 }, { x: 122, y: 174 }] }),
    front({ hipDrop: 10, hipShift: 8, ankles: [{ x: 78, y: 174 }, { x: 138, y: 174 }] }),
    { load: 'ankles', keyframes: [front({ hipDrop: 10, hipShift: -8, ankles: [{ x: 62, y: 174 }, { x: 122, y: 174 }] }), front({ hipDrop: 10, hipShift: 0, ankles: [{ x: 62, y: 174 }, { x: 138, y: 174 }] }), front({ hipDrop: 10, hipShift: 8, ankles: [{ x: 78, y: 174 }, { x: 138, y: 174 }] })] }),
  bench_row: (t: MotionTemplate) => map(t, p => editSide(p, { at: { x: 95, y: 150 } }), { scenery: [bench(65, 153, 65, 24)] }),
  upright_cable: (t: MotionTemplate) => ({ ...t, pulley: { x: 100, y: 176 } }),
  machine_shrug: (t: MotionTemplate) => ({ ...t, load: 'shoulders' as const }),
  clean_press: () => {
    const a = TEMPLATES.clean.a;
    const rack = TEMPLATES.clean.b;
    const b = TEMPLATES.overhead_press.b;
    return pair('clean_and_press', a, b, { keyframes: [a, rack, b] });
  },
  cuban_press: () => pair('cuban_press',
    front({ hands: [{ x: 55, y: 76 }, { x: 145, y: 76 }] }),
    front({ hands: [{ x: 76, y: 3 }, { x: 124, y: 3 }] }),
    { keyframes: [front({ hands: [{ x: 55, y: 76 }, { x: 145, y: 76 }] }), front({ hands: [{ x: 55, y: 26 }, { x: 145, y: 26 }] }), front({ hands: [{ x: 76, y: 3 }, { x: 124, y: 3 }] })] }),
  fly_lying: () => pair('decline_fly',
    front({ armElevation: 0, armAzimuth: 5 }),
    front({ armElevation: 100, armAzimuth: 5 }),
    { camera: 'overhead', scenery: [bench(79, 14, 42, 115)] }),
  around_world: () => {
    const a = front({ hands: [{ x: 76, y: 100 }, { x: 124, y: 100 }] });
    const mid = front({ hands: [{ x: 33, y: 48 }, { x: 167, y: 48 }] });
    const b = front({ hands: [{ x: 76, y: 3 }, { x: 124, y: 3 }] });
    return pair('around_the_world', a, b, { keyframes: [a, mid, b], camera: 'overhead', scenery: [bench(79, 14, 42, 115)] });
  },
  russian_twist: () => pair('ball_russian_twist',
    side({ anchor: 'hip', at: { x: 112, y: 118 }, torso: 270, torsoRoll: -60, feet: { at: { x: 150, y: 172 }, bend: -1 }, upperArm: 135, forearm: 135 }),
    side({ anchor: 'hip', at: { x: 112, y: 118 }, torso: 270, torsoRoll: 60, feet: { at: { x: 150, y: 172 }, bend: -1 }, upperArm: 225, forearm: 225 }),
    { scenery: [{ kind: 'pad', at: { x: 74, y: 147 }, r: 23 }], pulley: { x: 15, y: 90 } }),
  rotation: () => twist(),
  wrist_rotation: () => pair('lying_forearm_rotation',
    side({ anchor: 'hip', at: { x: 110, y: 125 }, torso: 90, thigh: -90, shin: -90, upperArm: 0, forearm: 90, hand: 90, handRoll: 0 }),
    side({ anchor: 'hip', at: { x: 110, y: 125 }, torso: 90, thigh: -90, shin: -90, upperArm: 0, forearm: 90, hand: 90, handRoll: 90 }),
    { scenery: [bench(70, 134, 100)] }),
  finger_curl: (t: MotionTemplate) => map(t, (p, end) => editSide(p, { fingerCurl: end ? 1 : 0, hand: 90, upperArm: 0, forearm: 90 })),
  arnold_press: () => map(TEMPLATES.seated_press, (p, end) => editSide(p, { handRoll: end ? 180 : 0 }), { grip: 'rotating' }),
  hip_raise: () => pair('bent_knee_hip_raise',
    side({ anchor: 'shoulder', at: { x: 54, y: 166 }, torso: 270, thigh: 160, shin: 70, upperArm: 90, forearm: 90 }),
    side({ anchor: 'shoulder', at: { x: 54, y: 166 }, torso: 290, thigh: 180, shin: 100, upperArm: 90, forearm: 90 }), { load: 'none' }),
  drag_curl: (t: MotionTemplate) => map(t, (p, end) => editSide(p, { upperArm: end ? -35 : 0, forearm: end ? 150 : 0 })),
  preacher: () => pair('supported_preacher_curl',
    side({ upperArm: 45, forearm: 45 }), side({ upperArm: 45, forearm: 155 }),
    { scenery: [{ kind: 'bench', points: [{ x: 109, y: 113 }, { x: 133, y: 140 }, { x: 128, y: 146 }, { x: 103, y: 118 }] }] }),
  concentration: () => pair('concentration_curl',
    side({ anchor: 'hip', at: { x: 88, y: 140 }, torso: 155, thigh: 85, shin: 0, upperArm: 0, forearm: 0 }),
    side({ anchor: 'hip', at: { x: 88, y: 140 }, torso: 155, thigh: 85, shin: 0, upperArm: 0, forearm: 150 }), { scenery: [bench(65, 146, 40)] }),
  jerk_dip: (t: MotionTemplate) => map(t, (p, end) => editSide(p, { torso: 180, shin: end ? -8 : 0, thigh: end ? 22 : 0 }), { load: 'shoulders' }),
  sumo: () => pair('sumo_deadlift',
    front({ hipDrop: 30, hands: [{ x: 90, y: 130 }, { x: 110, y: 130 }], ankles: [{ x: 60, y: 174 }, { x: 140, y: 174 }] }),
    front({ hipDrop: 0, hands: [{ x: 90, y: 100 }, { x: 110, y: 100 }], ankles: [{ x: 60, y: 174 }, { x: 140, y: 174 }] })),
  landmine: () => pair('landmine_rotation',
    front({ torsoTwist: -45, hipTwist: -30, hands: [{ x: 52, y: 104 }, { x: 62, y: 104 }], hipDrop: 4 }),
    front({ torsoTwist: 45, hipTwist: 30, hands: [{ x: 138, y: 104 }, { x: 148, y: 104 }], hipDrop: 4 }), { pivot: { x: 100, y: 176 }, load: 'hands' }),
  pallof: () => {
    const a = front({ hands: [{ x: 94, y: 64 }, { x: 106, y: 64 }], torsoTwist: 0 });
    const mid = front({ hands: [{ x: 94, y: 90 }, { x: 106, y: 90 }], torsoTwist: 0 });
    const b = front({ hands: [{ x: 134, y: 65 }, { x: 144, y: 65 }], torsoTwist: 60 });
    return pair('pallof_press_rotation', a, b, { keyframes: [a, mid, b], pulley: { x: 15, y: 64 } });
  },
  high_pull: () => {
    const a = front({ hipDrop: 22, hands: [{ x: 92, y: 121 }, { x: 108, y: 121 }] });
    const mid = front({ hipDrop: 0, hands: [{ x: 92, y: 100 }, { x: 108, y: 100 }] });
    const b = front({ hipDrop: 0, hands: [{ x: 94, y: 52 }, { x: 106, y: 52 }] });
    return pair('sumo_high_pull', a, b, { keyframes: [a, mid, b] });
  },
  machine_hack: () => pair('hack_squat_machine',
    side({ torso: 200, upperArm: 0, forearm: 0 }),
    side({ torso: 200, thigh: 80, shin: -15, upperArm: 0, forearm: 0 }),
    { load: 'shoulders', scenery: [{ kind: 'bar', from: { x: 28, y: 66 }, to: { x: 80, y: 157 } }], footplate: true }),
  zottman: (t: MotionTemplate) => {
    const down = editSide(t.a, { handRoll: 0 }), up = editSide(t.b, { handRoll: 0 });
    const turned = editSide(t.b, { handRoll: 180 }), lowered = editSide(t.a, { handRoll: 180 });
    return pair('zottman_curl', down, down, { keyframes: [down, up, turned, lowered, down], loop: true, grip: 'rotating', scenery: t.scenery });
  },
  zottman_preacher: () => {
    const down = side({ upperArm: 45, forearm: 45, handRoll: 0 });
    const up = side({ upperArm: 45, forearm: 155, handRoll: 0 });
    return pair('zottman_preacher', down, down, { loop: true,
      keyframes: [down, up, { ...up, handRoll: 180 }, { ...down, handRoll: 180 }, down],
      scenery: [{ kind: 'bench', points: [{ x: 109, y: 113 }, { x: 133, y: 140 }, { x: 128, y: 146 }, { x: 103, y: 118 }] }] });
  },
  frankenstein: (t: MotionTemplate) => map(t, p => editSide(p, { hands: undefined, upperArm: 90, forearm: 90 }), { load: 'shoulders' }),
  hyperextension: () => pair('bench_hyperextension',
    side({ anchor: 'hip', at: { x: 95, y: 115 }, torso: 30, thigh: -90, shin: -90, foot: 90, hands: { at: { x: -10, y: 4 }, frame: 'torso', bend: 1 } }),
    side({ anchor: 'hip', at: { x: 95, y: 115 }, torso: 90, thigh: -90, shin: -90, foot: 90, hands: { at: { x: -10, y: 4 }, frame: 'torso', bend: 1 } }),
    { load: 'none', scenery: [bench(18, 122, 76), { kind: 'pad', at: { x: 26, y: 111 }, r: 5 }] }),
  romanian: (t: MotionTemplate) => map(t, (p, end) => editSide(p, { shin: end ? 0 : -5, thigh: end ? 0 : 25, torso: end ? 180 : 110 })),
  stiff_leg: (t: MotionTemplate) => map(t, (p, end) => editSide(p, { shin: 0, thigh: end ? 0 : 15, torso: end ? 180 : 95 })),
  deficit: (t: MotionTemplate) => map(t, (p, end) => editSide(p, { at: { x: 95, y: 160 }, shin: end ? 0 : -28, thigh: end ? 0 : 80, torso: end ? 180 : 110 }), { scenery: [bench(78, 163, 40, 14)] }),
  rocking_calf: (t: MotionTemplate) => {
    const neutral = worldHands({ ...t.a as SidePose, anchor: 'ankle', at: { x: 95, y: 166 }, foot: 90 });
    const heels = worldHands(t.b);
    const toes = worldHands({ ...t.a as SidePose, anchor: 'ankle', at: { x: 95, y: 166 }, foot: 130 });
    return pair('rocking_calf_raise', neutral, neutral, { keyframes: [neutral, heels, neutral, toes, neutral], loop: true, load: 'shoulders', scenery: t.scenery });
  },
  calf_on_dumbbell: (t: MotionTemplate) => ({ ...t, load: 'none', scenery: [{ kind: 'bar', from: { x: 102, y: 169 }, to: { x: 114, y: 169 } }, { kind: 'pad', at: { x: 102, y: 169 }, r: 4 }, { kind: 'pad', at: { x: 114, y: 169 }, r: 4 }] }),
  see_saw: (t: MotionTemplate) => {
    const angles = (p: Pose) => { const sk = solve(p); if (sk.view !== 'side') throw Error('Side press required'); return { upperArm: Math.atan2(sk.elbow.x-sk.shoulder.x,sk.elbow.y-sk.shoulder.y)*180/Math.PI, forearm: Math.atan2(sk.wrist.x-sk.elbow.x,sk.wrist.y-sk.elbow.y)*180/Math.PI }; };
    const down = angles(t.a), up = angles(t.b);
    return map(t, (p, end) => editSide(p, { hands: undefined, ...(end ? up : down), rearArm: end ? down : up }), { handLoad: 'both' });
  },
  hanging_clean: () => {
    const a = side({ torso: 165, upperArm: -25, forearm: -25, handRoll: 0 });
    const b = side({ hands: { at: { x: 9, y: -3 }, frame: 'shoulder', bend: -1 }, handRoll: 180 });
    return pair('bottoms_up_hang_clean', worldHands(a), worldHands(b));
  },
  full_pulldown: () => pair('crossed_cable_pulldown',
    front({ seated: true, hands: [{ x: 106, y: 24 }, { x: 94, y: 24 }] }),
    front({ seated: true, hands: [{ x: 78, y: 78 }, { x: 122, y: 78 }] }),
    { pulleys: [{ x: 185, y: 5 }, { x: 15, y: 5 }], scenery: [bench(73, 133, 54)] }),
  elevated_row: (t: MotionTemplate) => map(t, p => editSide(p, { at: { x: 74, y: 142 } }), { scenery: [bench(54, 156, 42), bench(54, 148, 42)], pulley: { x: 190, y: 142 } }),
  smith_press: (t: MotionTemplate) => map(t, (p, end) => editSide(p, { hands: { at: { x: 75, y: end ? 113 : 74 }, frame: 'world', bend: 1 }, hand: 90 }),
    { machineBar: true, scenery: [...t.scenery, { kind: 'bar', from: { x: 82, y: 65 }, to: { x: 82, y: 134 } }] }),
  board_press: (t: MotionTemplate) => map(t, (p, end) => end ? editSide(p, { hands: { at: { x: 6, y: -23 }, frame: 'shoulder', bend: 1 } }) : p,
    { scenery: [...t.scenery, bench(77, 106, 14, 12)] }),
  pin_press: (t: MotionTemplate) => map(t, (p, end) => end ? editSide(p, { hands: { at: { x: 6, y: -23 }, frame: 'shoulder', bend: 1 } }) : p,
    { scenery: [...t.scenery, { kind: 'bar', from: { x: 65, y: 108 }, to: { x: 94, y: 108 } }] }),
  seated_chest_press: (t: MotionTemplate) => map(t, p => editSide(p, { anchor: 'hip', at: { x: 92, y: 140 }, thigh: 90, shin: 0 }),
    { scenery: [bench(72, 146, 36), { kind: 'bar', from: { x: 84, y: 90 }, to: { x: 84, y: 144 } }], pulley: { x: 20, y: 105 } }),
  dumbbell_pullover: (t: MotionTemplate) => map(t, p => editSide(p, { torso: 250 }), { scenery: [bench(56, 117, 30)] }),
  cross_bench_press: (t: MotionTemplate) => map(t, p => editSide(p, { torso: 250 }), { scenery: [bench(56, 117, 30)] }),
  band_calf: (t: MotionTemplate) => map(t, p => editSide(p, { at: { x: 106, y: 176 }, hands: { at: { x: 10, y: -6 }, frame: 'shoulder', bend: -1 } }),
    { load: 'hands', scenery: [], pulley: { x: 106, y: 176 } }),
  supination: () => pair('side_lying_supination',
    side({ anchor: 'hip', at: { x: 110, y: 125 }, torso: 90, torsoRoll: 60, thigh: -90, shin: -90, upperArm: 0, forearm: 90, hand: 90, handRoll: 90 }),
    side({ anchor: 'hip', at: { x: 110, y: 125 }, torso: 90, torsoRoll: 60, thigh: -90, shin: -90, upperArm: 0, forearm: 90, hand: 90, handRoll: 0 }),
    { scenery: [bench(70, 134, 100)] }),
  supported_wrist: (t: MotionTemplate) => map(t, p => editSide(p, { torso: 130, upperArm: -35, forearm: 90 }),
    { scenery: [...t.scenery, bench(108, 139, 29, 4)] }),
  decline_combo: () => {
    const t = TEMPLATES.decline_press;
    const crusher = map(TEMPLATES.skull_crusher, p => editSide(p, { torso: 300 }));
    const frames = [worldHands(t.b), worldHands(t.a), worldHands(crusher.b), worldHands(t.a)];
    return pair('decline_press_skull_crusher', frames[0], frames[3], { keyframes: frames, scenery: t.scenery });
  },
} satisfies Record<string, (t: MotionTemplate) => MotionTemplate>;

export type VariantId = keyof typeof VARIANTS;
export type ExerciseMotionSpec = { sourceId: string; family: MotionId; variant: VariantId; options?: {
  alternating?: boolean; oneArm?: boolean; grip?: MotionTemplate['grip']; loadBehind?: boolean;
  behindNeck?: boolean; frontRack?: boolean; resistance?: 'band' | 'chain'; pulley?: { x: number; y: number };
  load?: MotionTemplate['load']; resistanceHigh?: boolean; machineBar?: boolean; cue?: string; pivot?: { x: number; y: number };
} };
const registry = specs as Record<string, ExerciseMotionSpec>;
const cache = new Map<string, MotionTemplate>();

export function getExerciseMotion(id: string): MotionTemplate | undefined {
  if (cache.has(id)) return cache.get(id);
  const spec = registry[id];
  if (!spec || !TEMPLATES[spec.family] || !VARIANTS[spec.variant]) return undefined;
  let template: MotionTemplate = VARIANTS[spec.variant](TEMPLATES[spec.family]);
  const options = spec.options;
  if (options?.behindNeck && template.a.view === 'side' && template.b.view === 'side') {
    template = map(template, (p, end) => editSide(p, { hands: { at: { x: end ? -2 : -10, y: spec.family === 'pulldown' ? (end ? -6 : -48) : (end ? -48 : -6) }, frame: 'shoulder', bend: -1 } }));
  }
  if (options?.frontRack) template = map(template, p => editSide(p, { hands: { at: { x: 9, y: -2 }, frame: 'shoulder', bend: -1 } }), { load: 'shoulders' });
  if (options?.oneArm && template.a.view === 'front') {
    template = map(template, p => p.view === 'front' ? { ...p, hands: [p.hands[0], { x: 124, y: 100 }] } : p, { handLoad: 'near' });
  }
  if (options?.oneArm && spec.variant === 'seated_calf') template = map(template, p => editSide(p, { rear: { thigh: 90, shin: 0, foot: 90 } }));
  if (options?.alternating && template.a.view === 'side' && template.b.view === 'side') {
    const resting = solve(template.a);
    if (resting.view === 'side') {
      const angle = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.atan2(b.x - a.x, b.y - a.y) * 180 / Math.PI;
      const rear = { upperArm: angle(resting.shoulder, resting.elbow), forearm: angle(resting.elbow, resting.wrist) };
      template = map(template, p => {
        const sk = solve(p);
        return p.view === 'side' && sk.view === 'side' ? { ...p, hands: undefined,
          upperArm: angle(sk.shoulder, sk.elbow), forearm: angle(sk.elbow, sk.wrist), rearArm: rear } : p;
      }, { alternating: true, handLoad: 'both' });
    }
  }
  const result: MotionTemplate = { ...template, id: spec.sourceId, grip: options?.grip ?? template.grip,
    loadBehind: options?.loadBehind, resistance: options?.resistance,
    pulley: options?.pulley ?? template.pulley, load: options?.load ?? template.load, resistanceHigh: options?.resistanceHigh,
    machineBar: options?.machineBar ?? template.machineBar, cue: options?.cue ?? template.cue, pivot: options?.pivot ?? template.pivot };
  cache.set(id, result);
  return result;
}

export const EXERCISE_MOTION_SPECS: Readonly<Record<string, ExerciseMotionSpec>> = registry;
