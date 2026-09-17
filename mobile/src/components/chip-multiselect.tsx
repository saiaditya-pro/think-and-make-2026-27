import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#0ea5e9", borderColor: "#0ea5e9" },
  chipText: { color: "#334155", fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  disabled: { opacity: 0.4 },
});
