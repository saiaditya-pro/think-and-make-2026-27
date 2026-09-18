import { useRouter } from "expo-router";
import { ClipboardList, Home, Package, Star, Users } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.school}>{auth?.user.display_name ?? auth?.user.username}</Text>

        <TouchableOpacity style={styles.card} onPress={() => router.push("/(app)/schools/enrollment")}>
          <ClipboardList color="#0ea5e9" size={22} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.cardTitle}>School Enrollment</Text>
            <Text style={styles.cardSubtitle}>Visit data, infra, principal details</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, { marginTop: 12 }]} onPress={() => router.push("/(app)/schools/contact-info")}>
          <Home color="#0ea5e9" size={22} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Schools Contact Info</Text>
            <Text style={styles.cardSubtitle}>Principal, teachers, session schedule</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, { marginTop: 12 }]} onPress={() => router.push("/(app)/headcounts")}>
          <Users color="#0ea5e9" size={22} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Students Count Info</Text>
            <Text style={styles.cardSubtitle}>SL / cluster / team / student totals</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, { marginTop: 12 }]} onPress={() => router.push("/(app)/sl-selection")}>
          <Star color="#0ea5e9" size={22} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.cardTitle}>SL Selection Assessment</Text>
            <Text style={styles.cardSubtitle}>Student Leader selection per section</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, { marginTop: 12 }]} onPress={() => router.push("/(app)/kits")}>
          <Package color="#0ea5e9" size={22} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Kits Handover Info</Text>
            <Text style={styles.cardSubtitle}>Kit delivery & acknowledgement</Text>
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
          This app covers the full Think & Make form flow — School Enrollment through Kits Handover — plus the
          camera/audio-heavy InquiBuddy evaluator.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  body: { padding: 16, paddingBottom: 32 },
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
