import { useState } from "react";
import type { CoachNoteSeverity, CoachNoteType } from "../lib/types";

type TimelineNote = {
  id: string;
  coach_id: string;
  date: string;
  type: CoachNoteType;
  severity: CoachNoteSeverity;
  title: string;
  description: string;
  created_by: string;
};

type Props = {
  notes: TimelineNote[];
  onEdit: (note: TimelineNote) => void;
  onDelete: (noteId: string) => void;
  deletingId?: string | null;
};

const severityStyles = {
  low: "border-info/20 bg-info/10 text-info",
  medium: "border-warning/20 bg-warning/10 text-warning",
  high: "border-destructive/20 bg-destructive/10 text-destructive",
};

export default function CoachNotesTimeline({
  notes,
  onEdit,
  onDelete,
  deletingId,
}: Props) {
  if (!notes.length) {
    return (
      <div className="surface-panel rounded-2xl p-5">
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          Coach Notes
        </h3>
        <p className="text-sm text-muted-foreground">No notes recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="surface-panel rounded-2xl p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">
        Coach Notes
      </h3>

      <div className="space-y-4">
        {notes.map((note) => (
          <div
            key={note.id}
            className="border-b border-white/8 pb-4 last:border-b-0 last:pb-0"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {note.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {note.date} • {note.created_by}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${
                    severityStyles[note.severity]
                  }`}
                >
                  {note.severity}
                </span>

                <button
                  type="button"
                  onClick={() => onEdit(note)}
                  className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-white/[0.04]"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(note.id)}
                  disabled={deletingId === note.id}
                  className="rounded-lg border border-destructive/20 px-2.5 py-1 text-xs font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
                >
                  {deletingId === note.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>

            <p className="text-sm text-foreground/90">{note.description}</p>

            <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {note.type.replace("_", " ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}