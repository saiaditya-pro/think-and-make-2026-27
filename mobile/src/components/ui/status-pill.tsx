import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/lib/theme";

export type FormStatus = "not_started" | "in_progress" | "complete";

const STATUS_LABEL: Record<FormStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
};

const STATUS_COLOR: Record<FormStatus, { bg: string; fg: string }> = {
  not_started: { bg: "#f1f5f9", fg: colors.textMuted },
  in_progress: { bg: colors.warningBg, fg: colors.warning },
  complete: { bg: colors.successBg, fg: colors.success },
};

export function StatusPill({ status }: { status: FormStatus }) {
  const tone = STATUS_COLOR[status];
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.text, { color: tone.fg }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

export function PercentPill({ pct }: { pct: number }) {
  const tone = pct >= 100 ? STATUS_COLOR.complete : pct > 0 ? STATUS_COLOR.in_progress : STATUS_COLOR.not_started;
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.text, { color: tone.fg }]}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  text: { fontSize: 11, fontWeight: "700" },
});
