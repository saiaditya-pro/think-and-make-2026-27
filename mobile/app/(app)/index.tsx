import { useRouter } from "expo-router";
import { ClipboardList, Star } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ScreenHeader } from "@/components/screen-header";
import { useAuth } from "@/lib/auth-context";

export default function HomeScreen() {
  const { auth, logout } = useAuth();
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="INQUI-LAB · THINK & MAKE"
        title="THINK & MAKE 2026-27"
        right={
          <TouchableOpacity onPress={logout} style={styles.signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        }
      />
      <View style={styles.body}>
        <Text style={styles.school}>{auth?.user.display_name ?? auth?.user.username}</Text>

        <TouchableOpacity style={styles.card} onPress={() => router.push("/(app)/schools/enrollment")}>
          <ClipboardList color="#0ea5e9" size={22} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.cardTitle}>School Enrollment</Text>
            <Text style={styles.cardSubtitle}>Visit data, infra, principal details</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, { marginTop: 12 }]} onPress={() => router.push("/(app)/inquibuddy")}>
          <Star color="#0ea5e9" size={22} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Inqui Buddy</Text>
            <Text style={styles.cardSubtitle}>Innovation Evaluator</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.note}>
          Other Think & Make forms (kits, SL selection) are available on the web panel — this app also covers
          School Enrollment and the camera/audio-heavy InquiBuddy flow.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  body: { padding: 16 },
  school: { fontSize: 13, color: "#64748b", marginBottom: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bae6fd",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  cardSubtitle: { fontSize: 13, color: "#64748b" },
  signOut: { backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  signOutText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  note: { fontSize: 12, color: "#94a3b8", marginTop: 24, lineHeight: 18 },
});
