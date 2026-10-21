import { useParams } from "next/navigation";

export type FormSlug = "enrollment" | "contact-info" | "headcounts" | "sl-selection" | "kits" | "observations";

/** Partner-less routes, still used by the school role (which never picks a partner). */
const LEGACY_FORM_HREF: Record<FormSlug, string> = {
  enrollment: "/dashboard/schools/enrollment",
  "contact-info": "/dashboard/schools/contact-info",
  headcounts: "/dashboard/headcounts",
  "sl-selection": "/dashboard/sl-selection",
  kits: "/dashboard/kits",
  observations: "/dashboard/observations",
};

export function partnerHref(partnerId: string) {
  return `/dashboard/partners/${partnerId}`;
}

export function formHref(slug: FormSlug, partnerId?: string) {
  return partnerId ? `${partnerHref(partnerId)}/${slug}` : LEGACY_FORM_HREF[slug];
}

/** The `[partnerId]` segment when inside `/dashboard/partners/[partnerId]/...`, else undefined. */
export function usePartnerRouteId() {
  const params = useParams<{ partnerId?: string }>();
  return params?.partnerId;
}

/** A form link that stays inside the current partner's area when there is one. */
export function useFormHref(slug: FormSlug) {
  return formHref(slug, usePartnerRouteId());
}
