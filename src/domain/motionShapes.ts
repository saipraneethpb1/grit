/**
 * Turns a solved skeleton into flat drawing primitives, shading each body
 * region by how much the exercise works it. Theme-free and React-free: the
 * component maps roles to colours, and the preview script maps the same list
 * to SVG, so what is reviewed is exactly what ships.
 */

import { distance, GROUND, sampleMotion, solve, type FrontSkeleton, type LoadKind, type MotionTemplate, type Pt, type SideSkeleton, type Skeleton } from './motion';
import type { MuscleGroup } from './types';

export type Role =
  | 'primary'
  | 'secondary'
  | 'body'
  /** Far-side limb, drawn darker behind the body. */
  | 'bodyFar'
  | 'joint'
  | 'scenery'
  | 'load'
  | 'cable'
  | 'ground';

export type Shape =
  | { kind: 'line'; a: Pt; b: Pt; width: number; role: Role }
  | { kind: 'circle'; c: Pt; r: number; role: Role }
  | { kind: 'poly'; points: Pt[]; role: Role };

export type MuscleEmphasis = { primary: MuscleGroup[]; secondary: MuscleGroup[] };

function roleFor(muscles: MuscleGroup[], emphasis: MuscleEmphasis, fallback: Role = 'body'): Role {
  if (muscles.some((m) => emphasis.primary.includes(m))) return 'primary';
  if (muscles.some((m) => emphasis.secondary.includes(m))) return 'secondary';
  return fallback;
}

const W = { thigh: 15.5, shin: 11.5, upperArm: 10.5, forearm: 9, foot: 6, hand: 5, neck: 7.5 } as const;
const HEAD_R = 9.5;

const along = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const offset = (p: Pt, n: Pt, s: number): Pt => ({ x: p.x + n.x * s, y: p.y + n.y * s });

function sideShapes(s: SideSkeleton, e: MuscleEmphasis): Shape[] {
  const out: Shape[] = [];
  const thighRole = roleFor(['quads', 'hamstrings'], e);
  const shinRole = roleFor(['calves'], e);
  if (s.rearArm) {
    out.push({ kind: 'line', a: s.rearArm.shoulder, b: s.rearArm.elbow, width: W.upperArm, role: 'bodyFar' });
    out.push({ kind: 'line', a: s.rearArm.elbow, b: s.rearArm.wrist, width: W.forearm, role: 'bodyFar' });
    out.push({ kind: 'line', a: s.rearArm.wrist, b: s.rearArm.handTip, width: W.hand, role: 'bodyFar' });
  }

  // Far leg first so the near leg overlaps it.
  if (s.rear) {
    out.push({ kind: 'line', a: s.hip, b: s.rear.knee, width: W.thigh, role: thighRole === 'body' ? 'bodyFar' : thighRole });
    out.push({ kind: 'line', a: s.rear.knee, b: s.rear.ankle, width: W.shin, role: shinRole === 'body' ? 'bodyFar' : shinRole });
    out.push({ kind: 'line', a: s.rear.ankle, b: s.rear.toe, width: W.foot, role: 'bodyFar' });
  }

  // Torso as four regions: chest / abs on the front, upper / lower back behind.
  const roll = Math.cos((s.torsoRoll ?? 0) * Math.PI / 180);
  const n = { x: s.front.x * roll, y: s.front.y * roll };
  const mid = along(s.hip, s.shoulder, 0.5);
  const half = 10.5;
  const quad = (p0: Pt, p1: Pt, side: 1 | -1, w0: number, w1: number): Pt[] => [
    p0,
    p1,
    offset(p1, n, side * w1),
    offset(p0, n, side * w0),
  ];
  out.push({ kind: 'poly', points: quad(s.hip, mid, -1, half - 1, half), role: roleFor(['back'], e) });
  out.push({ kind: 'poly', points: quad(mid, s.shoulder, -1, half, half), role: roleFor(['back', 'traps'], e) });
  out.push({ kind: 'poly', points: quad(s.hip, mid, 1, half - 1, half), role: roleFor(['core'], e) });
  out.push({ kind: 'poly', points: quad(mid, s.shoulder, 1, half, half + 1), role: roleFor(['chest'], e) });

  // Glutes sit behind the hip; drawn before the thigh so the leg reads in front.
  out.push({ kind: 'circle', c: offset(s.hip, n, -4.5), r: 9.5, role: roleFor(['glutes'], e) });

  out.push({ kind: 'line', a: s.hip, b: s.knee, width: W.thigh, role: thighRole });
  out.push({ kind: 'line', a: s.knee, b: s.ankle, width: W.shin, role: shinRole });
  out.push({ kind: 'line', a: s.ankle, b: s.toe, width: W.foot, role: 'body' });

  out.push({ kind: 'line', a: s.shoulder, b: s.neck, width: W.neck, role: roleFor(['traps'], e) });
  out.push({ kind: 'circle', c: s.head, r: HEAD_R, role: 'body' });

  out.push({ kind: 'line', a: s.armShoulder ?? s.shoulder, b: s.elbow, width: W.upperArm, role: roleFor(['biceps', 'triceps'], e) });
  out.push({ kind: 'line', a: s.elbow, b: s.wrist, width: W.forearm, role: roleFor(['forearms'], e) });
  out.push({ kind: 'line', a: s.wrist, b: s.fingers?.palm ?? s.handTip, width: W.hand, role: roleFor(['forearms'], e) });
  if (s.fingers) {
    out.push({ kind: 'line', a: s.fingers.palm, b: s.fingers.middle, width: 4, role: roleFor(['forearms'], e) });
    out.push({ kind: 'line', a: s.fingers.middle, b: s.handTip, width: 3, role: roleFor(['forearms'], e) });
  }
  out.push({ kind: 'circle', c: s.armShoulder ?? s.shoulder, r: 7.5, role: roleFor(['shoulders'], e) });
  return out;
}

