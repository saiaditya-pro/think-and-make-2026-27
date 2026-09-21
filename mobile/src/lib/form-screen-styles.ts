import { StyleSheet } from "react-native";

import { colors, radius, spacing } from "@/lib/theme";

// Shared by every form screen (Enrollment, Contact Info, Headcounts, SL Selection, Kits) so they
// render with one consistent look instead of five near-identical StyleSheet.create blocks.
export const formScreenStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.brandBg },
  body: { padding: spacing.lg, gap: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: "#fff",
  },
  inputDisabled: { backgroundColor: "#f1f5f9", color: colors.textFaint },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  outlineButton: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: radius.sm, paddingVertical: 10, alignItems: "center" },
  outlineButtonText: { fontSize: 13, fontWeight: "700", color: "#334155" },
  disabled: { opacity: 0.4 },
  subCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: 4, marginTop: 4 },
  subCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  subCardTitle: { fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 4 },
  linkButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  linkButtonText: { fontSize: 12, fontWeight: "700", color: "#92400e" },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "#fff",
  },
  footerButton: { flex: 1, borderRadius: radius.md, paddingVertical: 14, alignItems: "center" },
  draftButton: { backgroundColor: "#f1f5f9" },
  draftButtonText: { color: "#334155", fontWeight: "700", fontSize: 14 },
  submitButton: { backgroundColor: colors.brandCoral },
  submitButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
