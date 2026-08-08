import { useMemo, useState } from 'react';
import { EXERCISES } from '@/src/domain/catalog';
import { MUSCLE_GROUPS } from '@/src/domain/muscles';
import type { Exercise, MuscleGroup } from '@/src/domain/types';

export function useExerciseLibrary() {
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | 'all'>('all');

  const exercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    return EXERCISES.filter((ex) => {
      if (muscleFilter !== 'all') {
        const hit =
          ex.primary_muscles.includes(muscleFilter) ||
          ex.secondary_muscles.includes(muscleFilter);
        if (!hit) return false;
      }
      if (!q) return true;
      return (
        ex.name.toLowerCase().includes(q) ||
        ex.primary_muscles.some((m) => m.includes(q)) ||
        ex.equipment.some((e) => e.includes(q))
      );
    });
  }, [search, muscleFilter]);

  return {
    exercises,
    search,
    setSearch,
    muscleFilter,
    setMuscleFilter,
    muscleOptions: MUSCLE_GROUPS,
  };
}

export function useExercise(id: string | undefined): Exercise | undefined {
  return useMemo(() => EXERCISES.find((e) => e.id === id), [id]);
}
