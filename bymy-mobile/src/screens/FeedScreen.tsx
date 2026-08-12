import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import { FEED_ITEMS } from "../data/sampleContent";
import { colors, radii, spacing } from "../theme";

export default function FeedScreen() {
  return (
    <View style={styles.page}>
      <ScreenHeader title="Hírfolyam" subtitle="Hírek · YouTube" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {FEED_ITEMS.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => {
              if (item.url) void Linking.openURL(item.url);
            }}
          >
            <View style={styles.badgeRow}>
              <Text style={[styles.badge, item.kind === "youtube" ? styles.badgeYt : styles.badgeNews]}>
                {item.kind === "youtube" ? "YouTube" : item.source}
              </Text>
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSub}>{item.subtitle}</Text>
          </Pressable>
        ))}
        <Text style={styles.hint}>
          Demo tartalom — később Autosweb hírek + YouTube feed csatlakozik.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.md },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardPressed: { opacity: 0.92 },
  badgeRow: { marginBottom: spacing.sm },
  badge: {
    alignSelf: "flex-start",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    fontSize: 12,
    fontWeight: "600",
  },
  badgeYt: { backgroundColor: "#ffe8e8", color: "#b71c1c" },
  badgeNews: { backgroundColor: "#e3f2fd", color: colors.accent },
  cardTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  cardSub: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  hint: {
    marginTop: spacing.sm,
    textAlign: "center",
    color: colors.textTertiary,
    fontSize: 13,
  },
});
