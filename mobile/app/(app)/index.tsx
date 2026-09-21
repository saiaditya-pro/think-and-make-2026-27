import { useRouter, type Href } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ScreenHeader } from "@/components/screen-header";
import { StatusBanner } from "@/components/forms/status-banner";
import { Card } from "@/components/ui/card";
import { PercentPill, StatusPill } from "@/components/ui/status-pill";
import { useReportsSummary } from "@/features/reports/use-reports-data";
import { useOpenDrawer } from "@/hooks/use-open-drawer";
import { useAuth } from "@/lib/auth-context";
import { colors, spacing } from "@/lib/theme";
import type { SchoolProgress } from "@/lib/types";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function KpiCard({
  label,
  value,
  sublabel,
  onPress,
}: {
  label: string;
  value: string;
  sublabel?: string;
  onPress?: () => void;
}) {
  const card = (
    <Card style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      {sublabel && <Text style={styles.kpiSublabel}>{sublabel}</Text>}
    </Card>
  );
  if (!onPress) return card;
  return <TouchableOpacity onPress={onPress}>{card}</TouchableOpacity>;
}

function SchoolRow({ row }: { row: SchoolProgress }) {
  return (
    <Card style={styles.schoolCard}>
      <View style={styles.schoolHeader}>
        <Text style={styles.schoolName}>{row.school_name}</Text>
        <Text style={styles.schoolCode}>{row.school_code}</Text>
      </View>
      <View style={styles.statusGrid}>
        <StatusRow label="Enrollment" node={<StatusPill status={row.form1_status} />} />
        <StatusRow label="Contact Info" node={<StatusPill status={row.form2_status} />} />
        <StatusRow label="Headcounts" node={<PercentPill pct={row.form3_pct} />} />
        <StatusRow label="SL Selection" node={<PercentPill pct={row.form4_pct} />} />
        <StatusRow label="Kits" node={<StatusPill status={row.kit_status} />} />
      </View>
    </Card>
  );
}

function StatusRow({ label, node }: { label: string; node: React.ReactNode }) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>
      {node}
    </View>
  );
}

export default function DashboardScreen() {
  const openDrawer = useOpenDrawer();
  const router = useRouter();
  const { auth } = useAuth();
  const isSchool = auth?.user.role === "school";
  const canBrowseSchools = auth?.user.role === "admin" || auth?.user.role === "iif_staff";
  const { data, isLoading, error } = useReportsSummary();
  const flaggedSchools = data?.schools.filter((s) => s.mismatch_flags.length > 0) ?? [];

  return (
    <View style={styles.screen}>
      <ScreenHeader eyebrow="INQUI-LAB · THINK & MAKE" title="Dashboard" onMenuPress={openDrawer} />
      <View style={styles.body}>
        <Text style={styles.greeting}>
          {greeting()}, {auth?.user.display_name ?? auth?.user.username} 👋
        </Text>
        <Text style={styles.subtitle}>Here&apos;s how the program is progressing this week.</Text>

        {isLoading && <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.brandTeal} />}
        {(error || (!isLoading && !data)) && (
          <Text style={styles.errorText}>Could not load the dashboard.</Text>
        )}

        {data && (
          <>
            {data.kpis && (
              <View style={styles.kpiGrid}>
                <KpiCard
                  label="Schools Enrolled"
                  value={String(data.kpis.schools_enrolled)}
                  onPress={canBrowseSchools ? () => router.push("/(app)/schools" as Href) : undefined}
                />
                <KpiCard
                  label="Forms Completed"
                  value={`${data.kpis.forms_completed_pct}%`}
                  sublabel="across all schools"
                />
                <KpiCard
                  label="Kits Delivered"
                  value={String(data.kpis.kits_delivered)}
                  sublabel={`of ${data.kpis.schools_enrolled} schools`}
                />
                <KpiCard label="Active Student Leaders" value={String(data.kpis.active_student_leaders)} />
              </View>
            )}

            {flaggedSchools.length > 0 && (
              <View style={{ marginBottom: spacing.md }}>
                <StatusBanner
                  title={`${flaggedSchools.length} school${flaggedSchools.length === 1 ? "" : "s"} have a data-quality flag`}
                  body="Total SL entered in Headcounts doesn't match the number of Student Leaders recorded in SL Selection for the same grade-section."
                />
              </View>
            )}

            {isSchool ? (
              data.schools.length === 0 ? (
                <Text style={styles.emptyText}>No progress recorded yet.</Text>
              ) : (
                <SchoolRow row={data.schools[0]} />
              )
            ) : data.schools.length === 0 ? (
              <Text style={styles.emptyText}>No schools yet.</Text>
            ) : (
              data.schools.map((row) => <SchoolRow key={row.school} row={row} />)
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.brandBg },
  body: { flex: 1, padding: spacing.lg, gap: spacing.md },
  greeting: { fontSize: 18, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: -spacing.sm },
  errorText: { fontSize: 13, color: colors.destructive, marginTop: spacing.md },
  emptyText: { fontSize: 13, color: colors.textMuted },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  kpiCard: { width: "47%", padding: spacing.md, gap: 2 },
  kpiLabel: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  kpiValue: { fontSize: 22, fontWeight: "800", color: colors.text },
  kpiSublabel: { fontSize: 11, color: colors.textFaint },
  schoolCard: { marginBottom: spacing.sm, gap: spacing.sm },
  schoolHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  schoolName: { fontSize: 14, fontWeight: "700", color: colors.text, flexShrink: 1 },
  schoolCode: { fontSize: 11, color: colors.textFaint, fontFamily: "monospace" },
  statusGrid: { gap: spacing.xs + 2 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusLabel: { fontSize: 13, color: colors.textMuted },
});
