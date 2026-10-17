/**
 * Exercise demonstrations as motion, not photos: an original, stylised
 * articulated figure that moves between two poses per movement template.
 *
 * Everything here is pure geometry so scripts/test-motion.ts can check that
 * every catalog exercise has a template, that limbs keep their length through
 * the whole motion, and that planted hands and feet stay planted.
 *
 * Side-view angles are absolute, in degrees: 0 points straight down, 90 points
 * forward (the way the figure faces, +x), 180 straight up, -90 backwards.
 * Screen y grows downwards.
 */

import type { Equipment, Exercise, MuscleGroup } from './types';

// ------------------------------------------------------------ Geometry

export type Pt = { x: number; y: number };

/** Segment lengths in view units. Proportions only; no anatomical source. */
export const SEG = {
  shin: 34,
  thigh: 36,
  torso: 42,
  upperArm: 26,
  forearm: 24,
  neck: 5,
  head: 8.5,
  foot: 11,
  hand: 7,
} as const;

export const VIEW = { width: 200, height: 190 } as const;
export const GROUND = 176;

const RAD = Math.PI / 180;
export const dir = (deg: number): Pt => ({ x: Math.sin(deg * RAD), y: Math.cos(deg * RAD) });
const add = (a: Pt, b: Pt, s = 1): Pt => ({ x: a.x + b.x * s, y: a.y + b.y * s });
const unit = (from: Pt, to: Pt): Pt => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: dx / d, y: dy / d };
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Angles wrap at 360°; crossing zero must not swing a limb the long way. */
export const lerpAngle = (a: number, b: number, t: number) => a + (((b - a + 540) % 360) - 180) * t;
const ANGLES = new Set(['torso', 'thigh', 'shin', 'upperArm', 'forearm', 'foot', 'hand', 'headTilt', 'legSpread', 'torsoTwist', 'sideBend']);
const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
export const distance = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Two-bone inverse kinematics: where the middle joint (elbow, knee) sits so
 * that root→joint is `a` long and joint→target is `b` long. `bend` picks which
 * side of the root→target line the joint falls on. An unreachable target is
 * clamped, so the limb straightens towards it instead of stretching.
 */
export function solveTwoBone(root: Pt, target: Pt, a: number, b: number, bend: 1 | -1): Pt {
  const reach = Math.min(a + b - 1e-6, Math.max(Math.abs(a - b) + 1e-6, distance(root, target)));
  const base = Math.atan2(target.y - root.y, target.x - root.x);
  const cos = (a * a + reach * reach - b * b) / (2 * a * reach);
  const angle = base + bend * Math.acos(Math.max(-1, Math.min(1, cos)));
  return { x: root.x + a * Math.cos(angle), y: root.y + a * Math.sin(angle) };
}

// --------------------------------------------------------------- Poses

/**
 * Where the hands should be, solved with IK. `shoulder` offsets are from the
 * shoulder; `torso` offsets run along the torso (+ towards the head) and
 * along its front normal, so they follow a tilting torso.
 */
export type HandTarget = { at: Pt; frame: 'world' | 'shoulder' | 'torso'; bend: 1 | -1 };

export type SidePose = {
  view: 'side';
  /** The point that stays put; the rest of the chain hangs off it. */
  anchor: 'ankle' | 'toe' | 'hip' | 'shoulder' | 'wrist' | 'knee';
  at: Pt;
  torso: number;
  thigh: number;
  shin: number;
  /** Arm angles for forward kinematics; ignored when `hands` is set. */
  upperArm?: number;
  forearm?: number;
  hands?: HandTarget;
  /** Planted feet for a hip/shoulder/wrist anchor, solved with IK. */
  feet?: { at: Pt; bend: 1 | -1 };
  /** A second leg that differs from the first (lunge, kickback). */
  rear?: { thigh: number; shin: number; foot?: number };
  rearArm?: { upperArm: number; forearm: number; hand?: number };
  /** Foot angle; defaults to flat when grounded, else in line with the shin. */
  foot?: number;
  /** Hand angle at the wrist (wrist curls); defaults to in line with the forearm. */
  hand?: number;
  torsoRoll?: number;
  fingerCurl?: number;
  scapularLift?: number;
  handRoll?: number;
};

export type FrontPose = {
  view: 'front';
  /** Hand targets [figure's left on screen, right on screen], solved with IK. */
  hands: [Pt, Pt];
  /** Shoulder elevation in view units (shrugs). */
  shoulderLift?: number;
  /** Leg abduction per side, degrees (thigh abductor/adductor). */
  legSpread?: number;
  /** Head tilt, degrees (neck isometrics). */
  headTilt?: number;
  torsoTwist?: number;
  hipTwist?: number;
  sideBend?: number;
  hipDrop?: number;
  hipShift?: number;
  seated?: boolean;
  ankles?: [Pt, Pt];
  overheadArm?: 0 | 1;
  elbows?: [Pt, Pt];
  armElevation?: number;
  armAzimuth?: number;
};

export type Pose = SidePose | FrontPose;

export type SideSkeleton = {
  view: 'side';
  head: Pt;
  neck: Pt;
  shoulder: Pt;
  elbow: Pt;
  wrist: Pt;
  handTip: Pt;
  hip: Pt;
  knee: Pt;
  ankle: Pt;
  toe: Pt;
  rear?: { knee: Pt; ankle: Pt; toe: Pt };
  rearArm?: { shoulder: Pt; elbow: Pt; wrist: Pt; handTip: Pt };
  /** Unit vector hip → shoulder, and the chest-facing normal. */
  torsoDir: Pt;
  front: Pt;
  torsoRoll?: number;
  armShoulder?: Pt;
  fingers?: { palm: Pt; middle: Pt };
  handRoll?: number;
};

