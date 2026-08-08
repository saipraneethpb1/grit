import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '@/constants/theme';
import { ExerciseRow } from '@/src/components/ExerciseRow';
import { MuscleChip } from '@/src/components/MuscleChip';
import { useExerciseLibrary } from '@/src/hooks/useExercises';

export default function ExercisesScreen() {
  const router = useRouter();
  const {
    exercises,
    search,
    setSearch,
    muscleFilter,
    setMuscleFilter,
    muscleOptions,
  } = useExerciseLibrary();

  return (
    <View style={styles.container}>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search"
        placeholderTextColor={theme.colors.textMuted}
        style={styles.search}
      />

      <View style={styles.chips}>
        <MuscleChip
          muscle="all"
          selected={muscleFilter === 'all'}
          onPress={() => setMuscleFilter('all')}
        />
        {muscleOptions.map((m) => (
          <MuscleChip
            key={m}
            muscle={m}
            selected={muscleFilter === m}
            onPress={() => setMuscleFilter(m)}
          />
        ))}
      </View>

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: theme.space.lg }}
        ListHeaderComponent={
          <Text style={styles.count}>{exercises.length} movements</Text>
        }
        renderItem={({ item }) => (
          <ExerciseRow
            exercise={item}
            onPress={() =>
              router.push({
                pathname: '/(app)/exercises/[id]',
                params: { id: item.id },
              })
            }
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No exercises match your filters.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.space.lg, backgroundColor: theme.colors.background },
  search: {
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.space.md,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: theme.space.md,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: theme.space.sm },
  count: { ...theme.font.caption, color: theme.colors.textMuted, marginBottom: theme.space.sm },
  empty: { ...theme.font.body, color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.space.lg },
});
