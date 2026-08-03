import { StyleSheet, Switch, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";

type Props = {
  title: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  isFirst?: boolean;
  isLast?: boolean;
};

export default function ToggleRow({ title, value, onValueChange, isFirst, isLast }: Props) {
  return (
    <View style={[styles.row, isFirst && styles.first, isLast && styles.last]}>
      <Text style={styles.title}>{title}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.switchTrackOff, true: colors.switchTrackOn }}
        thumbColor="#ffffff"
        ios_backgroundColor={colors.switchTrackOff}
      />
    </View>
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
  title: {
    fontSize: 17,
    color: colors.text,
    flex: 1,
    paddingRight: spacing.md,
  },
});
