# Exercise animation audit — 2026-10-17

## Anatomical replacement — completed 2026-10-20

All **189/189 exercises** now select reviewed anatomical position sheets. The CSV
retains the original findings and adds current anatomical status/review notes.
The provided textbook depiction guided the muscle-fiber style and coral target-muscle
emphasis. Original exercise photographs are pose references, not replacement UI images.

The final review corrected wrist curls that lifted the forearm or changed grip,
windmill poses that switched working arms, a detached hip-adduction support hand,
forearm supination with inconsistent load geometry, and flutter kicks that either
repeated one raised leg or bent the knee. The accepted flutter-kick drawing keeps
both knees straight and alternates hip extension with the hips at the bench edge.
Rocking calf raises distinguish heel lifts from toe lifts and highlight calf versus
anterior-shin work. Inconsistent photographic faces were replaced with mannequins.

Explicit sequences start V-Bar Pulldown, Behind-Neck Pulldown, Stiff-Legged Deadlift
and Standing Palms-In Press from their true starting positions. Compound sequences
preserve Cuban rotation/press/lowering, lockout between press and skull crusher,
the shoulder catch before an overhead press, and Pallof return through extended neutral.
Neck isometrics repeat stationary hold poses rather than implying repeated neck bending.

A third review of the sixteen final drawings rejected Seated Palm-Up Barbell Wrist Curl:
it draws an overhand grip, which is the reverse wrist curl. It shows the exact rig until
redrawn; the job is queued in `data/exercise-anatomy-final-revisions.json`. Neck side
labels no longer name a side (a mirrored figure made "left temple" read backwards), and
supination and windmill sheets gained phase labels in place of the generic defaults.

A full pass over every displayed sheet then checked equipment (plates on both bar ends,
bars and handles held, cables attached), contact with benches and floor, grip, pose order
and style. Two more were rejected: Calf Raise On A Dumbbell, whose feet hover behind the
dumbbell instead of standing on it, and Hyperextensions With No Hyperextension Bench,
whose partner is a photographic person. No sheet had a missing plate or one-sided load.
A further bar check rejected eight barbell sheets whose bar could not be read. Five pure side
views (Bench Press - Powerlifting, Floor Press, Floor Press with Chains, Bench Press with
Chains, Board Press) show the bar end-on, so the hand appears to grip the sleeve beside a
single plate; Board Press has no plate on the near sleeve at all. Three (Decline Close-Grip
Bench To Skull Crusher, Bent-Arm Barbell Pullover, Press Sit-Up) draw the bar as a stub
that reads as a dumbbell. All eleven rejected sheets have redraw jobs queued; the bar
jobs ask for a three-quarter view showing the whole bar, both hands and both plates.

All eleven redraws were then inspected and accepted: the wrist curl is palms up, the feet
stand on the dumbbell handle, the hyperextension partner is a mannequin, and every barbell
sheet shows the full bar with both hands and loaded plates on both sleeves. Bent-Arm
Barbell Pullover plays from the bar over the chest (`[2,1,0,1]`).

A third full review rejected five more. Barbell Guillotine Bench Press was drawn from the
feet, so the bar passed in front of the head and appeared to strike the face; the exercise
lowers the bar to just above the neck, which the redraw shows from a three-quarter side
view. Box Squat, Kneeling Jump Squat, Rocking Standing Calf Raise and Barbell Ab Rollout
were pure side views with the bar end-on and one plate hidden. Seven correct sheets still
drew a face (Barbell Deadlift, Dumbbell Squat To A Bench, Jerk Dip Squat, High Cable Curls,
Kneeling Squat, Narrow Stance Squats, Dumbbell Lying Pronation); they stay visible while
faceless redraws are made. All twelve redraws were then accepted: the guillotine shows the
bar above the neck with the head flat beneath it.

Playback now shows only the start and end positions for 173 simple movements, holding each
for 1.8 s. The end pose is each sheet's working position, checked by eye for every sheet.
Six presses whose instructions start at lockout but were drawn from the chest play
lockout first; Jerk Dip Squat ends in its dip. Sixteen multi-phase, alternating or
two-direction movements keep every pose, and `test:anatomy` enforces the split.