function frontShapes(s: FrontSkeleton, e: MuscleEmphasis): Shape[] {
  const out: Shape[] = [];
  const [sl, sr] = s.shoulders;
  const [hl, hr] = s.hips;
  const waist = (sl.y + hl.y) / 2 + 4;

  for (let i = 0; i < 2; i++) {
    out.push({ kind: 'line', a: s.hips[i], b: s.knees[i], width: W.thigh, role: roleFor(['quads', 'hamstrings'], e) });
    out.push({ kind: 'line', a: s.knees[i], b: s.ankles[i], width: W.shin, role: roleFor(['calves'], e) });
    const outward = i === 0 ? -1 : 1;
    out.push({ kind: 'line', a: s.ankles[i], b: { x: s.ankles[i].x + outward * 9, y: s.ankles[i].y + 1 }, width: W.foot, role: 'body' });
  }
  // Outer hips: glute medius is what an abduction works.
  out.push({ kind: 'circle', c: { x: hl.x - 5, y: hl.y - 2 }, r: 6.5, role: roleFor(['glutes'], e) });
  out.push({ kind: 'circle', c: { x: hr.x + 5, y: hr.y - 2 }, r: 6.5, role: roleFor(['glutes'], e) });

  out.push({ kind: 'poly', points: [{ x: sl.x + 2, y: waist }, { x: sr.x - 2, y: waist }, { x: hr.x + 2, y: hr.y + 2 }, { x: hl.x - 2, y: hl.y + 2 }], role: roleFor(['core'], e) });
  out.push({ kind: 'poly', points: [{ x: sl.x, y: sl.y - 1 }, { x: sr.x, y: sr.y - 1 }, { x: sr.x - 2, y: waist }, { x: sl.x + 2, y: waist }], role: roleFor(['chest'], e) });
  // Trapezius: the slope from neck to shoulders.
  out.push({ kind: 'poly', points: [{ x: s.neckBase.x - 5, y: s.neckBase.y - 6 }, { x: s.neckBase.x + 5, y: s.neckBase.y - 6 }, { x: sr.x - 2, y: sr.y - 2 }, { x: sl.x + 2, y: sl.y - 2 }], role: roleFor(['traps'], e) });

  const tilt = (s.headTilt * Math.PI) / 180;
  const neckTop = along(s.neckBase, s.head, 0.5);
  out.push({ kind: 'line', a: { x: s.neckBase.x, y: s.neckBase.y - 4 }, b: neckTop, width: W.neck, role: roleFor(['traps'], e) });
  out.push({ kind: 'circle', c: { x: s.head.x + Math.sin(tilt) * 17, y: s.head.y + (1 - Math.cos(tilt)) * 17 }, r: HEAD_R, role: 'body' });

  for (let i = 0; i < 2; i++) {
    out.push({ kind: 'line', a: s.shoulders[i], b: s.elbows[i], width: W.upperArm, role: roleFor(['biceps', 'triceps'], e) });
    out.push({ kind: 'line', a: s.elbows[i], b: s.wrists[i], width: W.forearm, role: roleFor(['forearms'], e) });
    out.push({ kind: 'circle', c: s.shoulders[i], r: 7, role: roleFor(['shoulders'], e) });
  }
  return out;
}

