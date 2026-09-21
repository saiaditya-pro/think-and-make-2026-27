import { useNavigation } from "expo-router";

type DrawerLike = { openDrawer: () => void };

/**
 * Opens the app drawer from any screen — whether it's a direct Drawer child (headcounts, kits,
 * sl-selection, index, observations) or nested one level down inside the schools/inquibuddy Stack,
 * where the Drawer is the parent navigator instead.
 */
export function useOpenDrawer() {
  const navigation = useNavigation();

  return () => {
    const nav = navigation as unknown as Partial<DrawerLike> & { getParent?: () => Partial<DrawerLike> | undefined };
    if (typeof nav.openDrawer === "function") {
      nav.openDrawer();
      return;
    }
    nav.getParent?.()?.openDrawer?.();
  };
}
