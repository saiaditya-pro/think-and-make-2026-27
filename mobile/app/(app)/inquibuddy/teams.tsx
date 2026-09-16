import { useQuery, useQueryClient } from "@tanstack/react-query";
import { File, Paths } from "expo-file-system";
import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ScreenHeader } from "@/components/screen-header";
import { useAuth } from "@/lib/auth-context";
import type { InquibuddySubmission, Paginated } from "@/lib/types";

import { TeamCard } from "./team-card";

export default function TeamsScreen() {
  const { auth, authFetch } = useAuth();
  const { grade, section } = useLocalSearchParams<{ grade: string; section: string }>();
  const schoolId = auth?.user.school;
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const queryKey = ["inquibuddy-submissions", schoolId, grade, section];

  const submissionsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await authFetch(
        `/inquibuddy-submissions/?team__cluster__school=${schoolId}&team__cluster__grade=${grade}&team__cluster__section=${section}`,
      );
      return (await res.json()) as Paginated<InquibuddySubmission>;
    },
    enabled: !!schoolId,
    refetchInterval: (query) =>
      query.state.data?.results.some((s) => s.status === "processing") ? 4000 : false,
  });

  const submissions = submissionsQuery.data?.results ?? [];
  const anyPhotoReady = submissions.some((s) => s.submission_files.some((f) => f.kind === "photo"));
  const anyEvaluated = submissions.some((s) => s.status === "evaluated");

  async function generateAll() {
    setGenerating(true);
    try {
      const res = await authFetch(`/inquibuddy-submissions/generate-feedback-bulk/`, {
        method: "POST",
        body: JSON.stringify({ school: schoolId, grade, section }),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey });
    } catch {
      Alert.alert("Could not start feedback generation.");
    } finally {
      setGenerating(false);
    }
  }

  async function downloadAll() {
    const res = await authFetch(`/inquibuddy-submissions/report-all/?school=${schoolId}&grade=${grade}&section=${section}`);
    if (!res.ok) {
      Alert.alert("No evaluated teams to download yet.");
      return;
    }
    const file = new File(Paths.cache, `InquiBuddy_Gr${grade}${section}_AllTeams.pdf`);
    file.write(new Uint8Array(await res.arrayBuffer()));
    await Sharing.shareAsync(file.uri, { mimeType: "application/pdf" });
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader eyebrow="Inqui Buddy" title={`Grade ${grade} · Section ${section}`} showBack />
      <ScrollView contentContainerStyle={styles.body}>
        {submissions.map((s) => (
          <TeamCard key={s.id} submission={s} onChanged={() => queryClient.invalidateQueries({ queryKey })} />
        ))}

        <TouchableOpacity
          style={[styles.button, !anyPhotoReady && styles.buttonDisabled]}
          disabled={!anyPhotoReady || generating}
          onPress={generateAll}
        >
          <Text style={styles.buttonText}>
            {generating ? "Generating AI feedback…" : "Generate Feedback for All Submitted Teams"}
          </Text>
        </TouchableOpacity>

        {anyEvaluated && (
          <TouchableOpacity style={styles.buttonOutline} onPress={downloadAll}>
            <Text style={styles.buttonOutlineText}>&darr; Download All Teams Feedback PDF</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  body: { padding: 16, gap: 12 },
  button: { backgroundColor: "#0ea5e9", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 14, textAlign: "center" },
  buttonOutline: { borderWidth: 1, borderColor: "#34d399", borderRadius: 10, padding: 14, alignItems: "center" },
  buttonOutlineText: { color: "#047857", fontWeight: "700", fontSize: 14 },
});
