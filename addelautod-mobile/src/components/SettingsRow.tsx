import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";

type Props = {
  title: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
};

export default function SettingsRow({
  title,
  value,
  onPress,
  showChevron = true,
  isFirst,
  isLast,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        isFirst && styles.first,
        isLast && styles.last,
        pressed && onPress ? styles.pressed : null,
      ]}
    >
      <Text style={styles.title}>{title}</Text>
      <View style={styles.trailing}>
        {value ? <Text style={styles.value}>{value}</Text> : null}
        {showChevron && onPress ? <Text style={styles.chevron}>›</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.bgElevated,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  first: {
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
  },
  last: {
    borderBottomLeftRadius: radii.md,
    borderBottomRightRadius: radii.md,
    borderBottomWidth: 0,
  },
  pressed: {
    backgroundColor: "#e8eaed",
  },
  title: {
    fontSize: 17,
    color: colors.text,
    flexShrink: 1,
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: spacing.md,
    maxWidth: "55%",
  },
  value: {
    fontSize: 17,
    color: colors.textSecondary,
    textAlign: "right",
  },
  chevron: {
    fontSize: 22,
    color: colors.textTertiary,
    marginTop: -2,
  },
});
