import { Construction } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenHeader } from "@/components/screen-header";
import { useOpenDrawer } from "@/hooks/use-open-drawer";
import { colors, spacing } from "@/lib/theme";

export default function ObservationsScreen() {
  const openDrawer = useOpenDrawer();

  return (
    <View style={styles.screen}>
      <ScreenHeader eyebrow="INSIGHTS" title="Unit 1 Session Observations" onMenuPress={openDrawer} />
      <ScrollView contentContainerStyle={styles.body}>
        <Construction size={32} color={colors.textMuted} />
        <Text style={styles.title}>This screen isn&apos;t built yet.</Text>
        <Text style={styles.body_}>
          The Django API for this module is live at <Text style={styles.code}>/api/v1/</Text> — this page just needs
          its UI wired up next.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.brandBg },
  body: { padding: spacing.xl, alignItems: "center", paddingTop: 64, gap: spacing.sm },
  title: { fontSize: 14, fontWeight: "600", color: colors.text },
  body_: { fontSize: 13, color: colors.textMuted, textAlign: "center", lineHeight: 19 },
  code: { fontFamily: "monospace", fontSize: 12, backgroundColor: colors.border, color: colors.text },
});
