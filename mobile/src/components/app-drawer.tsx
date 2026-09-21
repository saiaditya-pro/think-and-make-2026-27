import type { DrawerContentComponentProps } from "expo-router/drawer";
import { useRouter, usePathname, type Href } from "expo-router";
import { BarChart3, Camera, Home, LayoutGrid, LogOut, Radio, Star, Users } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/lib/auth-context";
import { colors, radius, spacing } from "@/lib/theme";

type NavItem = { href: Href; label: string; icon: typeof Home };

const PRIMARY_NAV: NavItem[] = [{ href: "/(app)" as Href, label: "Dashboard", icon: Home }];

const FORMS_NAV: NavItem[] = [
  { href: "/(app)/schools/enrollment" as Href, label: "1 · Enrollment", icon: LayoutGrid },
  { href: "/(app)/schools/contact-info" as Href, label: "2 · Contact Info", icon: Users },
  { href: "/(app)/headcounts" as Href, label: "3 · Headcounts", icon: BarChart3 },
  { href: "/(app)/sl-selection" as Href, label: "4 · SL Selection", icon: Star },
  { href: "/(app)/kits" as Href, label: "5 · Kit Handover", icon: Radio },
];

const INSIGHTS_NAV: NavItem[] = [
  { href: "/(app)/inquibuddy" as Href, label: "InquiBuddy", icon: Camera },
  { href: "/(app)/observations" as Href, label: "Observations", icon: BarChart3 },
];

function matchPath(href: Href) {
  const raw = String(href).replace("/(app)", "");
  return raw === "" ? "/" : raw;
}

function NavGroup({
  label,
  items,
  pathname,
  onNavigate,
}: {
  label?: string;
  items: NavItem[];
  pathname: string;
  onNavigate: (href: Href) => void;
}) {
  return (
    <View style={styles.group}>
      {label && <Text style={styles.groupLabel}>{label}</Text>}
      {items.map((item) => {
        const isActive = pathname === matchPath(item.href);
        const Icon = item.icon;
        return (
          <TouchableOpacity
            key={String(item.href)}
            onPress={() => onNavigate(item.href)}
            style={[styles.item, isActive && styles.itemActive]}
          >
            <Icon size={16} color="#fff" />
            <Text style={[styles.itemLabel, isActive && styles.itemLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function AppDrawer(props: DrawerContentComponentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { auth, logout } = useAuth();

  function onNavigate(href: Href) {
    router.push(href);
    props.navigation.closeDrawer();
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.logoMark}>
          <Text style={styles.logoPlus}>+</Text>
        </View>
        <Text style={styles.brand}>Think &amp; Make</Text>
      </View>

      <View style={styles.body}>
        <NavGroup items={PRIMARY_NAV} pathname={pathname} onNavigate={onNavigate} />
        <NavGroup label="Forms" items={FORMS_NAV} pathname={pathname} onNavigate={onNavigate} />
        <NavGroup label="Insights" items={INSIGHTS_NAV} pathname={pathname} onNavigate={onNavigate} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.userName} numberOfLines={1}>
          {auth?.user.display_name ?? auth?.user.username}
        </Text>
        <TouchableOpacity onPress={logout} style={styles.signOut}>
          <LogOut size={14} color="#fff" />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.brandTeal },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    margin: spacing.md,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.brandCoral,
    alignItems: "center",
    justifyContent: "center",
  },
  logoPlus: { color: "#fff", fontSize: 16, fontWeight: "800", marginTop: -1 },
  brand: { fontSize: 14, fontWeight: "700", color: colors.brandTeal },
  body: { flex: 1, paddingHorizontal: spacing.sm },
  group: { marginBottom: spacing.lg },
  groupLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    borderLeftWidth: 2,
    borderLeftColor: "transparent",
  },
  itemActive: { backgroundColor: "rgba(255,255,255,0.1)", borderLeftColor: colors.brandCoral },
  itemLabel: { color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: "500" },
  itemLabelActive: { color: "#fff", fontWeight: "700" },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
    padding: spacing.md,
    gap: spacing.sm,
  },
  userName: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radius.sm,
  },
  signOutText: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
