import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { EXERCISE_SOURCE_META } from '@/src/domain/catalog';
import { METHODOLOGIES } from '@/src/domain/methodologies';
import { EXTERNAL_RESOURCES } from '@/src/domain/resources';

export default function SourcesScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>
        Grit embeds open exercise data only. Books and commercial sites are recommended reading —
        we do not copy their text or programs.
      </Text>

      <View style={styles.block}>
        <Text style={styles.blockTitle}>Exercise data</Text>
        <Text style={styles.body}>{EXERCISE_SOURCE_META.source}</Text>
        <Text style={styles.meta}>{EXERCISE_SOURCE_META.license}</Text>
        <Text style={styles.meta}>{EXERCISE_SOURCE_META.count} movements</Text>
      </View>

      <Text style={styles.section}>Resources</Text>
      {EXTERNAL_RESOURCES.map((r) => (
        <View key={r.id} style={styles.block}>
          <Text style={styles.blockTitle}>{r.title}</Text>
          {r.author ? <Text style={styles.meta}>{r.author}</Text> : null}
          <Text style={styles.body}>{r.why}</Text>
          {r.url ? (
            <Pressable onPress={() => WebBrowser.openBrowserAsync(r.url!)} style={styles.link}>
              <Text style={styles.linkText}>Open</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      <Text style={styles.section}>Training systems</Text>
      {METHODOLOGIES.map((m) => (
        <View key={m.id} style={styles.block}>
          <Text style={styles.blockTitle}>{m.name}</Text>
          <Text style={styles.meta}>{m.inspiredBy}</Text>
          <Text style={styles.body}>{m.description}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.space.lg, paddingBottom: theme.space.xl },
  lead: { ...theme.font.body, color: theme.colors.textSecondary, marginBottom: theme.space.lg },
  section: { ...theme.font.bodyMedium, color: theme.colors.text, marginTop: theme.space.md, marginBottom: theme.space.sm },
  block: {
    borderTopWidth: theme.hairline,
    borderTopColor: theme.colors.border,
    paddingVertical: theme.space.md,
  },
  blockTitle: { ...theme.font.bodyMedium, color: theme.colors.text, marginBottom: 4 },
  body: { ...theme.font.caption, color: theme.colors.textSecondary, lineHeight: 20 },
  meta: { ...theme.font.caption, color: theme.colors.textMuted, marginTop: 2 },
  link: { marginTop: theme.space.sm },
  linkText: { ...theme.font.caption, color: theme.colors.text, textDecorationLine: 'underline' },
});
