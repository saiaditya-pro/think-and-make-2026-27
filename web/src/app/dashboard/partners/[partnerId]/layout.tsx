import { PartnerScope } from "@/components/forms/partner-scope";

export default async function PartnerLayout({ children, params }: LayoutProps<"/dashboard/partners/[partnerId]">) {
  const { partnerId } = await params;
  return <PartnerScope partnerId={partnerId}>{children}</PartnerScope>;
}
