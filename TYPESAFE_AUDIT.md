# TypeSafe guide audit

Audited the 22 exercise guides with editorial overrides on 2026-10-09.
The audit compared the actual short-step transformation against the bundled full
instructions. It checks source fidelity, not the clinical validity of source
instructions, photo correctness, or all 189 guides.

TypeSafe returned model `jev-1.13.0`, using 10,629 input tokens and 908 output
tokens for 44 independent Noul questions in one request. No contradiction
probability reached 0.5; 19 omission probabilities reached 0.5. This threshold
was used only to prioritize manual inspection, not as a validated pass/fail rule.

## Confirmed editorial omissions

| Guide | Detail absent from the shortened steps | Omission probability |
| --- | --- | --- |
| Barbell Ab Rollout | The source explicitly retains abdominal tension, back posture, and arms perpendicular to the floor. The short cues retain none of those controls. | 0.82 |
| Seated Barbell Military Press | The source specifies a grip wider than shoulder width and the overhead bar slightly in front of the head. The short cues omit those positions. | 0.78 |
| Bent Over Barbell Row | The source specifies a torso almost parallel to the floor and elbows close to the body. Neither remains in the short steps. | 0.65 |
| Bench Dips | The source specifies shoulder-width hands, legs extended forward, and elbows close. The short steps omit that setup and control detail. | 0.65 |

These details remain accessible through **Read full instructions**. The inline
card displays only the first three short steps, while the modal displays all
short steps by default. The audit evaluated the modal's complete short sequence;
the inline card needs a separate completeness assessment.

The Glute Kickback omission flag (0.68) was not confirmed as a major loss: the
short steps retain hand spacing, knee angle, thigh alignment, and alternating
legs. Do not treat every model flag as a defect. The other flagged guides still
need individual editorial decisions before any automatic changes.

## Other checks

`npm run validate` passed: TypeScript and all seven test suites, including database
ownership/rollback tests and coverage for 189 guides and 378 bundled images.

The README prerequisite says Node 20+, while package.json requires Node 22.13+
and the Expo 57 versioned documentation specifies Node 22.13.x minimum.
The README's initial database setup list stops at migration 004; migration 005
and 006 are present and the custom-program section separately requires 006.
These setup instructions should be brought into agreement.

## Reproduce

```sh
TYPESAFE_API_KEY=your_key node --import tsx scripts/audit-guide-cues.mjs /tmp/grit-guide-audit.json
npm run validate
```

Set the key through a private process environment; never use an EXPO_PUBLIC
variable. The script sends only bundled instructions and their shortened cues,
with no account or workout records. The JSON output retains all source text,
displayed steps, and raw probabilities for review. There is no AI call in the app.

References: [TypeSafe API](https://docs.typesafe.ai/api),
[Noul question guidance](https://docs.typesafe.ai/primitives/noul),
[Expo 57 reference](https://docs.expo.dev/versions/v57.0.0/).
