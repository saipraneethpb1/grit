# Exercise animation audit — 2026-10-17

## Implementation update

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
