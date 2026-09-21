import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, type ViewStyle } from "react-native";

import { colors, radius, spacing } from "@/lib/theme";

type Variant = "primary" | "secondary" | "ghost";

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.base, variantStyles[variant], isDisabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === "primary" ? "#fff" : colors.brandTeal} />
      ) : (
        <Text style={[styles.label, variant === "primary" ? styles.labelOnPrimary : styles.labelOnLight]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  label: { fontSize: 14, fontWeight: "700" },
  labelOnPrimary: { color: "#fff" },
  labelOnLight: { color: colors.brandTeal },
});

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.brandCoral },
  secondary: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.brandTeal },
  ghost: { backgroundColor: "transparent" },
};
