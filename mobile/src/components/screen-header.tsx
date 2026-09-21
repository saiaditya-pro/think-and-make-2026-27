import { useRouter } from "expo-router";
import { Menu } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors, spacing } from "@/lib/theme";

export function ScreenHeader({
  eyebrow,
  title,
  showBack,
  onMenuPress,
  right,
}: {
  eyebrow: string;
  title: string;
  showBack?: boolean;
  /** Renders a hamburger button that opens the drawer nav — used on top-level (non-nested) screens. */
  onMenuPress?: () => void;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>{"←"}</Text>
          </TouchableOpacity>
        )}
        {onMenuPress && (
          <TouchableOpacity onPress={onMenuPress} style={styles.backButton}>
            <Menu size={18} color="#fff" />
          </TouchableOpacity>
        )}
        <View>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.brandTeal,
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { color: "#fff", fontSize: 16 },
  eyebrow: { color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  title: { color: "#fff", fontSize: 16, fontWeight: "700", marginTop: 2 },
});