export type FrontSkeleton = {
  view: 'front';
  head: Pt;
  headTilt: number;
  neckBase: Pt;
  shoulders: [Pt, Pt];
  elbows: [Pt, Pt];
  wrists: [Pt, Pt];
  hips: [Pt, Pt];
  knees: [Pt, Pt];
  ankles: [Pt, Pt];
  armDepths?: { upper: number; forearm: number };
};

export type Skeleton = SideSkeleton | FrontSkeleton;

function legsFromHip(p: SidePose, hip: Pt) {
  if (p.feet) {
    const knee = solveTwoBone(hip, p.feet.at, SEG.thigh, SEG.shin, p.feet.bend);
    return { knee, ankle: add(knee, unit(knee, p.feet.at), SEG.shin) };
  }
  const knee = add(hip, dir(p.thigh), SEG.thigh);
  return { knee, ankle: add(knee, dir(p.shin), SEG.shin) };
}

export function solveSide(p: SidePose): SideSkeleton {
  const grounded = p.anchor === 'ankle' || p.anchor === 'toe' || Boolean(p.feet);
  const footAngle = p.foot ?? (grounded ? 90 : p.shin + 90);
  let hip: Pt;
  let knee: Pt;
  let ankle: Pt;
  let shoulder: Pt;
  let elbow: Pt | undefined;
  let wrist: Pt | undefined;

  if (p.anchor === 'knee') {
    knee = p.at;
    ankle = add(knee, dir(p.shin), SEG.shin);
    hip = add(knee, dir(p.thigh), -SEG.thigh);
    shoulder = add(hip, dir(p.torso), SEG.torso);
  } else if (p.anchor === 'ankle' || p.anchor === 'toe') {
    ankle = p.anchor === 'toe' ? add(p.at, dir(footAngle), -SEG.foot) : p.at;
    knee = add(ankle, dir(p.shin), -SEG.shin);
    hip = add(knee, dir(p.thigh), -SEG.thigh);
    shoulder = add(hip, dir(p.torso), SEG.torso);
  } else if (p.anchor === 'wrist') {
    wrist = p.at;
    elbow = add(wrist, dir(p.forearm ?? 180), -SEG.forearm);
    shoulder = add(elbow, dir(p.upperArm ?? 180), -SEG.upperArm);
    hip = add(shoulder, dir(p.torso), -SEG.torso);
    ({ knee, ankle } = legsFromHip(p, hip));
  } else {
    if (p.anchor === 'hip') {
      hip = p.at;
      shoulder = add(hip, dir(p.torso), SEG.torso);
    } else {
      shoulder = p.at;
      hip = add(shoulder, dir(p.torso), -SEG.torso);
    }
    ({ knee, ankle } = legsFromHip(p, hip));
  }

  const torsoDir = unit(hip, shoulder);
  const front = { x: -torsoDir.y, y: torsoDir.x };
  const armShoulder = add(shoulder, front, p.scapularLift ?? 0);

  if (!elbow || !wrist) {
    if (p.hands) {
      const { at, frame, bend } = p.hands;
      const target =
        frame === 'world'
          ? at
          : frame === 'shoulder'
            ? add(armShoulder, at)
            : add(add(armShoulder, torsoDir, at.x), front, at.y);
      elbow = solveTwoBone(armShoulder, target, SEG.upperArm, SEG.forearm, bend);
      wrist = add(elbow, unit(elbow, target), SEG.forearm);
    } else {
      elbow = add(armShoulder, dir(p.upperArm ?? 0), SEG.upperArm);
      wrist = add(elbow, dir(p.forearm ?? 0), SEG.forearm);
    }
  }

  const forearmDir = unit(elbow, wrist);
  let handTip = p.hand == null ? add(wrist, forearmDir, SEG.hand) : add(wrist, dir(p.hand), SEG.hand);
  let fingers: SideSkeleton['fingers'];
  if (p.fingerCurl !== undefined) {
    const palm = add(wrist, dir(p.hand ?? 90), 4);
    const middle = add(palm, dir((p.hand ?? 90) + 70 * p.fingerCurl), 3);
    handTip = add(middle, dir((p.hand ?? 90) + 140 * p.fingerCurl), 3);
    fingers = { palm, middle };
  }
  const toe = p.anchor === 'toe' ? p.at : add(ankle, dir(footAngle), SEG.foot);

  let rear: SideSkeleton['rear'];
  if (p.rear) {
    const rKnee = add(hip, dir(p.rear.thigh), SEG.thigh);
    const rAnkle = add(rKnee, dir(p.rear.shin), SEG.shin);
    rear = { knee: rKnee, ankle: rAnkle, toe: add(rAnkle, dir(p.rear.foot ?? p.foot ?? p.rear.shin + 90), SEG.foot) };
  }

  let rearArm: SideSkeleton['rearArm'];
  if (p.rearArm) {
    const root = { x: shoulder.x - 3, y: shoulder.y };
    const e = add(root, dir(p.rearArm.upperArm), SEG.upperArm);
    const w = add(e, dir(p.rearArm.forearm), SEG.forearm);
    rearArm = { shoulder: root, elbow: e, wrist: w, handTip: add(w, dir(p.rearArm.hand ?? p.rearArm.forearm), SEG.hand) };
  }
  return {
    view: 'side',
    neck: add(shoulder, torsoDir, SEG.neck),
    head: add(shoulder, torsoDir, SEG.neck + SEG.head),
    shoulder,
    elbow,
    wrist,
    handTip,
    hip,
    knee,
    ankle,
    toe,
    rear,
    rearArm,
    torsoDir,
    front,
    torsoRoll: p.torsoRoll,
    armShoulder,
    fingers,
    handRoll: p.handRoll,
  };
}

