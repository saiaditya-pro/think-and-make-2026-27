import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ScreenHeader } from "@/components/screen-header";
import { useAuth } from "@/lib/auth-context";
import type { Cluster, Paginated } from "@/lib/types";

export default function SelectGradeSectionScreen() {
  const { auth, authFetch } = useAuth();
  const router = useRouter();
  const schoolId = auth?.user.school;
  const [grade, setGrade] = useState<number | null>(null);
  const [section, setSection] = useState<string | null>(null);

  const clustersQuery = useQuery({
    queryKey: ["clusters", schoolId],
    queryFn: async () => {
      const res = await authFetch(`/clusters/?school=${schoolId}`);
      return (await res.json()) as Paginated<Cluster>;
    },
    enabled: !!schoolId,
  });

  const gradeSections = useMemo(() => {
    const set = new Map<string, { grade: number; section: string }>();
    for (const c of clustersQuery.data?.results ?? []) set.set(`${c.grade}::${c.section}`, c);
    return [...set.values()].sort((a, b) => a.grade - b.grade || a.section.localeCompare(b.section));
  }, [clustersQuery.data]);

  const grades = [...new Set(gradeSections.map((g) => g.grade))];
  const sections = gradeSections.filter((g) => g.grade === grade).map((g) => g.section);

  return (
    <View style={styles.screen}>
      <ScreenHeader eyebrow="Inqui Buddy" title="Select Grade & Section" showBack />
      <View style={styles.body}>
        {clustersQuery.isLoading && <ActivityIndicator />}

        <Text style={styles.label}>Grade</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
          {grades.map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.chip, grade === g && styles.chipActive]}
              onPress={() => {
                setGrade(g);
                setSection(null);
              }}
            >
              <Text style={[styles.chipText, grade === g && styles.chipTextActive]}>Grade {g}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Section</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
          {sections.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, section === s && styles.chipActive]}
              onPress={() => setSection(s)}
            >
              <Text style={[styles.chipText, section === s && styles.chipTextActive]}>Section {s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.button, (!grade || !section) && styles.buttonDisabled]}
          disabled={!grade || !section}
          onPress={() =>
            router.push({ pathname: "/(app)/inquibuddy/teams", params: { grade: String(grade), section: section! } })
          }
        >
          <Text style={styles.buttonText}>View Teams &rarr;</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  body: { padding: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#334155", marginTop: 16, marginBottom: 8 },
  row: { flexDirection: "row" },
  chip: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#0ea5e9", borderColor: "#0ea5e9" },
  chipText: { color: "#334155", fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  button: { backgroundColor: "#0ea5e9", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 28 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
