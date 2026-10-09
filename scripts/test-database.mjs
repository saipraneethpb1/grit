import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { nextRotationIndex, nextStreak } from '../src/domain/sessionComplete.ts';
import { xpForSession } from '../src/domain/progression.ts';
const db = new PGlite();
await db.exec(`create role authenticated; create role anon; create schema auth;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
for (const file of ['001_init.sql','002_sessions.sql','003_account_deletion.sql','004_progression.sql','005_security_and_atomic_plans.sql','006_custom_programs.sql','007_atomic_sessions.sql']) {
 await db.exec(readFileSync(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'));
}
await db.exec(`grant usage on schema public to authenticated; grant all on all tables in schema public to authenticated;
insert into auth.users values ('00000000-0000-0000-0000-000000000001','a@example.com','{}'), ('00000000-0000-0000-0000-000000000002','b@example.com','{}');
insert into public.split_templates(id,name,days_per_week) values('test','Test',1);
insert into public.exercises(id,name,movement_pattern) values('00000000-0000-0000-0000-000000000003','Test','squat');
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';`);
const payload = { template_id:'test', name:'Test program', days:[{day_index:0,name:'Day',focus_muscles:[],exercises:[{exercise_id:'00000000-0000-0000-0000-000000000003',sort_order:0,target_sets:3,target_reps_min:8,target_reps_max:12}]}] };
const save = p => db.query('select public.save_generated_plan($1::jsonb) as id',[JSON.stringify(p)]);
const first = (await save(payload)).rows[0].id;
const invalid = structuredClone(payload); invalid.days[0].exercises[0].exercise_id='00000000-0000-0000-0000-000000000099';
await assert.rejects(save(invalid));
assert.equal((await db.query('select id from workout_plans where is_active')).rows[0].id,first);
assert.equal((await db.query('select count(*)::int as n from workout_plans')).rows[0].n,1);
const day = (await db.query('select id from plan_days')).rows[0].id;
await db.exec(`set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002'`);
assert.equal((await db.query('select * from workout_plans')).rows.length,0);
await assert.rejects(db.query(`insert into workout_sessions(user_id,plan_id,plan_day_id) values(auth.uid(),$1,$2)`,[first,day]));
const second=(await save(payload)).rows[0].id;
const secondDay=(await db.query('select id from plan_days')).rows[0].id;
await db.query(`insert into workout_sessions(user_id,plan_id,plan_day_id) values(auth.uid(),$1,$2)`,[second,secondDay]);
const custom = { ...payload, template_id: 'custom', name: 'My custom program' };
const customId = (await save(custom)).rows[0].id;
assert.equal((await db.query('select template_id from workout_plans where id = $1', [customId])).rows[0].template_id, 'custom');
assert.equal((await db.query('select count(*)::int as n from workout_plans where is_active')).rows[0].n, 1);
assert.equal((await db.query('select count(*)::int as n from workout_sessions')).rows[0].n, 1);

// ---- 007: atomic start / finish -------------------------------------------
const USER_A = '00000000-0000-0000-0000-000000000001';
const USER_B = '00000000-0000-0000-0000-000000000002';
const EXERCISE = '00000000-0000-0000-0000-000000000003';
const actAs = (id) => db.exec(`reset role; set role authenticated; set request.jwt.claim.sub = '${id}'`);
const asAdmin = () => db.exec('reset role');
const start = async (dayId) => (await db.query('select * from public.start_workout_session($1)', [dayId])).rows[0];
const finish = async (sessionId, sets, today) =>
  (await db.query('select public.complete_workout_session($1, $2::jsonb, $3::date) as r', [sessionId, JSON.stringify(sets), today])).rows[0].r;
const profileOf = async (id) => { await asAdmin(); const row = (await db.query('select * from profiles where id = $1', [id])).rows[0]; return row; };
const today = (await db.query(`select current_date::text as d`)).rows[0].d;
const daysAgo = async (n) => (await db.query(`select (current_date - $1::int)::text as d`, [n])).rows[0].d;

async function planWithDays(n) {
  const days = Array.from({ length: n }, (_, i) => ({ day_index: i, name: `Day ${i + 1}`, focus_muscles: [],
    exercises: [{ exercise_id: EXERCISE, sort_order: 0, target_sets: 3, target_reps_min: 8, target_reps_max: 12 }] }));
  const planId = (await save({ template_id: 'test', name: `${n}-day`, days })).rows[0].id;
  const rows = (await db.query(`select d.id, d.day_index, pe.id as pe from plan_days d join plan_exercises pe on pe.plan_day_id = d.id
    where d.plan_id = $1 order by d.day_index`, [planId])).rows;
  return rows;
}
const setsFor = (day, n) => Array.from({ length: n }, (_, i) => ({ plan_exercise_id: day.pe, exercise_id: EXERCISE,
  exercise_name: 'Test', set_number: i + 1, target_reps: 10, reps: 10, weight: 20 }));

// User B already holds an in_progress session from above; starting another abandons it.
await actAs(USER_B);
const bDays = await planWithDays(1);
const opened = await start(bDays[0].id);
assert.equal(opened.status, 'in_progress');
assert.equal(opened.day_name, 'Day 1');
assert.equal((await db.query(`select count(*)::int as n from workout_sessions where status = 'in_progress'`)).rows[0].n, 1);

// Another account cannot open a session on B's day, or finish B's session.
await actAs(USER_A);
await assert.rejects(start(bDays[0].id));
await assert.rejects(finish(opened.id, setsFor(bDays[0], 1), today));

// A rejected finish leaves nothing behind.
await actAs(USER_B);
const badSets = setsFor(bDays[0], 2); badSets[1].reps = -1;
await assert.rejects(finish(opened.id, badSets, today));
assert.equal((await db.query('select status from workout_sessions where id = $1', [opened.id])).rows[0].status, 'in_progress');
assert.equal((await db.query('select count(*)::int as n from session_sets')).rows[0].n, 0);
await assert.rejects(finish(opened.id, [], today));

// First finish counts; a retry after a lost response is a no-op.
const finished = await finish(opened.id, setsFor(bDays[0], 2), today);
assert.equal(finished.counted, true);
assert.equal(finished.setsCompleted, 2);
assert.equal(Number(finished.volume), 400);
assert.deepEqual(finished.xp, xpForSession({ setsCompleted: 2, streak: 1 }));
assert.equal(finished.after.totalXp, finished.xp.total);
await actAs(USER_B);
const retry = await finish(opened.id, setsFor(bDays[0], 3), today);
assert.equal(retry.counted, false);
assert.deepEqual(retry.after, finished.after);
const bProfile = await profileOf(USER_B);
assert.equal(bProfile.workouts_completed, 1);
assert.equal(bProfile.total_sets, 2);
assert.equal((await db.query('select count(*)::int as n from session_sets')).rows[0].n, 2);

// A wildly wrong device clock falls back to the server date.
await actAs(USER_B);
const skewed = await start(bDays[0].id);
await finish(skewed.id, setsFor(bDays[0], 1), '1999-01-01');
assert.equal((await db.query(`select last_workout_date::text as d from profiles where id = $1`, [USER_B])).rows[0].d, today);

// Parity: the SQL rules must agree with the TypeScript domain on every case.
let parityCases = 0;
for (const dayCount of [1, 3, 6]) {
  await actAs(USER_A);
  const days = await planWithDays(dayCount);
  for (const gap of [null, -1, 0, 1, 2, 4, 5, 6, 7, 8]) {
    for (const streak of [0, 4, 9]) {
      for (const rotation of [0, dayCount - 1]) {
        const trained = days[dayCount - 1];
        const lastDate = gap === null ? null : await daysAgo(gap);
        await asAdmin();
        await db.query(`update profiles set current_streak = $2, last_workout_date = $3::date, current_day_index = $4,
          workouts_completed = 0, total_xp = 0, total_sets = 0, total_volume = 0, longest_streak = 0 where id = $1`,
          [USER_A, streak, lastDate, rotation]);
        await db.query(`delete from workout_sessions where user_id = $1`, [USER_A]);
        await actAs(USER_A);
        const session = await start(trained.id);
        const result = await finish(session.id, setsFor(trained, 3), today);

        const expectedStreak = nextStreak({ lastWorkoutDate: lastDate, currentStreak: streak, today, daysPerWeek: dayCount });
        const expectedXp = xpForSession({ setsCompleted: 3, streak: expectedStreak });
        const expectedDay = nextRotationIndex({ finishedDayIndex: trained.day_index, rotationIndex: rotation, dayCount });
        const label = `days=${dayCount} gap=${gap} streak=${streak} rotation=${rotation}`;
        assert.equal(result.streak, expectedStreak, `streak ${label}`);
        assert.deepEqual(result.xp, expectedXp, `xp ${label}`);
        assert.equal((await profileOf(USER_A)).current_day_index, expectedDay, `rotation ${label}`);
        parityCases += 1;
      }
    }
  }
}

await db.exec('reset role; set role anon;');
await assert.rejects(save(payload));
await assert.rejects(db.query(`select public.start_workout_session($1)`, [bDays[0].id]));
console.log('PASS: migrations, transactional rollback, owner isolation, cross-account session rejection, valid session, anonymous RPC rejection');
console.log(`PASS: atomic start/finish, rollback on invalid sets, idempotent retry, clock-skew guard, ${parityCases} SQL/TypeScript parity cases`);
await db.close();