/** Front-view body: fixed torso and legs, IK arms with elbows bending outwards. */
export function solveFront(p: FrontPose): FrontSkeleton {
  const lift = p.shoulderLift ?? 0;
  const drop = p.seated ? 20 : (p.hipDrop ?? 0);
  const shift = p.hipShift ?? 0;
  const twist = (p.torsoTwist ?? 0) * RAD;
  const bend = (p.sideBend ?? 0) * RAD;
  const transform = (x: number, y: number): Pt => {
    const dx = (x - 100) * Math.cos(twist);
    const dy = y - 106 + (x - 100) * Math.sin(twist) * 0.35;
    return { x: 100 + shift + dx * Math.cos(bend) - dy * Math.sin(bend), y: 106 + drop + dx * Math.sin(bend) + dy * Math.cos(bend) };
  };
  const shoulders: [Pt, Pt] = [transform(82, 50 - lift), transform(118, 50 - lift)];
  const hipYaw = (p.hipTwist ?? 0) * RAD;
  const hips: [Pt, Pt] = [{ x: 100 - 9 * Math.cos(hipYaw) + shift, y: 106 + drop - 3 * Math.sin(hipYaw) }, { x: 100 + 9 * Math.cos(hipYaw) + shift, y: 106 + drop + 3 * Math.sin(hipYaw) }];
  const spread = p.legSpread ?? 0;
  const supported = Boolean(p.seated || p.ankles || p.hipDrop);
  const ankles = supported
    ? p.ankles ?? hips.map((h, i) => ({ x: h.x + (i === 0 ? -1 : 1) * (p.seated ? 20 + spread : 10), y: 174 })) as [Pt, Pt]
    : hips.map((h, i) => add(h, dir(i === 0 ? -spread : spread), SEG.thigh + SEG.shin)) as [Pt, Pt];
  const knees = supported
    ? hips.map((h, i) => solveTwoBone(h, ankles[i], SEG.thigh, SEG.shin, i === 0 ? 1 : -1)) as [Pt, Pt]
    : hips.map((h, i) => add(h, dir(i === 0 ? -spread : spread), SEG.thigh)) as [Pt, Pt];
  const targets = p.hands.map((hand, i) => p.overheadArm === i
    ? { x: shoulders[i].x, y: shoulders[i].y - 48 }
    : hand) as [Pt, Pt];
  let elbows = p.elbows ?? shoulders.map((root, i) =>
    solveTwoBone(root, targets[i], SEG.upperArm, SEG.forearm, i === 0 ? 1 : -1)
  ) as [Pt, Pt];
  let wrists = elbows.map((e, i) => add(e, unit(e, targets[i]), SEG.forearm)) as [Pt, Pt];
  let armDepths: FrontSkeleton['armDepths'];
  if (p.armElevation !== undefined) {
    const elevation = p.armElevation * RAD;
    const azimuth = (p.armAzimuth ?? 0) * RAD;
    const project = (length: number, angle: number, i: number): Pt => ({
      x: (i === 0 ? -1 : 1) * length * Math.cos(elevation) * Math.cos(angle),
      y: length * Math.cos(elevation) * Math.sin(angle),
    });
    elbows = shoulders.map((root, i) => add(root, project(SEG.upperArm, azimuth, i))) as [Pt, Pt];
    wrists = elbows.map((root, i) => add(root, project(SEG.forearm, azimuth + 15 * RAD, i))) as [Pt, Pt];
    armDepths = { upper: SEG.upperArm * Math.sin(elevation), forearm: SEG.forearm * Math.sin(elevation) };
  }
  return {
    view: 'front',
    head: transform(100, 27 - lift * 0.6),
    headTilt: p.headTilt ?? 0,
    neckBase: transform(100, 44 - lift),
    shoulders, elbows, wrists, hips, knees, ankles, armDepths,
  };
}

export function solve(p: Pose): Skeleton {
  return p.view === 'side' ? solveSide(p) : solveFront(p);
}

/** Linear blend of two poses of the same shape (same anchor and fields). */
export function blendPose<P extends Pose>(a: P, b: P, t: number): P {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(a) as (keyof P & string)[]) {
    const va = a[key] as unknown;
    const vb = b[key] as unknown;
    if (typeof va === 'number' && typeof vb === 'number') out[key] = ANGLES.has(key) ? lerpAngle(va, vb, t) : lerp(va, vb, t);
    else if (Array.isArray(va) && Array.isArray(vb)) out[key] = va.map((p, i) => lerpPt(p as Pt, vb[i] as Pt, t));
    else if (va && typeof va === 'object' && 'x' in (va as object)) out[key] = lerpPt(va as Pt, vb as Pt, t);
    else if (va && typeof va === 'object' && 'at' in (va as object)) {
      out[key] = { ...(va as object), at: lerpPt((va as { at: Pt }).at, (vb as { at: Pt }).at, t) };
    } else if (va && typeof va === 'object') {
      const nested: Record<string, number> = {};
      for (const k of Object.keys(va as object)) {
        const interpolate = ANGLES.has(k) ? lerpAngle : lerp;
        nested[k] = interpolate((va as Record<string, number>)[k], (vb as Record<string, number>)[k], t);
      }
      out[key] = nested;
    } else out[key] = va;
  }
  return out as P;
}

// ------------------------------------------------------------ Timeline

/** One repetition: hold, lift (concentric), hold, slower return (eccentric). */
export const REP_MS = 3400;
const PHASES = { holdA: 0.12, lift: 0.36, holdB: 0.12 } as const;

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Progress from pose A (0) to pose B (1) at a point in the repetition. */
export function repProgress(elapsedMs: number): number {
  const f = ((elapsedMs % REP_MS) + REP_MS) % REP_MS / REP_MS;
  const { holdA, lift, holdB } = PHASES;
  if (f < holdA) return 0;
  if (f < holdA + lift) return easeInOut((f - holdA) / lift);
  if (f < holdA + lift + holdB) return 1;
  return 1 - easeInOut((f - holdA - lift - holdB) / (1 - holdA - lift - holdB));
}