The player crossfades authored positions without warping images. Repeated cells skip
the fade so holds never disappear; rapid stepping updates the current and prior poses
atomically. Image errors now notify the shared wrapper and trigger the exact rig
fallback. Missing full-size or thumbnail bindings also use that fallback. WebP sheets
and thumbnails total approximately 23 MB. Some drawings still shift slightly in framing
between cells; crossfades soften those cuts without inventing intermediate anatomy.

TypeScript and all **12 test suites** passed, including a coverage assertion that
only the listed redraws may be unreviewed. Expo compatibility passed for all 20 managed packages. Mobile
browser checks at 390×844 passed WebP decoding/crops, authored order, crossfade
completion, repeated holds, rapid stepping, pause/play, thumbnails, reduced motion
and a simulated image-error fallback, with no uncaught browser errors. The temporary
public test route was removed and the local server stopped. Production export result
is recorded in the checkpoint. No account/workout data was changed during this work.

These are anatomical position illustrations, not motion capture, continuous 3D
simulation or independent coaching certification. Native-device testing remains
outstanding. Passing player tests is distinct from individual artwork review.

Source conflicts remain documented: High Cable Curls follows its standing high-pulley
name/instructions rather than the conflicting lying photos; Band Hip Adductions uses
the corrected inward movement. Lying dumbbell pronation/supination guides now describe
forearm rotation with supported elbow and straight wrist; Smith Reverse Calf Raise
names anterior-shin contraction. Guide overrides preserve these corrections through
imports. `scripts/apply-exercise-guide-overrides.mjs` synchronizes guide notes and
seed rows without reselecting the catalog or rewriting split seeds.

## Earlier articulated-rig implementation (historical)

The original articulated animations are restored and corrected. No library photos are substituted. All 189 exercises now have an explicit exercise-ID/source-ID entry in `data/exercise-motions.json`; `src/domain/exerciseMotions.ts` supplies the pose, equipment placement, and variant. Library thumbnails, details, and workout guides share that selection. Unknown exercises show an unavailable state rather than a guessed movement.

The corrections cover bench-supported dips, quadruped kickbacks, glute-ham raises, seated machine adduction/abduction, seated and prone variants, thigh-loaded calf raises, forefoot reverse raises, overhead cable curls, neck isometrics, shoulder-only raises, and staged clean/press, Cuban press, and Zottman movements. Deadlift naming collisions no longer select cleans or snatches. Squat and lunge variants now distinguish hanging, shoulder, and behind-body loads and bench/platform support. Flutter kicks use the source's prone bench setup with alternating legs. Press sit-ups combine trunk movement and pressing. Wrist and finger movements carry resistance with the hand; alternating limbs and torso rotation are represented.

The renderer now preserves support contacts, uses the short angular path, and frames the whole movement without camera jumps or clipped equipment. Overhead views and grip cues are labeled. Pause, manual pose stepping, reduced motion, and background suspension are supported.

### Verification and limits

All 189 mappings were checked against their bundled source identity and instructions. Contact sheets were inspected at start, midpoint, and end. Automated motion checks sample every exercise at 21 positions and both alternating phases for finite geometry, segment lengths, and reachable support contacts; specific regression checks cover the original major mismatches. TypeScript, all 11 test suites, Expo compatibility, and web export passed. Signed-in browser checks cover 11 representative exercise demonstrations, playback, pause, guide instructions, manual stepping, reduced motion, and library thumbnails, with no uncaught browser errors. These animation checks did not log another workout.

