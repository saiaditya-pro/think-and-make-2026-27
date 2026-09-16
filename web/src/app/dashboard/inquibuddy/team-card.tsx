"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, ImagePlus, Loader2, Mic, Music } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRef } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { InquibuddySubmission } from "@/lib/types";

const STATUS_LABEL: Record<InquibuddySubmission["status"], { text: string; className: string }> = {
  pending: { text: "Yet to submit idea", className: "bg-slate-100 text-slate-600" },
  processing: { text: "Generating…", className: "bg-sky-100 text-sky-700" },
  evaluated: { text: "Evaluated", className: "bg-emerald-100 text-emerald-700" },
};

export function TeamCard({
  submission,
  schoolId,
  grade,
  section,
}: {
  submission: InquibuddySubmission;
  schoolId: number;
  grade: string;
  section: string;
}) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const queryClient = useQueryClient();
  const photoInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);

  const hasPhoto = submission.submission_files.some((f) => f.kind === "photo");
  const hasAudio = submission.submission_files.some((f) => f.kind === "audio");
  const status = hasPhoto && submission.status === "pending"
    ? { text: "Photo ready", className: "bg-sky-100 text-sky-700" }
    : STATUS_LABEL[submission.status];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["inquibuddy-submissions", schoolId, grade, section] });

  const upload = useMutation({
    mutationFn: async ({ kind, file }: { kind: "photo" | "audio"; file: File }) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/inquibuddy-submissions/${submission.id}/upload-${kind}/`,
        { method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: form },
      );
      if (!res.ok) throw new Error("upload failed");
    },
    onSuccess: invalidate,
    onError: () => toast.error("Upload failed."),
  });

  async function downloadReport() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/inquibuddy-submissions/${submission.id}/report/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      toast.error("Report not ready yet.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `InquiBuddy_Team${submission.team_code}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardContent className="space-y-2 py-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800">Team {submission.team_code}</p>
            <p className="text-xs text-slate-500">SL: {submission.sl_name}</p>
          </div>
          <Badge className={status.className} variant="secondary">{status.text}</Badge>
        </div>

        {submission.status === "evaluated" ? (
          <Button size="sm" variant="outline" className="w-full" onClick={downloadReport}>
            &darr; PDF
          </Button>
        ) : (
          <div className="space-y-2">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Idea Photo</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className={hasPhoto ? "border-emerald-400 text-emerald-700 flex-1" : "flex-1"}
                  onClick={() => photoInput.current?.click()}
                  disabled={upload.isPending}
                >
                  {upload.isPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                  Take Photo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={hasPhoto ? "border-emerald-400 text-emerald-700 flex-1" : "flex-1"}
                  onClick={() => photoInput.current?.click()}
                  disabled={upload.isPending}
                >
                  <ImagePlus className="size-4" /> Upload Image
                </Button>
              </div>
              <input
                ref={photoInput}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => e.target.files?.[0] && upload.mutate({ kind: "photo", file: e.target.files[0] })}
              />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Idea Audio (Optional)</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className={hasAudio ? "border-emerald-400 text-emerald-700 flex-1" : "flex-1"}
                  onClick={() => audioInput.current?.click()}
                >
                  <Mic className="size-4" /> Record Audio
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={hasAudio ? "border-emerald-400 text-emerald-700 flex-1" : "flex-1"}
                  onClick={() => audioInput.current?.click()}
                >
                  <Music className="size-4" /> Upload Audio
                </Button>
              </div>
              <input
                ref={audioInput}
                type="file"
                accept="audio/*"
                capture
                hidden
                onChange={(e) => e.target.files?.[0] && upload.mutate({ kind: "audio", file: e.target.files[0] })}
              />
            </div>
          </div>
        )}

        {submission.ai_feedback_questions.length > 0 && (
          <ul className="text-xs text-slate-500 list-decimal list-inside space-y-0.5 pt-1">
            {submission.ai_feedback_questions.slice(0, 2).map((q) => (
              <li key={q.id}>{q.question_en}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
