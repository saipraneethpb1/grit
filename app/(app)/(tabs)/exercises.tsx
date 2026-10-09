import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { ExerciseRow } from '@/src/components/ExerciseRow';
import { MuscleChip } from '@/src/components/MuscleChip';
import { EXERCISE_SOURCE_META } from '@/src/domain/catalog';
import type { Exercise } from '@/src/domain/types';
import { useExerciseLibrary } from '@/src/hooks/useExercises';

export default function ExercisesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    exercises,
    search,
    setSearch,
    muscleFilter,
    setMuscleFilter,
    muscleOptions,
  } = useExerciseLibrary();

  const openExercise = useCallback(
    (id: string) => {
      router.push({ pathname: '/(app)/exercises/[id]', params: { id } });
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => (
      <ExerciseRow exercise={item} onPress={() => openExercise(item.id)} />
    ),
    [openExercise]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 18 }]}>
      <Text style={styles.title}>Library</Text>
      <Text style={styles.subtitle}>Find your next movement.</Text>

      <View style={styles.search}>
        <Ionicons name="search" size={14} color={theme.colors.textDim} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={`Search ${EXERCISE_SOURCE_META.count} movements`}
          placeholderTextColor={theme.colors.textDim}
          selectionColor={theme.colors.accent}
          autoCorrect={false}
          accessibilityLabel="Search exercises"
          style={styles.searchInput}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipScroll}
        keyboardShouldPersistTaps="handled"
      >
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
      </ScrollView>

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
        // Without this a tap while the keyboard is open is swallowed by the
        // dismiss, so the first tap on a result never opens it.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={12}
        windowSize={9}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.count}>{exercises.length} movements</Text>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No exercises match your filters.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: theme.space.lg, backgroundColor: theme.colors.background },
  title: { ...theme.font.display, color: theme.colors.text, marginBottom: 6 },
  subtitle: { ...theme.font.body, color: theme.colors.textMuted, marginBottom: 24 },
  search: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    ...theme.card,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    fontFamily: theme.fontFamily.regular,
    fontSize: 14,
    color: theme.colors.text,
  },
  chipScroll: { flexGrow: 0, marginBottom: 14, marginHorizontal: -theme.space.lg },
  chips: { gap: 7, paddingHorizontal: theme.space.lg },
  list: { paddingBottom: theme.space.lg },
  count: { ...theme.font.kicker, color: theme.colors.textMuted, marginBottom: 14 },
  empty: { ...theme.font.body, color: theme.colors.textDim, marginTop: theme.space.lg },
});
