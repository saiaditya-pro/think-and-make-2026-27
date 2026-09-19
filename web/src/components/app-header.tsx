import { cn } from "@/lib/utils";

export function AppHeader({
  eyebrow = "INQUI-LAB · THINK & MAKE",
  title = "THINK & MAKE 2026-27",
  right,
  className,
}: {
  eyebrow?: string;
  title?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("bg-brand-teal text-white px-6 py-4 flex items-center justify-between", className)}>
      <div>
        <p className="text-xs font-semibold tracking-wide text-brand-coral">{eyebrow}</p>
        <h1 className="text-lg font-bold">{title}</h1>
      </div>
      {right}
    </header>
  );
}
