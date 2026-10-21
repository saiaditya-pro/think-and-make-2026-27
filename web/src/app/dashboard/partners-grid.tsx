"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { StatusBanner } from "@/components/forms/status-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { partnerHref } from "@/hooks/use-partner-route";
import { usePartners } from "@/hooks/use-school-lookup";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

export function PartnersGrid() {
  const partnersQuery = usePartners();
  const partners = partnersQuery.data?.results ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Partners</h1>
        <p className="text-sm text-slate-500">Choose a partner to see its dashboard and fill its forms.</p>
      </div>

      {partnersQuery.isError && (
        <StatusBanner
          title="Couldn't load partners."
          body="Check your connection and try again."
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => partnersQuery.refetch()}>
              Retry
            </Button>
          }
        />
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {partnersQuery.isLoading &&
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-white/70" aria-hidden />
          ))}

        {partners.map((partner) => (
          <Link
            key={partner.id}
            href={partnerHref(String(partner.id)) as never}
            className="group block rounded-xl focus-visible:outline-2 focus-visible:outline-brand-coral"
          >
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardContent className="flex h-full flex-col gap-3 py-2">
                <span
                  className="flex size-10 items-center justify-center rounded-lg bg-brand-teal text-sm font-bold text-white"
                  aria-hidden
                >
                  {initials(partner.name)}
                </span>
                <p className="font-semibold text-slate-800">{partner.name}</p>
                <span className="mt-auto flex items-center gap-1 text-xs font-medium text-brand-coral">
                  Open <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {partnersQuery.isSuccess && partners.length === 0 && (
        <p className="text-sm text-slate-500">No partners yet. Add one in the admin.</p>
      )}
    </div>
  );
}
