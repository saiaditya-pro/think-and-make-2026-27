import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export function SubHeader({
  eyebrow,
  title,
  backHref = "/dashboard",
}: {
  eyebrow: string;
  title: string;
  backHref?: string;
}) {
  return (
    <header className="bg-[#0f4c5c] text-white px-6 py-4 flex items-center gap-3">
      <Link
        href={backHref as never}
        className="size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0"
        aria-label="Back"
      >
        <ChevronLeft className="size-4" />
      </Link>
      <div>
        <p className="text-xs font-semibold tracking-wide text-sky-300">{eyebrow}</p>
        <h1 className="text-base font-bold">{title}</h1>
      </div>
    </header>
  );
}
