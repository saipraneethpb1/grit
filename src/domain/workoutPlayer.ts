/**
 * State machine for the live workout player: which set is in focus, edits to
 * it, and marking it done. Kept free of React so every transition is covered by
 * scripts/test-workout-player.ts — the screen only dispatches and renders.
 */

import {
  parseRepsValue,
  parseWeightValue,
  sanitizeRepsInput,
  sanitizeWeightInput,
} from './liveWorkout';
import type { LiveExercise, LiveSet } from './types';

export const WEIGHT_STEP = 2.5;

export type PlayerState = {
  exercises: LiveExercise[];
  exerciseIndex: number;
  setIndex: number;
};

export type PlayerAction =
  | { type: 'load'; exercises: LiveExercise[] }
  | { type: 'editWeight'; raw: string }
  | { type: 'editReps'; raw: string }
  | { type: 'stepWeight'; direction: 1 | -1 }
  | { type: 'stepReps'; direction: 1 | -1 }
  | { type: 'completeSet' }
  | { type: 'undoSet' }
  /** Move focus to the next set, or the next exercise's first set. */
  | { type: 'advance' }
  | { type: 'selectSet'; setIndex: number }
  /** Jump to an exercise, landing on its first unfinished set. */
  | { type: 'selectExercise'; exerciseIndex: number };

export const initialPlayerState: PlayerState = { exercises: [], exerciseIndex: 0, setIndex: 0 };

/** "95" not "95.0", "92.5" not "92.50". */
export function formatWeight(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function currentSet(state: PlayerState): LiveSet | undefined {
  return state.exercises[state.exerciseIndex]?.sets[state.setIndex];
}

/** Patch the focused set; a no-op when nothing is focused. */
function patchCurrent(state: PlayerState, patch: Partial<LiveSet>): PlayerState {
  if (!currentSet(state)) return state;
  return {
    ...state,
    exercises: state.exercises.map((ex, i) =>
      i !== state.exerciseIndex
        ? ex
        : { ...ex, sets: ex.sets.map((s, j) => (j === state.setIndex ? { ...s, ...patch } : s)) }
    ),
  };
}

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'load':
      return { exercises: action.exercises, exerciseIndex: 0, setIndex: 0 };

    case 'editWeight':
      return patchCurrent(state, { weight: sanitizeWeightInput(action.raw) });

    case 'editReps':
      return patchCurrent(state, { reps: sanitizeRepsInput(action.raw) });

    case 'stepWeight': {
      const set = currentSet(state);
      if (!set) return state;
      const base = parseWeightValue(set.weight) ?? 0;
      return patchCurrent(state, {
        weight: formatWeight(Math.max(0, base + action.direction * WEIGHT_STEP)),
      });
    }

    case 'stepReps': {
      const set = currentSet(state);
      if (!set) return state;
      const base = parseRepsValue(set.reps, set.targetReps) ?? 0;
      return patchCurrent(state, { reps: String(Math.max(0, base + action.direction)) });
    }

    case 'completeSet':
      return currentSet(state)?.completed === false
        ? patchCurrent(state, { completed: true })
        : state;

    case 'undoSet':
      return patchCurrent(state, { completed: false });

    case 'advance': {
      const ex = state.exercises[state.exerciseIndex];
      if (!ex) return state;
      if (state.setIndex < ex.sets.length - 1) return { ...state, setIndex: state.setIndex + 1 };
      if (state.exerciseIndex < state.exercises.length - 1) {
        return { ...state, exerciseIndex: state.exerciseIndex + 1, setIndex: 0 };
      }
      return state;
    }

    case 'selectSet': {
      const ex = state.exercises[state.exerciseIndex];
      if (!ex || action.setIndex < 0 || action.setIndex >= ex.sets.length) return state;
      return { ...state, setIndex: action.setIndex };
    }

    case 'selectExercise': {
      const ex = state.exercises[action.exerciseIndex];
      if (!ex) return state;
      const firstOpen = ex.sets.findIndex((s) => !s.completed);
      return { ...state, exerciseIndex: action.exerciseIndex, setIndex: Math.max(0, firstOpen) };
    }
  }
}

export type PlayerSummary = {
  totalSets: number;
  doneSets: number;
  /** 0..1, for the header bar. */
  progress: number;
  allDone: boolean;
  /** Focus is on the final set of the final exercise — nothing left to rest for. */
  isLastSet: boolean;
  /** What the rest timer is counting down to. */
  nextLabel: string;
};

export function summarizePlayer(state: PlayerState): PlayerSummary {
  const { exercises, exerciseIndex, setIndex } = state;
  let totalSets = 0;
  let doneSets = 0;
  for (const ex of exercises) {
    totalSets += ex.sets.length;
    for (const s of ex.sets) if (s.completed) doneSets += 1;
  }

  const current = exercises[exerciseIndex];
  const isLastSet =
    exerciseIndex === exercises.length - 1 && setIndex === (current?.sets.length ?? 1) - 1;

  let nextLabel = '';
  if (current) {
    if (setIndex < current.sets.length - 1) {
      nextLabel = `${current.name} · set ${setIndex + 2}`;
    } else {
      nextLabel = exercises[exerciseIndex + 1]?.name ?? 'Finish';
    }
  }

  return {
    totalSets,
    doneSets,
    progress: totalSets ? doneSets / totalSets : 0,
    allDone: totalSets > 0 && doneSets === totalSets,
    isLastSet,
    nextLabel,
  };
}
