import { StyleSheet, Text, View } from "react-native";

export function FormField({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
      {children}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#334155", marginBottom: 6 },
  required: { color: "#dc2626" },
  hint: { fontSize: 11, color: "#94a3b8", marginBottom: 6, marginTop: -4 },
  error: { fontSize: 11, color: "#dc2626", marginTop: 4 },
});
