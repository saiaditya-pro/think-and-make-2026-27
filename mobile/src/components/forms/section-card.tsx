import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/lib/theme";

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
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg - 2,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  badgeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brandCoral,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeCircleText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  badgePill: { borderRadius: radius.pill, backgroundColor: colors.brandTeal, paddingHorizontal: spacing.md, paddingVertical: 4 },
  badgePillText: { fontSize: 11, fontWeight: "600", color: "#fff" },
  title: { fontSize: 13, fontWeight: "700", color: colors.text },
});