// ----------------------------------------------------------- Templates

export type Scenery =
  | { kind: 'bench'; points: Pt[] }
  | { kind: 'bar'; from: Pt; to: Pt }
  | { kind: 'pad'; at: Pt; r: number }
  | { kind: 'pulley'; at: Pt };

export type MotionTemplate = {
  id: string;
  view: 'side' | 'front';
  a: Pose;
  b: Pose;
  /** Fixed scenery: benches, bars, pads, pulleys. */
  scenery: Scenery[];
  /** Where the load sits; equipment decides what is drawn there. */
  load: 'hands' | 'hips' | 'shoulders' | 'thighs' | 'ankles' | 'knees' | 'none';
  /** Cable anchor, for cable exercises. */
  pulley?: Pt;
  pulleys?: [Pt, Pt];
  keyframes?: Pose[];
  footplate?: boolean;
  alternating?: boolean;
  isometric?: boolean;
  handLoad?: 'near' | 'far' | 'both';
  grip?: 'neutral' | 'overhand' | 'rotating';
  loadBehind?: boolean;
  resistance?: 'band' | 'chain';
  camera?: 'overhead';
  loop?: boolean;
  pivot?: Pt;
  workingLeg?: 0 | 1;
  resistanceHigh?: boolean;
  machineBar?: boolean;
  cue?: string;
};

/** Sample all stages of compound lifts instead of blending only the endpoints. */
export function sampleMotion(template: MotionTemplate, progress: number, alternate = false): Pose {
  const frames = template.keyframes ?? [template.a, template.b];
  const scaled = Math.max(0, Math.min(1, progress)) * (frames.length - 1);
  const i = Math.min(frames.length - 2, Math.floor(scaled));
  const pose = blendPose(frames[i], frames[i + 1], scaled - i);
  if (template.alternating && alternate) {
    if (pose.view === 'front') {
      const reflect = (p: Pt): Pt => ({ x: 200 - p.x, y: p.y });
      return { ...pose, hands: [reflect(pose.hands[1]), reflect(pose.hands[0])] };
    }
    if (pose.rearArm) return { ...pose, upperArm: pose.rearArm.upperArm, forearm: pose.rearArm.forearm,
      rearArm: { upperArm: pose.upperArm ?? 0, forearm: pose.forearm ?? 0 } };
    if (pose.rear) return { ...pose, thigh: pose.rear.thigh, shin: pose.rear.shin,
      rear: { thigh: pose.thigh, shin: pose.shin } };
  }
  return pose;
}

const stand = (extra: Partial<SidePose> = {}): SidePose => ({
  view: 'side',
  anchor: 'ankle',
  at: { x: 95, y: 172 },
  torso: 180,
  thigh: 0,
  shin: 0,
  upperArm: 0,
  forearm: 0,
  ...extra,
});

const FLAT_BENCH: Scenery = { kind: 'bench', points: [{ x: 40, y: 131 }, { x: 128, y: 131 }, { x: 128, y: 138 }, { x: 40, y: 138 }] };
const SEAT: Scenery = { kind: 'bench', points: [{ x: 72, y: 146 }, { x: 108, y: 146 }, { x: 108, y: 152 }, { x: 72, y: 152 }] };

/** Same movement performed seated: hips on a box, shins vertical. */
function seated(t: MotionTemplate, id: string): MotionTemplate {
  const sit = (p: Pose): Pose =>
    p.view === 'side'
      ? { ...p, anchor: 'hip', at: { x: 92, y: 140 }, thigh: 90, shin: 0, feet: undefined, rear: undefined, foot: undefined }
      : p;
  return { ...t, id, a: sit(t.a), b: sit(t.b), scenery: [...t.scenery, SEAT] };
}

function benchTilt(t: MotionTemplate, id: string, torso: number, points: Pt[]): MotionTemplate {
  const tilt = (p: Pose): Pose => (p.view === 'side' ? { ...p, torso } : p);
  return { ...t, id, a: tilt(t.a), b: tilt(t.b), scenery: [{ kind: 'bench', points }] };
}

const squat: MotionTemplate = {
  id: 'squat',
  view: 'side',
  a: stand({ hands: { at: { x: -5, y: -2 }, frame: 'shoulder', bend: 1 } }),
  b: stand({ shin: -32, thigh: 82, torso: 140, hands: { at: { x: -5, y: -2 }, frame: 'shoulder', bend: 1 } }),
  scenery: [],
  load: 'hands',
};

const legPress: MotionTemplate = {
  id: 'leg_press',
  view: 'side',
  a: { view: 'side', anchor: 'hip', at: { x: 70, y: 138 }, torso: 235, thigh: 0, shin: 0, upperArm: 30, forearm: 80, feet: { at: { x: 98, y: 108 }, bend: -1 } },
  b: { view: 'side', anchor: 'hip', at: { x: 70, y: 138 }, torso: 235, thigh: 0, shin: 0, upperArm: 30, forearm: 80, feet: { at: { x: 118, y: 96 }, bend: -1 } },
  scenery: [{ kind: 'bench', points: [{ x: 30, y: 112 }, { x: 44, y: 104 }, { x: 80, y: 140 }, { x: 80, y: 148 }, { x: 56, y: 148 }] }],
  load: 'none',
  footplate: true,
};

const lunge: MotionTemplate = {
  id: 'lunge',
  view: 'side',
  a: stand({ at: { x: 110, y: 172 }, rear: { thigh: 0, shin: 0 } }),
  b: stand({ at: { x: 110, y: 172 }, shin: -5, thigh: 85, rear: { thigh: -20, shin: -100 } }),
  scenery: [],
  load: 'hands',
};