function sceneryShapes(t: MotionTemplate): Shape[] {
  return t.scenery.map((s): Shape => {
    if (s.kind === 'bench') return { kind: 'poly', points: s.points, role: 'scenery' };
    if (s.kind === 'bar') return { kind: 'line', a: s.from, b: s.to, width: 3.5, role: 'scenery' };
    if (s.kind === 'pad') return { kind: 'circle', c: s.at, r: s.r, role: 'scenery' };
    return { kind: 'circle', c: s.at, r: 4, role: 'scenery' };
  });
}

function loadShapes(t: MotionTemplate, s: Skeleton, kind: LoadKind): Shape[] {
  if (t.load === 'none' || kind === 'none') return [];
  const out: Shape[] = [];
  let points: Pt[] = t.load === 'hips' ? [s.view === 'side' ? s.hip : s.hips[0]]
    : t.load === 'shoulders' ? (s.view === 'side' ? [s.shoulder] : s.shoulders)
    : t.load === 'thighs' ? (s.view === 'side' ? [along(s.hip, s.knee, 0.8)] : s.knees)
    : t.load === 'knees' ? (s.view === 'side' ? [s.knee] : s.knees)
    : t.load === 'ankles' ? (s.view === 'side' ? [s.rear?.ankle ?? s.ankle] : s.ankles)
    : s.view === 'side' ? (t.handLoad === 'both' && s.rearArm ? [s.handTip, s.rearArm.handTip]
      : t.handLoad === 'far' && s.rearArm ? [s.rearArm.handTip] : [s.handTip])
      : t.handLoad === 'near' ? [s.wrists[0]] : t.handLoad === 'far' ? [s.wrists[1]] : s.wrists;
  if (t.load === 'ankles' && t.workingLeg !== undefined && s.view === 'front') points = [s.ankles[t.workingLeg]];

  if (kind === 'cable' || kind === 'band') {
    if (kind === 'band' && t.load === 'ankles' && points.length === 2 && !t.pulley) {
      return [{ kind: 'line', a: points[0], b: points[1], width: 3, role: 'cable' }];
    }
    const anchor = t.pulley ?? (kind === 'band' ? { x: points[0].x, y: GROUND } : { x: points[0].x + 60, y: 8 });
    for (const [i, p] of points.entries()) out.push({ kind: 'line', a: p, b: t.pulleys?.[i] ?? anchor, width: 1.5, role: 'cable' });
    if (kind === 'cable') out.push({ kind: 'circle', c: anchor, r: 4, role: 'scenery' });
    return out;
  }
  if (kind === 'barbell' && s.view === 'side') {
    if (t.pivot) out.push({ kind: 'line', a: t.pivot, b: points[0], width: 3, role: 'load' });
    // Seen end-on from the side: one plate at the bar.
    out.push({ kind: 'circle', c: points[0], r: 11, role: 'load' });
    out.push({ kind: 'circle', c: points[0], r: 2.5, role: 'joint' });
    return out;
  }
  if (kind === 'barbell' && s.view === 'front' && points.length === 2) {
    if (t.pivot) {
      const end = along(points[0], points[1], 0.5);
      return [{ kind: 'line', a: t.pivot, b: end, width: 3.5, role: 'load' }, { kind: 'circle', c: end, r: 8, role: 'load' }, { kind: 'circle', c: t.pivot, r: 4, role: 'scenery' }];
    }
    out.push({ kind: 'line', a: { x: points[0].x - 14, y: points[0].y }, b: { x: points[1].x + 14, y: points[1].y }, width: 3, role: 'load' });
    return out;
  }
  for (const p of points) {
    if (kind === 'kettlebell') {
      if (s.view === 'front' && points.length === 2 && distance(points[0], points[1]) < 20 && p === points[1]) continue;
      const center = s.view === 'front' && points.length === 2 && distance(points[0], points[1]) < 20 ? along(points[0], points[1], 0.5) : p;
      out.push({ kind: 'circle', c: { x: center.x, y: center.y + 6 * Math.cos((s.view === 'side' ? s.handRoll ?? 0 : 0) * Math.PI / 180) }, r: 6, role: 'load' });
    }
    else if (kind === 'machine' && t.machineBar && s.view === 'side') out.push({ kind: 'circle', c: p, r: 8, role: 'load' });
    else if (kind === 'machine') out.push({ kind: 'line', a: { x: p.x - 5, y: p.y }, b: { x: p.x + 5, y: p.y }, width: 3.5, role: 'load' });
    else {
      const angle = s.view === 'side' && s.handRoll !== undefined ? s.handRoll * Math.PI / 180
        : t.grip === 'neutral' ? Math.PI / 2 : t.grip === 'rotating' && s.view === 'side'
          ? Math.atan2(s.handTip.y - s.wrist.y, s.handTip.x - s.wrist.x) : 0;
      out.push({ kind: 'line', a: { x: p.x - 5 * Math.cos(angle), y: p.y - 5 * Math.sin(angle) }, b: { x: p.x + 5 * Math.cos(angle), y: p.y + 5 * Math.sin(angle) }, width: 6, role: 'load' });
    }
  }
  return out;
}

