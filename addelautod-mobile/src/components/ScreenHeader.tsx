import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme";

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
};

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightLabel,
  onRightPress,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <View style={styles.side}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
              <Text style={styles.backText}>‹ Vissza</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={[styles.side, styles.sideRight]}>
          {rightLabel && onRightPress ? (
            <Pressable onPress={onRightPress} hitSlop={12}>
              <Text style={styles.rightText}>{rightLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bg,
    paddingBottom: spacing.sm,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  side: {
    width: 88,
  },
  sideRight: {
    alignItems: "flex-end",
  },
  center: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  backText: {
    fontSize: 17,
    color: colors.accent,
    fontWeight: "500",
  },
  rightText: {
    fontSize: 17,
    color: colors.accent,
    fontWeight: "500",
  },
});