const hinge: MotionTemplate = {
  id: 'hinge',
  view: 'side',
  a: stand({ shin: -18, thigh: 65, torso: 125 }),
  b: stand(),
  scenery: [],
  load: 'hands',
};

const clean: MotionTemplate = {
  id: 'clean',
  view: 'side',
  a: stand({ shin: -18, thigh: 65, torso: 125, hands: { at: { x: 0, y: 48 }, frame: 'shoulder', bend: -1 } }),
  b: stand({ hands: { at: { x: 9, y: -3 }, frame: 'shoulder', bend: -1 } }),
  scenery: [],
  load: 'hands',
};

const snatch: MotionTemplate = {
  id: 'snatch',
  view: 'side',
  a: stand({ shin: -18, thigh: 65, torso: 125, hands: { at: { x: 0, y: 48 }, frame: 'shoulder', bend: -1 } }),
  b: stand({ hands: { at: { x: -2, y: -48 }, frame: 'shoulder', bend: -1 } }),
  scenery: [],
  load: 'hands',
};

const hipThrust: MotionTemplate = {
  id: 'hip_thrust',
  view: 'side',
  a: { view: 'side', anchor: 'shoulder', at: { x: 60, y: 118 }, torso: 221, thigh: 0, shin: 0, feet: { at: { x: 120, y: 172 }, bend: -1 }, hands: { at: { x: -40, y: 6 }, frame: 'torso', bend: 1 } },
  b: { view: 'side', anchor: 'shoulder', at: { x: 60, y: 118 }, torso: 270, thigh: 0, shin: 0, feet: { at: { x: 120, y: 172 }, bend: -1 }, hands: { at: { x: -40, y: 6 }, frame: 'torso', bend: 1 } },
  scenery: [{ kind: 'bench', points: [{ x: 28, y: 124 }, { x: 64, y: 124 }, { x: 64, y: 132 }, { x: 28, y: 132 }] }],
  load: 'hips',
};

const bridge: MotionTemplate = {
  id: 'bridge',
  view: 'side',
  // Torso angles below -90 point hip→shoulder down-left, which lifts the hips.
  a: { view: 'side', anchor: 'shoulder', at: { x: 58, y: 168 }, torso: -92, thigh: 0, shin: 0, feet: { at: { x: 118, y: 172 }, bend: -1 }, upperArm: 86, forearm: 88 },
  b: { view: 'side', anchor: 'shoulder', at: { x: 58, y: 168 }, torso: -60, thigh: 0, shin: 0, feet: { at: { x: 118, y: 172 }, bend: -1 }, upperArm: 86, forearm: 88 },
  scenery: [],
  load: 'hips',
};

const kickback: MotionTemplate = {
  id: 'glute_kickback',
  view: 'side',
  a: stand({ at: { x: 110, y: 172 }, torso: 165, upperArm: 45, forearm: 60, rear: { thigh: 5, shin: 0 } }),
  b: stand({ at: { x: 110, y: 172 }, torso: 165, upperArm: 45, forearm: 60, rear: { thigh: -40, shin: -45 } }),
  scenery: [],
  load: 'none',
};

const benchPress: MotionTemplate = {
  id: 'bench_press',
  view: 'side',
  a: { view: 'side', anchor: 'hip', at: { x: 112, y: 124 }, torso: 270, thigh: 0, shin: 0, feet: { at: { x: 150, y: 172 }, bend: -1 }, hands: { at: { x: 0, y: -48 }, frame: 'shoulder', bend: 1 } },
  b: { view: 'side', anchor: 'hip', at: { x: 112, y: 124 }, torso: 270, thigh: 0, shin: 0, feet: { at: { x: 150, y: 172 }, bend: -1 }, hands: { at: { x: 6, y: -11 }, frame: 'shoulder', bend: 1 } },
  scenery: [FLAT_BENCH],
  load: 'hands',
};

const inclinePress = benchTilt(benchPress, 'incline_press', 240, [{ x: 40, y: 92 }, { x: 52, y: 84 }, { x: 116, y: 128 }, { x: 116, y: 136 }, { x: 96, y: 136 }]);
const declinePress = benchTilt(benchPress, 'decline_press', 300, [{ x: 40, y: 150 }, { x: 116, y: 124 }, { x: 116, y: 132 }, { x: 46, y: 158 }]);

const standingPress: MotionTemplate = {
  id: 'chest_press_standing',
  view: 'side',
  a: stand({ hands: { at: { x: 8, y: 14 }, frame: 'shoulder', bend: -1 } }),
  b: stand({ hands: { at: { x: 48, y: 8 }, frame: 'shoulder', bend: -1 } }),
  scenery: [],
  load: 'hands',
  pulley: { x: 18, y: 72 },
};

const pushUp: MotionTemplate = {
  id: 'push_up',
  view: 'side',
  a: { view: 'side', anchor: 'toe', at: { x: 30, y: 176 }, foot: 17, shin: -72, thigh: -72, torso: 108, hand: 90, hands: { at: { x: 134, y: 174 }, frame: 'world', bend: 1 } },
  b: { view: 'side', anchor: 'toe', at: { x: 30, y: 176 }, foot: 17, shin: -84, thigh: -84, torso: 96, hand: 90, hands: { at: { x: 134, y: 174 }, frame: 'world', bend: 1 } },
  scenery: [],
  load: 'none',
};

const dip: MotionTemplate = {
  id: 'dip',
  view: 'side',
  a: { view: 'side', anchor: 'wrist', at: { x: 100, y: 100 }, forearm: 0, upperArm: 0, torso: 175, thigh: 10, shin: -50 },
  b: { view: 'side', anchor: 'wrist', at: { x: 100, y: 100 }, forearm: 15, upperArm: -95, torso: 160, thigh: -10, shin: -70 },
  scenery: [{ kind: 'bar', from: { x: 76, y: 102 }, to: { x: 136, y: 102 } }],
  load: 'none',
};

