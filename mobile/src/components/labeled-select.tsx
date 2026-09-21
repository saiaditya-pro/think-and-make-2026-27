import { useState } from "react";
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing } from "@/lib/theme";

export function LabeledSelect({
  placeholder,
  value,
  options,
  onChange,
  disabled,
}: {
  placeholder: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  // A percentage maxHeight on a flex:1 FlatList's ancestor can collapse to zero
  // height on some devices/OSes, so give the sheet a definite pixel height instead.
  const sheetHeight = Math.min(420, windowHeight * 0.6);

  return (
    <>
      <TouchableOpacity
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.trigger, disabled && styles.disabled]}
      >
        <Text style={selected ? styles.value : styles.placeholder}>{selected?.label ?? placeholder}</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View
            style={[styles.sheet, { height: sheetHeight, paddingBottom: Math.max(insets.bottom, 8) }]}
            onStartShouldSetResponder={() => true}
          >
            {options.length === 0 ? (
              <Text style={styles.emptyText}>No options available.</Text>
            ) : (
              <FlatList
                style={styles.list}
                data={options}
                keyExtractor={(o) => o.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.optionText, item.value === value && styles.optionTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  disabled: { opacity: 0.4 },
  value: { color: colors.text, fontSize: 14 },
  placeholder: { color: colors.textFaint, fontSize: 14 },
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.sm },
  list: { flex: 1 },
  option: { paddingVertical: 14, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  optionText: { fontSize: 15, color: "#334155" },
  optionTextActive: { fontWeight: "700", color: colors.brandCoral },
  emptyText: { padding: spacing.lg, fontSize: 13, color: colors.textFaint, textAlign: "center" },
});
