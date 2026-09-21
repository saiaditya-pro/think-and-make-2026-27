import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/lib/theme";

export function StatusBanner({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={styles.banner}>
      <View style={styles.textWrap}>
        <Text style={styles.bannerText}>
          <Text style={styles.bannerTitle}>⚠ {title}</Text>
          {body ? ` ${body}` : ""}
        </Text>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  textWrap: { flex: 1 },
  bannerText: { fontSize: 13, color: "#92400e" },
  bannerTitle: { fontWeight: "700" },
});
