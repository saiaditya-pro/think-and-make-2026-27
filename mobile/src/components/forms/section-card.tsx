import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

export function SectionCard({ badge, title, children }: { badge: string; title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={badge.length === 1 ? styles.badgeCircle : styles.badgePill}>
          <Text style={badge.length === 1 ? styles.badgeCircleText : styles.badgePillText}>{badge}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#e2e8f0", gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  badgeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeCircleText: { fontSize: 11, fontWeight: "700", color: "#475569" },
  badgePill: { borderRadius: 999, backgroundColor: "#f1f5f9", paddingHorizontal: 12, paddingVertical: 4 },
  badgePillText: { fontSize: 11, fontWeight: "600", color: "#64748b" },
  title: { fontSize: 13, fontWeight: "700", color: "#1e293b" },
});
