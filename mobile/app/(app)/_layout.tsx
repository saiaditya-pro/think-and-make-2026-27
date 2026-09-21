import { Drawer } from "expo-router/drawer";

import { AppDrawer } from "@/components/app-drawer";
import { colors } from "@/lib/theme";

export default function AppLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        drawerStyle: { width: 260, backgroundColor: colors.brandTeal },
        overlayColor: "rgba(15,23,42,0.4)",
      }}
      drawerContent={(props) => <AppDrawer {...props} />}
    />
  );
}