const pullover: MotionTemplate = {
  id: 'pullover',
  view: 'side',
  a: { view: 'side', anchor: 'hip', at: { x: 112, y: 124 }, torso: 270, thigh: 0, shin: 0, feet: { at: { x: 150, y: 172 }, bend: -1 }, hands: { at: { x: -44, y: 10 }, frame: 'shoulder', bend: -1 } },
  b: { view: 'side', anchor: 'hip', at: { x: 112, y: 124 }, torso: 270, thigh: 0, shin: 0, feet: { at: { x: 150, y: 172 }, bend: -1 }, hands: { at: { x: 4, y: -44 }, frame: 'shoulder', bend: -1 } },
  scenery: [FLAT_BENCH],
  load: 'hands',
};

const pullUp: MotionTemplate = {
  id: 'pull_up',
  view: 'side',
  a: { view: 'side', anchor: 'wrist', at: { x: 100, y: 24 }, forearm: 180, upperArm: 180, torso: 180, thigh: 10, shin: -60 },
  b: { view: 'side', anchor: 'wrist', at: { x: 100, y: 24 }, forearm: 175, upperArm: 20, torso: 172, thigh: 20, shin: -50 },
  scenery: [{ kind: 'bar', from: { x: 70, y: 24 }, to: { x: 130, y: 24 } }],
  load: 'none',
};

const pulldown: MotionTemplate = {
  id: 'pulldown',
  view: 'side',
  a: { view: 'side', anchor: 'hip', at: { x: 92, y: 140 }, torso: 185, thigh: 90, shin: 0, hands: { at: { x: 4, y: -48 }, frame: 'shoulder', bend: -1 } },
  b: { view: 'side', anchor: 'hip', at: { x: 92, y: 140 }, torso: 192, thigh: 90, shin: 0, hands: { at: { x: 8, y: -4 }, frame: 'shoulder', bend: -1 } },
  scenery: [SEAT, { kind: 'pad', at: { x: 128, y: 132 }, r: 5 }],
  load: 'hands',
  pulley: { x: 100, y: 4 },
};

const row: MotionTemplate = {
  id: 'row',
  view: 'side',
  a: stand({ shin: -12, thigh: 40, torso: 112, hands: { at: { x: -18, y: 44.5 }, frame: 'torso', bend: 1 } }),
  b: stand({ shin: -12, thigh: 40, torso: 112, hands: { at: { x: -22, y: 6 }, frame: 'torso', bend: 1 } }),
  scenery: [],
  load: 'hands',
};

const seatedRow: MotionTemplate = {
  id: 'seated_row',
  view: 'side',
  a: { view: 'side', anchor: 'hip', at: { x: 74, y: 150 }, torso: 172, thigh: 82, shin: 100, hands: { at: { x: 46, y: 10 }, frame: 'shoulder', bend: -1 } },
  b: { view: 'side', anchor: 'hip', at: { x: 74, y: 150 }, torso: 185, thigh: 82, shin: 100, hands: { at: { x: 10, y: 24 }, frame: 'shoulder', bend: -1 } },
  scenery: [{ kind: 'bench', points: [{ x: 54, y: 156 }, { x: 96, y: 156 }, { x: 96, y: 162 }, { x: 54, y: 162 }] }],
  load: 'hands',
  pulley: { x: 190, y: 150 },
};

const overheadPress: MotionTemplate = {
  id: 'overhead_press',
  view: 'side',
  a: stand({ hands: { at: { x: 10, y: -6 }, frame: 'shoulder', bend: -1 } }),
  b: stand({ hands: { at: { x: 2, y: -48 }, frame: 'shoulder', bend: -1 } }),
  scenery: [],
  load: 'hands',
};

const curl: MotionTemplate = {
  id: 'curl',
  view: 'side',
  a: stand({ upperArm: 2, forearm: 8 }),
  b: stand({ upperArm: 2, forearm: 160 }),
  scenery: [],
  load: 'hands',
};

const wristCurl: MotionTemplate = {
  id: 'wrist_curl',
  view: 'side',
  a: { view: 'side', anchor: 'hip', at: { x: 92, y: 140 }, torso: 160, thigh: 90, shin: 0, upperArm: 30, forearm: 90, hand: 50 },
  b: { view: 'side', anchor: 'hip', at: { x: 92, y: 140 }, torso: 160, thigh: 90, shin: 0, upperArm: 30, forearm: 90, hand: 140 },
  scenery: [SEAT],
  load: 'hands',
};

const skullCrusher: MotionTemplate = {
  id: 'skull_crusher',
  view: 'side',
  a: { view: 'side', anchor: 'hip', at: { x: 112, y: 124 }, torso: 270, thigh: 0, shin: 0, feet: { at: { x: 150, y: 172 }, bend: -1 }, upperArm: 172, forearm: 172 },
  b: { view: 'side', anchor: 'hip', at: { x: 112, y: 124 }, torso: 270, thigh: 0, shin: 0, feet: { at: { x: 150, y: 172 }, bend: -1 }, upperArm: 165, forearm: -55 },
  scenery: [FLAT_BENCH],
  load: 'hands',
};

const calfRaise: MotionTemplate = {
  id: 'calf_raise',
  view: 'side',
  a: stand({ anchor: 'toe', at: { x: 106, y: 166 }, foot: 95 }),
  b: stand({ anchor: 'toe', at: { x: 106, y: 166 }, foot: 48 }),
  scenery: [{ kind: 'bench', points: [{ x: 102, y: 169 }, { x: 128, y: 169 }, { x: 128, y: 177 }, { x: 102, y: 177 }] }],
  load: 'hands',
};

