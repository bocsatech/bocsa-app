import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import { useSearch } from "../context/SearchContext";
import { summarizeFilter } from "../types";
import { colors, radii, spacing } from "../theme";

type Props = {
  onOpenSearch?: () => void;
};

export default function SavedSearchesScreen({ onOpenSearch }: Props) {
  const { saved, applySaved, removeSaved } = useSearch();

  return (
    <View style={styles.page}>
      <ScreenHeader title="Mentett keresések" subtitle="Feltételek ikonokra" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {saved.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📌</Text>
            <Text style={styles.emptyTitle}>Még nincs mentett keresés</Text>
            <Text style={styles.emptyText}>
              A 3. oldalon állítsd be a szűrőt, majd „Mentés ikonra”. Nem a hirdetés mentődik, hanem a
              keresési feltételek.
            </Text>
            {onOpenSearch ? (
              <Pressable style={styles.linkBtn} onPress={onOpenSearch}>
                <Text style={styles.linkBtnText}>Ugrás a keresőre</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.grid}>
            {saved.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.iconCell, pressed && styles.pressed]}
                onPress={() => {
                  applySaved(item);
                  Alert.alert("Alkalmazva", summarizeFilter(item.filter), [
                    { text: "OK" },
                    onOpenSearch
                      ? { text: "Kereső", onPress: onOpenSearch }
                      : { text: "Bezárás", style: "cancel" },
                  ]);
                }}
                onLongPress={() => {
                  Alert.alert("Törlés", `Törlöd: ${item.name}?`, [
                    { text: "Mégse", style: "cancel" },
                    {
                      text: "Törlés",
                      style: "destructive",
                      onPress: () => removeSaved(item.id),
                    },
                  ]);
                }}
              >
                <View style={styles.iconBubble}>
                  <Text style={styles.iconEmoji}>{item.icon}</Text>
                </View>
                <Text style={styles.iconLabel} numberOfLines={2}>
                  {item.name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        <Text style={styles.hint}>Hosszú nyomás: törlés · Koppintás: szűrő alkalmazása</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  iconCell: {
    width: "30%",
    flexGrow: 1,
    maxWidth: "32%",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  pressed: { opacity: 0.75 },
  iconBubble: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: colors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  iconEmoji: { fontSize: 32 },
  iconLabel: {
    fontSize: 12,
    textAlign: "center",
    color: colors.text,
    lineHeight: 16,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  linkBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
  },
  linkBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  hint: {
    marginTop: spacing.lg,
    textAlign: "center",
    color: colors.textTertiary,
    fontSize: 13,
  },
});