These remain stylized 2D figures, not motion capture or independent coaching validation. Native device testing remains outstanding. **Band Hip Adductions** now has corrected instructions: attach the band to the ankle nearest the anchor, pull inward across the supporting leg, and return under control. Full instructions and catalog setup notes agree with the animation. The correction is recorded in `data/exercise-guide-overrides.json` and applied by both import scripts so refreshing upstream data preserves it. The setup follows [ACE’s standing hip adduction guidance](https://www.acefitness.org/resources/everyone/exercise-library/104/standing-hip-adduction/).

The CSV preserves the original findings as `original_verdict` and records the current explicit variant. The historical findings below describe the pre-fix state.

## Original findings

**Verdict: the animations are not consistently faithful to the named exercises.** Basic movement families are recognizable, but several demos depict another exercise, and many variants lose their defining setup, load position, or movement.

## Scope and evidence

Inspected the mapping for all 189 catalog exercises. They currently use 37 distinct motion templates. Rendered every used template at its start, midpoint, and end using the same solver and shape generator as the application. Compared 12 selected exercises side by side with their bundled source photos and inspected bundled instructions for additional suspected mismatches. Checked interpolation and equipment attachment in code and reran the existing motion tests.

The [exercise checklist](ANIMATION_AUDIT.csv) records **62 named exercises with a confirmed mismatch** of varying severity. This is a lower bound, not an exhaustive failure rate: the remaining 127 exercises are marked “not individually cleared,” not passed. Their mappings and shared template geometry were inspected, but they have not all had an individual photo/instruction comparison. These findings concern fidelity to the project's own exercise sources, not independent validation of those sources as coaching advice.

## Highest-priority mismatches

| Named exercise | Current animation | What the bundled source requires |
| --- | --- | --- |
| Snatch Deadlift | Bar finishes overhead in a snatch. | Deadlift finishes standing with the bar held down. |
| Clean Deadlift | Bar is brought to the shoulders. | Deadlift lockout, without a clean catch. |
| Calf-Machine Shoulder Shrug | Standing heel raise. | Shoulder elevation under the machine pads. Also confirmed by the [upstream exercise record](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Calf-Machine_Shoulder_Shrug.json). |
| Upright Cable Row | Seated horizontal cable row. | Standing vertical pull toward the chin. |
| Bench Dips | Suspended dip on a bar, legs hanging. | Hands behind the body on a bench, legs extended forward with feet supported. |
| Glute Kickback | Standing leg kickback. | Hands-and-knees setup, raising a bent leg. |
| Glute Ham Raise | Lying leg curl with stationary torso. | Lower legs supported while the torso rises toward upright. |
| Press Sit-Up | Unweighted floor crunch. | Bench sit-up combined with a barbell press. |
| Anti-Gravity Press | Standing overhead press. | Face-down incline-bench setup, pressing out in front of the head. |
| Barbell Incline Shoulder Raise | Incline bench press, elbows bending. | Straight elbows with shoulder-blade protraction. |
| Bent Press / Double Kettlebell Windmill | Generic two-arm diagonal sweep, stationary torso. | Distinct side-bending movement and overhead load arrangement. |
| Isometric Neck Exercise — both variants | Repeated side tilt of the head. | Resist movement; front/back variant also requires a different direction of resistance. |

## Other confirmed setup and movement losses

| Group | Issue |
| --- | --- |
| Dumbbell Squat To A Bench | No bench; dumbbells shown near shoulders rather than hanging at the sides. This is the first exercise of the current account's Session A. |
| Box / bench squats | No box or bench contact. |
| Kneeling Squat / Kneeling Jump Squat | Ordinary foot-supported squat replaces kneeling setup; jump transition absent. |
| Barbell Hack Squat / Jefferson Squats | Shoulder-level load replaces the behind-body or straddled hanging bar. |
| Good Morning variants | Hands-down deadlift animation replaces upper-back bar placement. |
| Barbell Lunge / Elevated Back Lunge | Load shown at the side instead of on the upper back; elevated variant lacks its platform. |
| Step-up with Knee Raise | Ordinary floor lunge; no step or raised free knee. |
| Floor press variants | Bench appears instead of floor support and the floor-limited range. |
| Seated calf raises | Standing animation; bent knees and resistance over thighs absent. |
| Machine calf presses | Standing animation replaces seated/platform setup. |
| Smith Machine Reverse Calf Raises | Raises heels rather than lifting forefeet with heels supported. |
| Thigh Abductor / Thigh Adductor | Standing straight-legged spread replaces seated machine setup with bent knees. |
| High Cable Curls / Overhead Cable Curl | Upper arms hang beside torso instead of staying elevated sideways. |
| Lying / prone curls | Upright seated curl replaces lying or prone posture. |
| Alternate Incline Dumbbell Curl | Standing curl omits reclined position and alternating sides. |
| Dumbbell Shoulder Press | Source specifies seated back support; template stands. |
| Straight Bar Bench Mid Rows | Source specifies standing on the bench behind the bar; animation stands on the floor. |
| Around The Worlds / Decline Dumbbell Flyes | Standing front-view arm sweep replaces the lying semicircle or decline-bench fly. |
| Barbell Ab Rollout / Barbell Rollout from Bench | Both show floor-kneeling rollout; source distinguishes push-up-position hip rollout from bench-kneeling rollout. |
| Flutter Kicks | Legs move together rather than alternating. |
| Flat Bench Leg Pull-In | Straight-leg raise replaces bent-knee pull-in. Source permits a bench or mat, so missing bench alone is not the defect. |
| Gorilla Chin/Crunch | Hanging leg raise omits simultaneous chin-up and elbow bending. |
| Monster Walk | Both legs spread in place; no alternating walking sequence. |
| Cable Russian Twists | Standing diagonal sweep replaces rotation while supported on a stability ball. |
| Dumbbell Lying Pronation / Supination | Seated wrist bending replaces the bundled lying rotational movement. |
| Finger Curls | Wrist bending replaces finger opening/closing and bar roll. |
| Clean and Press / Cuban Press | Only overhead press shown; defining earlier stages omitted. |

Exact exercise names and per-exercise reasons are in the CSV. Some other grip, stance, one-arm, alternating, and equipment variants also share templates; those should be individually checked before declaring them correct.

## Problems within the rendering system

1. **Wrist-curl resistance stays fixed while the hand moves.** `motionShapes.ts:133` places hand-held equipment at the wrist coordinate. In the wrist-curl template, the wrist stays at `(143.365, 123.050)` throughout, while the hand tip rotates. Consequently the bar/dumbbell does not follow the hand through the curl. This affects all 15 exercises assigned to `wrist_curl`, in addition to their individual classification issues.
2. **Skull-crusher interpolation takes an excessive arc.** `blendPose` linearly interpolates angles. The forearm goes from 172° through 58.5° to −55°, a 227° sweep rather than the shorter path. The midpoint carries the load toward the torso before reaching the head side. The assigned exercise also loses its decline bench and combined press component.
3. **Rotation template does not rotate the torso.** Only the hand targets move; trunk, hips, and legs remain fixed. It cannot faithfully show the distinct actions of all nine assigned exercises.
4. **Lower-body resistance can disappear.** `loadShapes` returns immediately for `load: 'none'`. This suppresses bands/cables for hip-abduction/adduction and kickback templates, even when that resistance is central to the named exercise.
5. **Machine and support geometry is incomplete.** Leg press has leg motion but no moving footplate/load; several machine variants get only a small hand-level mark. Benches, platforms, pads, and resistance attachment points need exercise-specific representation.

## Why current tests miss this

The motion suite passes. It checks finite geometry, segment lengths, frame bounds, anchored points, muscle-color presence, timeline behavior, and selected template names. Those checks do not establish exercise fidelity.

Some assertions explicitly accept questionable mappings, including Bench Dips → `dip`, Glute Ham Raise → `leg_curl`, Flutter Kicks → `leg_raise`, and Seated Calf Raise → `calf_raise`. Several naming errors are also untested. Matching an intended template key is insufficient when the template itself depicts the wrong setup.

## Suggested implementation order

1. Add exact exercise-ID overrides for the four rule collisions: Snatch Deadlift, Clean Deadlift, Calf-Machine Shoulder Shrug, Upright Cable Row.
2. Provide distinct templates for the high-priority posture/action mismatches; use existing source photos where a faithful animation is unavailable.
3. Separate support posture, load position, unilateral/alternating behavior, and equipment attachment from the broad movement family.
4. Fix wrist/load coupling and angle interpolation, then add source-based acceptance criteria and midpoint checks. Existing assertions that encode incorrect mappings must change.
5. Review all 189 individually against their bundled references before presenting every animation as an exact exercise demonstration.

## Artifacts and changes

Local review and implementation evidence is in `/tmp/grit-motion-review/`. The current `comparison.html` and `comparison-0.png` / `comparison-1.png` compare the six retained figures with source photos. `fixed-*.png` captures the corrected application displays, and `browser-check.log` records the UI checks. Preview drawings use the same body/load primitives with simplified outline styling.

The initial audit added only this report and its checklist. The implementation update above describes the subsequent application changes.
