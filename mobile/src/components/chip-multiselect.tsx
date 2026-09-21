import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors, radius, spacing } from "@/lib/theme";

export function ChipMultiselect({
  options,
  value,
  onChange,
  disabled,
}: {
  options: number[];
  value: number[];
  onChange: (value: number[]) => void;
  disabled?: boolean;
}) {
  function toggle(option: number) {
    if (value.includes(option)) onChange(value.filter((v) => v !== option));
    else onChange([...value, option].sort((a, b) => a - b));
  }

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const active = value.includes(option);
        return (
          <TouchableOpacity
            key={option}
            disabled={disabled}
            onPress={() => toggle(option)}
            style={[styles.chip, active && styles.chipActive, disabled && styles.disabled]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>Grade {option}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: colors.brandCoral, borderColor: colors.brandCoral },
  chipText: { color: "#334155", fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  disabled: { opacity: 0.4 },
});
