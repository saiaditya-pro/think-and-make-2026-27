import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/lib/auth-context";
import type { InquibuddySubmission } from "@/lib/types";

const STATUS_LABEL: Record<InquibuddySubmission["status"], string> = {
  pending: "Yet to submit idea",
  processing: "Generating…",
  evaluated: "Evaluated",
};

export function TeamCard({ submission, onChanged }: { submission: InquibuddySubmission; onChanged: () => void }) {
  const { authFetch } = useAuth();
  const [uploading, setUploading] = useState<"photo" | "audio" | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);

  const hasPhoto = submission.submission_files.some((f) => f.kind === "photo");
  const hasAudio = submission.submission_files.some((f) => f.kind === "audio");
  const statusText = hasPhoto && submission.status === "pending" ? "Photo ready" : STATUS_LABEL[submission.status];

  async function uploadFile(kind: "photo" | "audio", uri: string, name: string, type: string) {
    setUploading(kind);
    try {
      const form = new FormData();
      // React Native's FormData accepts this {uri, name, type} shape for files.
      form.append("file", { uri, name, type } as unknown as Blob);
      const res = await authFetch(`/inquibuddy-submissions/${submission.id}/upload-${kind}/`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error();
      onChanged();
    } catch {
      Alert.alert("Upload failed", "Please try again.");
    } finally {
      setUploading(null);
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      const asset = result.assets[0];
      await uploadFile("photo", asset.uri, "idea.jpg", asset.mimeType ?? "image/jpeg");
    }
  }

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled) {
      const asset = result.assets[0];
      await uploadFile("photo", asset.uri, "idea.jpg", asset.mimeType ?? "image/jpeg");
    }
  }

  async function toggleRecording() {
    if (isRecording) {
      await recorder.stop();
      setIsRecording(false);
      if (recorder.uri) await uploadFile("audio", recorder.uri, "idea-audio.m4a", "audio/m4a");
      return;
    }
    const { granted } = await AudioModule.requestRecordingPermissionsAsync();
    if (!granted) return;
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setIsRecording(true);
  }

  async function pickAudio() {
    // Reuses the image picker's media library for simplicity; a dedicated
    // audio-file picker (expo-document-picker) can replace this later.
    Alert.alert("Use “Record Audio” to capture the team's pitch directly.");
  }

  async function downloadReport() {
    const res = await authFetch(`/inquibuddy-submissions/${submission.id}/report/`);
    if (!res.ok) {
      Alert.alert("Report not ready yet.");
      return;
    }
    const file = new File(Paths.cache, `InquiBuddy_Team${submission.team_code}.pdf`);
    file.write(new Uint8Array(await res.arrayBuffer()));
    await Sharing.shareAsync(file.uri, { mimeType: "application/pdf" });
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.teamCode}>Team {submission.team_code}</Text>
          <Text style={styles.slName}>SL: {submission.sl_name}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{statusText}</Text>
        </View>
      </View>

      {submission.status === "evaluated" ? (
        <TouchableOpacity style={styles.outlineButton} onPress={downloadReport}>
          <Text style={styles.outlineButtonText}>&darr; PDF</Text>
        </TouchableOpacity>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Idea Photo</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.smallButton, hasPhoto && styles.smallButtonDone]} onPress={takePhoto} disabled={!!uploading}>
              {uploading === "photo" ? <ActivityIndicator size="small" /> : <Text style={styles.smallButtonText}>{"📷"} Take Photo</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smallButton, hasPhoto && styles.smallButtonDone]} onPress={pickPhoto} disabled={!!uploading}>
              <Text style={styles.smallButtonText}>{"🖼"} Upload Image</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Idea Audio (Optional)</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.smallButton, hasAudio && styles.smallButtonDone]} onPress={toggleRecording}>
              {uploading === "audio" ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text style={styles.smallButtonText}>{isRecording ? "⏹ Stop" : "🎤 Record Audio"}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smallButton, hasAudio && styles.smallButtonDone]} onPress={pickAudio}>
              <Text style={styles.smallButtonText}>{"🎵"} Upload Audio</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  teamCode: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  slName: { fontSize: 12, color: "#64748b", marginTop: 2 },
  badge: { backgroundColor: "#f1f5f9", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#475569" },
  sectionLabel: { fontSize: 11, fontWeight: "600", color: "#64748b", marginTop: 12, marginBottom: 6 },
  row: { flexDirection: "row", gap: 8 },
  smallButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  smallButtonDone: { borderColor: "#34d399", backgroundColor: "#ecfdf5" },
  smallButtonText: { fontSize: 12, fontWeight: "600", color: "#334155" },
  outlineButton: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 8 },
  outlineButtonText: { fontSize: 13, fontWeight: "700", color: "#334155" },
});
