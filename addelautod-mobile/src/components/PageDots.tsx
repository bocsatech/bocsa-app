import { StyleSheet, View } from "react-native";
import { colors, spacing } from "../theme";

type Props = {
  count: number;
  index: number;
};

export default function PageDots({ count, index }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, i === index ? styles.dotActive : null]}
          accessibilityRole="tab"
          accessibilityState={{ selected: i === index }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.pageDot,
  },
  dotActive: {
    backgroundColor: colors.pageDotActive,
    width: 18,
  },
});