const viewBoxes = new Map<string, string>();
/** Fit the whole repetition (including plates), so the camera never jumps or crops. */
export function motionViewBox(template: MotionTemplate, load: LoadKind): string {
  const key = template.id + ':' + load;
  const cached = viewBoxes.get(key);
  if (cached) return cached;
  let left = 0, top = 0, right = 200, bottom = 190;
  for (let i = 0; i <= 20; i++) for (const alternate of [false, true]) {
    const shapes = figureShapes(template, solve(sampleMotion(template, i / 20, alternate)), { primary: [], secondary: [] }, load);
    for (const shape of shapes) {
      const points = shape.kind === 'line' ? [shape.a, shape.b] : shape.kind === 'circle' ? [shape.c] : shape.points;
      const pad = (shape.kind === 'line' ? shape.width / 2 : shape.kind === 'circle' ? shape.r : 0) + 4;
      for (const p of points) { left = Math.min(left, p.x - pad); top = Math.min(top, p.y - pad); right = Math.max(right, p.x + pad); bottom = Math.max(bottom, p.y + pad); }
    }
  }
  const result = `${left} ${top} ${right - left} ${bottom - top}`;
  viewBoxes.set(key, result);
  return result;
}

/** Back-to-front draw order: ground, scenery, body, then the load in hand. */
export function figureShapes(
  template: MotionTemplate,
  skeleton: Skeleton,
  emphasis: MuscleEmphasis,
  load: LoadKind
): Shape[] {
  return [
    ...(!template.camera ? [{ kind: 'line' as const, a: { x: 6, y: GROUND + 1 }, b: { x: 194, y: GROUND + 1 }, width: 1, role: 'ground' as const }] : []),
    ...sceneryShapes(template),
    ...(template.loadBehind ? loadShapes(template, skeleton, load) : []),
    ...(skeleton.view === 'side' ? sideShapes(skeleton, emphasis) : frontShapes(skeleton, emphasis)),
    ...(!template.loadBehind ? loadShapes(template, skeleton, load) : []),
    ...(template.resistance && skeleton.view === 'side' ? [{ kind: 'line' as const, a: skeleton.handTip,
      b: { x: 74, y: template.resistanceHigh ? 12 : 176 }, width: template.resistance === 'chain' ? 3 : 1.5, role: 'cable' as const }] : []),
    ...(template.footplate && skeleton.view === 'side' ? [{ kind: 'line' as const,
      a: { x: skeleton.toe.x - 6, y: skeleton.toe.y - 10 }, b: { x: skeleton.toe.x + 6, y: skeleton.toe.y + 10 }, width: 5, role: 'scenery' as const }] : []),
    ...(template.isometric ? [{ kind: 'line' as const, a: { x: 65, y: 28 }, b: { x: 80, y: 28 }, width: 2, role: 'cable' as const },
      { kind: 'poly' as const, points: [{ x: 80, y: 28 }, { x: 75, y: 24 }, { x: 75, y: 32 }], role: 'cable' as const }] : []),
  ];
}

/** Bone lengths of a side skeleton, for checks that limbs never stretch. */
export function sideBoneLengths(s: SideSkeleton) {
  return {
    shin: distance(s.knee, s.ankle),
    thigh: distance(s.hip, s.knee),
    torso: distance(s.hip, s.shoulder),
    upperArm: distance(s.armShoulder ?? s.shoulder, s.elbow),
    forearm: distance(s.elbow, s.wrist),
  };
}
