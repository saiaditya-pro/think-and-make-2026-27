import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/lib/auth-context";
import { colors, radius, spacing } from "@/lib/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoPlus}>+</Text>
          </View>
          <Text style={styles.eyebrow}>INQUI-LAB · THINK &amp; MAKE</Text>
        </View>
        <Text style={styles.title}>THINK &amp; MAKE 2026-27</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Enter username</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. school_user"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.brandBg, justifyContent: "center", padding: 20 },
  header: { backgroundColor: colors.brandTeal, borderRadius: radius.xl, padding: 20, marginBottom: -16, paddingBottom: 36 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logoMark: {
    width: 22,
    height: 22,
    borderRadius: radius.sm - 2,
    backgroundColor: colors.brandCoral,
    alignItems: "center",
    justifyContent: "center",
  },
  logoPlus: { color: "#fff", fontSize: 13, fontWeight: "800", marginTop: -1 },
  eyebrow: { color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  title: { color: "#fff", fontSize: 18, fontWeight: "700", marginTop: 6 },
  card: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: 20,
    paddingTop: 28,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#334155", marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, fontSize: 15 },
  error: { color: colors.destructive, fontSize: 13, marginTop: 10 },
  button: { backgroundColor: colors.brandCoral, borderRadius: radius.md, padding: 14, alignItems: "center", marginTop: 20 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
