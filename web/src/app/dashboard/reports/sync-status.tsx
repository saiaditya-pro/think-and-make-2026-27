"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/api-error";

import { useRunSync, useSyncStatus } from "./use-reports-data";

const STATUS_LABEL = {
  running: "Syncing…",
  success: "Synced",
  partial: "Partly synced",
  failed: "Sync failed",
} as const;

/** "Last synced from Google Sheets" line + a Sync-now button for admins. */
export function SyncStatus({ isAdmin }: { isAdmin: boolean }) {
  const { data } = useSyncStatus(true);
  const runSync = useRunSync();

  if (!data?.configured) return null;
  const run = data.last_run;
  const when = run ? new Date(run.finished_at ?? run.started_at).toLocaleString() : null;

  function onSync() {
    runSync.mutate(undefined, {
      onSuccess: (res) => toast.success(res.queued ? "Sync started." : "Sync finished."),
      onError: (err) => toast.error(apiErrorMessage(err) ?? "Could not start the sync."),
    });
  }

  return (
    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
      <span className={run?.status === "failed" || run?.status === "partial" ? "text-destructive" : undefined}>
        {run ? `Google Sheets: ${STATUS_LABEL[run.status]} · ${when}` : "Google Sheets: not synced yet"}
      </span>
      {isAdmin && (
        <Button size="xs" variant="outline" onClick={onSync} disabled={runSync.isPending || run?.status === "running"}>
          {runSync.isPending ? "Syncing…" : "Sync now"}
        </Button>
      )}
    </div>
  );
}
