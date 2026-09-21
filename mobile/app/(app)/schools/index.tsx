import { useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSchoolsList } from "@/features/schools/use-schools-list";
import { useOpenDrawer } from "@/hooks/use-open-drawer";
import { useAuth } from "@/lib/auth-context";
import { colors, spacing } from "@/lib/theme";

export default function SchoolsListScreen() {
  const router = useRouter();
  const openDrawer = useOpenDrawer();
  const { auth } = useAuth();
  const canEnroll = auth?.user.role === "admin" || auth?.user.role === "iif_staff";
  const { data, isLoading, error } = useSchoolsList();

  return (
    <View style={styles.screen}>
      <ScreenHeader eyebrow="FORMS" title="Schools" onMenuPress={openDrawer} />
      <ScrollView contentContainerStyle={styles.body}>
        {canEnroll && (
          <Button
            label="New / Continue Enrollment"
            onPress={() => router.push("/(app)/schools/enrollment")}
            style={{ marginBottom: spacing.md }}
          />
        )}

        {isLoading && <ActivityIndicator color={colors.brandTeal} />}
        {error && <Text style={styles.errorText}>Could not load schools.</Text>}
        {!isLoading && !error && !data?.results.length && <Text style={styles.emptyText}>No schools yet.</Text>}

        {data?.results.map((school) => (
          <Card key={school.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>{school.name}</Text>
              <Text style={styles.code}>{school.school_code}</Text>
            </View>
            <Text style={styles.meta}>
              {school.district || "—"} · Grades {school.grades_offered || "—"}
            </Text>
            {school.principal_name && (
              <Text style={styles.principal}>
                Principal: {school.principal_name} {school.principal_phone && `· ${school.principal_phone}`}
              </Text>
            )}
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.brandBg },
  body: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  errorText: { fontSize: 13, color: colors.destructive },
  emptyText: { fontSize: 13, color: colors.textMuted },
  card: { marginBottom: spacing.sm, gap: 4 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontSize: 14, fontWeight: "700", color: colors.text, flexShrink: 1 },
  code: { fontSize: 11, color: colors.textFaint, fontFamily: "monospace" },
  meta: { fontSize: 13, color: colors.textMuted },
  principal: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
});
