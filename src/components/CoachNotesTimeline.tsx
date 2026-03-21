import { CoachNote } from "../lib/types";

type Props = {
  notes: CoachNote[];
};

const severityStyles = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

export default function CoachNotesTimeline({ notes }: Props) {
  if (!notes.length) {
    return (
      <div className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 text-lg font-semibold">Coach Notes</h3>
        <p className="text-sm text-gray-500">No notes recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-4 text-lg font-semibold">Coach Notes</h3>

      <div className="space-y-4">
        {notes.map((note) => (
          <div key={note.id} className="border-b pb-4 last:border-b-0">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="font-medium">{note.title}</p>
                <p className="text-xs text-gray-500">
                  {note.date} • {note.created_by}
                </p>
              </div>

              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  severityStyles[note.severity]
                }`}
              >
                {note.severity}
              </span>
            </div>

            <p className="text-sm text-gray-700">{note.description}</p>

            <p className="mt-2 text-xs uppercase tracking-wide text-gray-400">
              {note.type}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}