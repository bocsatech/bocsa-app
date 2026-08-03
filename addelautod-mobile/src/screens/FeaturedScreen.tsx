import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import { FEATURED_ADS } from "../data/sampleContent";
import { colors, radii, spacing } from "../theme";

export default function FeaturedScreen() {
  return (
    <View style={styles.page}>
      <ScreenHeader title="Kiemeltek" subtitle="Autós oldal hirdetései" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {FEATURED_ADS.map((ad) => (
          <Pressable key={ad.id} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            <View style={styles.top}>
              <Text style={styles.title}>{ad.title}</Text>
              {ad.badge ? <Text style={styles.badge}>{ad.badge}</Text> : null}
            </View>
            <Text style={styles.price}>{ad.priceLabel}</Text>
            <Text style={styles.meta}>{ad.meta}</Text>
          </Pressable>
        ))}
        <Text style={styles.hint}>Demo lista — később az Autosweb kiemelt / friss hirdetései.</Text>
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
  pressed: { opacity: 0.92 },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: 8,
  },
  title: { flex: 1, fontSize: 17, fontWeight: "600", color: colors.text },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  price: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 4 },
  meta: { fontSize: 14, color: colors.textSecondary },
  hint: {
    marginTop: spacing.sm,
    textAlign: "center",
    color: colors.textTertiary,
    fontSize: 13,
  },
});