const legCurl: MotionTemplate = {
  id: 'leg_curl',
  view: 'side',
  a: { view: 'side', anchor: 'hip', at: { x: 95, y: 120 }, torso: 90, thigh: -90, shin: -90, hands: { at: { x: 150, y: 128 }, frame: 'world', bend: -1 } },
  b: { view: 'side', anchor: 'hip', at: { x: 95, y: 120 }, torso: 90, thigh: -90, shin: -165, hands: { at: { x: 150, y: 128 }, frame: 'world', bend: -1 } },
  scenery: [{ kind: 'bench', points: [{ x: 70, y: 126 }, { x: 158, y: 126 }, { x: 158, y: 133 }, { x: 70, y: 133 }] }],
  load: 'none',
};

const crunch: MotionTemplate = {
  id: 'crunch',
  view: 'side',
  a: { view: 'side', anchor: 'hip', at: { x: 104, y: 168 }, torso: 270, thigh: 0, shin: 0, feet: { at: { x: 142, y: 172 }, bend: -1 }, hands: { at: { x: -14, y: 6 }, frame: 'torso', bend: -1 } },
  b: { view: 'side', anchor: 'hip', at: { x: 104, y: 168 }, torso: 232, thigh: 0, shin: 0, feet: { at: { x: 142, y: 172 }, bend: -1 }, hands: { at: { x: -14, y: 6 }, frame: 'torso', bend: -1 } },
  scenery: [],
  load: 'none',
};

const legRaise: MotionTemplate = {
  id: 'leg_raise',
  view: 'side',
  a: { view: 'side', anchor: 'hip', at: { x: 96, y: 168 }, torso: 270, thigh: 92, shin: 92, upperArm: 80, forearm: 90 },
  b: { view: 'side', anchor: 'hip', at: { x: 96, y: 168 }, torso: 270, thigh: 168, shin: 168, upperArm: 80, forearm: 90 },
  scenery: [],
  load: 'none',
};

const hangingLegRaise: MotionTemplate = {
  id: 'hanging_leg_raise',
  view: 'side',
  a: { view: 'side', anchor: 'wrist', at: { x: 100, y: 12 }, forearm: 180, upperArm: 180, torso: 180, thigh: 2, shin: 0 },
  b: { view: 'side', anchor: 'wrist', at: { x: 100, y: 12 }, forearm: 180, upperArm: 180, torso: 186, thigh: 95, shin: 30 },
  scenery: [{ kind: 'bar', from: { x: 70, y: 12 }, to: { x: 130, y: 12 } }],
  load: 'none',
};

const rollout: MotionTemplate = {
  id: 'rollout',
  view: 'side',
  // Kneeling: shins flat on the floor, hips travel forward as the bar rolls out.
  a: { view: 'side', anchor: 'ankle', at: { x: 40, y: 172 }, shin: -90, thigh: 0, torso: 115, hand: 90, hands: { at: { x: 120, y: 165 }, frame: 'world', bend: 1 } },
  b: { view: 'side', anchor: 'ankle', at: { x: 40, y: 172 }, shin: -90, thigh: -50, torso: 95, hand: 90, hands: { at: { x: 184, y: 165 }, frame: 'world', bend: 1 } },
  scenery: [],
  load: 'hands',
};

// Front view: hands as [screen-left, screen-right]. Shoulders sit at x 82/118, y 50.
const front = (hands: [Pt, Pt], extra: Partial<FrontPose> = {}): FrontPose => ({ view: 'front', hands, ...extra });
const HANG: [Pt, Pt] = [{ x: 76, y: 100 }, { x: 124, y: 100 }];

const lateralRaise: MotionTemplate = {
  id: 'lateral_raise',
  view: 'front',
  a: front(HANG),
  b: front([{ x: 34, y: 54 }, { x: 166, y: 54 }]),
  scenery: [],
  load: 'hands',
};

const uprightRow: MotionTemplate = {
  id: 'upright_row',
  view: 'front',
  a: front([{ x: 92, y: 100 }, { x: 108, y: 100 }]),
  b: front([{ x: 94, y: 52 }, { x: 106, y: 52 }]),
  scenery: [],
  load: 'hands',
};

const shrug: MotionTemplate = {
  id: 'shrug',
  view: 'front',
  a: front(HANG, { shoulderLift: 0 }),
  b: front([{ x: 76, y: 91 }, { x: 124, y: 91 }], { shoulderLift: 9 }),
  scenery: [],
  load: 'hands',
};

const fly: MotionTemplate = {
  id: 'fly',
  view: 'front',
  a: front([{ x: 36, y: 62 }, { x: 164, y: 62 }]),
  b: front([{ x: 94, y: 74 }, { x: 106, y: 74 }]),
  scenery: [],
  load: 'hands',
};

const hipAbduction: MotionTemplate = {
  id: 'hip_abduction',
  view: 'front',
  a: front([{ x: 84, y: 98 }, { x: 116, y: 98 }], { legSpread: 2 }),
  b: front([{ x: 84, y: 98 }, { x: 116, y: 98 }], { legSpread: 24 }),
  scenery: [],
  load: 'none',
};

const hipAdduction: MotionTemplate = { ...hipAbduction, id: 'hip_adduction', a: hipAbduction.b, b: hipAbduction.a };

const rotation: MotionTemplate = {
  id: 'rotation',
  view: 'front',
  a: front([{ x: 138, y: 22 }, { x: 146, y: 28 }]),
  b: front([{ x: 56, y: 116 }, { x: 64, y: 122 }]),
  scenery: [],
  load: 'hands',
};

const neck: MotionTemplate = {
  id: 'neck',
  view: 'front',
  a: front([{ x: 92, y: 30 }, { x: 108, y: 30 }], { headTilt: 0 }),
  b: front([{ x: 92, y: 30 }, { x: 108, y: 30 }], { headTilt: 14 }),
  scenery: [],
  load: 'none',
};

