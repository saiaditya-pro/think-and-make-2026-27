import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export function SegmentedField({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <TouchableOpacity
            key={o.value}
            disabled={disabled}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && styles.segmentActive, disabled && styles.disabled]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  segment: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  segmentActive: { backgroundColor: "#0ea5e9", borderColor: "#0ea5e9" },
  segmentText: { color: "#334155", fontSize: 13, fontWeight: "600" },
  segmentTextActive: { color: "#fff" },
  disabled: { opacity: 0.4 },
});