export const TEMPLATES = {
  squat,
  leg_press: legPress,
  lunge,
  hinge,
  clean,
  snatch,
  hip_thrust: hipThrust,
  bridge,
  glute_kickback: kickback,
  bench_press: benchPress,
  incline_press: inclinePress,
  decline_press: declinePress,
  chest_press_standing: standingPress,
  push_up: pushUp,
  dip,
  pullover,
  pull_up: pullUp,
  pulldown,
  row,
  seated_row: seatedRow,
  overhead_press: overheadPress,
  seated_press: seated(overheadPress, 'seated_press'),
  curl,
  seated_curl: seated(curl, 'seated_curl'),
  wrist_curl: wristCurl,
  skull_crusher: skullCrusher,
  calf_raise: calfRaise,
  leg_curl: legCurl,
  crunch,
  leg_raise: legRaise,
  hanging_leg_raise: hangingLegRaise,
  rollout,
  lateral_raise: lateralRaise,
  upright_row: uprightRow,
  shrug,
  fly,
  hip_abduction: hipAbduction,
  hip_adduction: hipAdduction,
  rotation,
  neck,
} satisfies Record<string, MotionTemplate>;

export type MotionId = keyof typeof TEMPLATES;

// ------------------------------------------------------------- Mapping

type Rule = [RegExp, MotionId | ((name: string) => MotionId)];

const pressVariant = (n: string): MotionId =>
  /incline/.test(n) ? 'incline_press' : /decline/.test(n) ? 'decline_press' : 'bench_press';

/**
 * Name rules first, because the catalog's movement_pattern is noisy (Flutter
 * Kicks is filed as a horizontal pull). Order matters: the first match wins.
 */
const NAME_RULES: Rule[] = [
  // Exact compounds must precede the broader equipment/movement keywords.
  [/^(snatch|clean) deadlift$/, 'hinge'],
  [/^calf-machine shoulder shrug$/, 'shrug'],
  [/^upright cable row$/, 'upright_row'],
  [/neck exercise/, 'neck'],
  [/calf|calves/, 'calf_raise'],
  [/leg press/, 'leg_press'],
  [/leg curl|glute ham/, 'leg_curl'],
  [/abductor|monster walk/, 'hip_abduction'],
  [/adductor|adduction/, 'hip_adduction'],
  [/hip thrust/, 'hip_thrust'],
  [/glute bridge|butt lift|hip lift/, 'bridge'],
  [/kickback|hip extension/, 'glute_kickback'],
  [/skull crusher/, 'skull_crusher'],
  [/pullover/, 'pullover'],
  [/wrist curl|finger curl|pronation|supination/, 'wrist_curl'],
  [/shrug/, 'shrug'],
  [/upright row|high pull/, 'upright_row'],
  [/fly|flye|around the world/, 'fly'],
  [/rollout/, 'rollout'],
  [/hanging (leg|knee)|gorilla chin/, 'hanging_leg_raise'],
  [/leg pull-in|hip raise|flutter kick/, 'leg_raise'],
  [/sit-up|crunch/, 'crunch'],
  [/twist|wood chop|cable lift|judo flip|landmine|pallof|spell caster|windmill|bent press/, 'rotation'],
  // Squats before the press and clean rules: Jerk Dip Squat, Front Squat (Clean Grip).
  [/squat/, 'squat'],
  [/snatch/, 'snatch'],
  [/clean and press|push press|jerk|military press|shoulder press|behind neck|arnold|cuban|see-saw|anti-gravity|palms-in dumbbell press/, (n) => (/seated/.test(n) ? 'seated_press' : 'overhead_press')],
  [/clean/, 'clean'],
  [/deadlift|good morning|pull through|hyperextension/, 'hinge'],
  [/lunge|step-up/, 'lunge'],
  [/chest press/, 'chest_press_standing'],
  [/dip/, 'dip'],
  [/push-?up/, 'push_up'],
  [/bench press|floor press|board press|pin press|jm press|neck press|close-grip.*press|bench to|shoulder raise/, pressVariant],
  [/pulldown|pull-down/, 'pulldown'],
  [/pull-?up|chin-?up/, 'pull_up'],
  [/cable.*row|seated.*row|elevated cable row|pulley row/, 'seated_row'],
  [/row/, 'row'],
  [/curl/, (n) => (/seated|concentration|preacher|prone incline|lying/.test(n) ? 'seated_curl' : 'curl')],
];

const MUSCLE_FALLBACK: Record<MuscleGroup, MotionId> = {
  chest: 'bench_press',
  back: 'row',
  shoulders: 'overhead_press',
  biceps: 'curl',
  triceps: 'skull_crusher',
  quads: 'squat',
  hamstrings: 'hinge',
  glutes: 'hip_thrust',
  calves: 'calf_raise',
  core: 'crunch',
  forearms: 'wrist_curl',
  traps: 'shrug',
};

export function templateIdFor(exercise: Pick<Exercise, 'name' | 'primary_muscles'>): MotionId {
  const name = exercise.name.toLowerCase();
  for (const [pattern, id] of NAME_RULES) {
    if (pattern.test(name)) return typeof id === 'function' ? id(name) : id;
  }
  return MUSCLE_FALLBACK[exercise.primary_muscles[0]] ?? 'squat';
}

export function templateFor(exercise: Pick<Exercise, 'name' | 'primary_muscles'>): MotionTemplate {
  return TEMPLATES[templateIdFor(exercise)];
}

/** What is drawn at the load point, from the exercise's equipment. */
export type LoadKind = 'barbell' | 'dumbbell' | 'kettlebell' | 'cable' | 'band' | 'machine' | 'none';

export function loadKindFor(equipment: Equipment[]): LoadKind {
  for (const kind of ['cable', 'barbell', 'dumbbell', 'kettlebell', 'band', 'machine'] as const) {
    if (equipment.includes(kind)) return kind;
  }
  return 'none';
}
