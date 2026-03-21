import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { evaluations, coaches } from "@/data/store";
import { getCoachName } from "@/data/helpers";
import { SECTION_MAX_SCORES } from "@/utils/scoring";
import { ScoreDisplay, PerformanceBadge } from "@/components/PerformanceBadge";

export default function EvaluationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const ev = evaluations.find(e => e.id === id);

  if (!ev) return <p className="text-sm text-muted-foreground">Evaluation not found.</p>;

  const coach = coaches.find(c => c.id === ev.coach_id);
  const sections = [
    { label: "Pre-Class", score: ev.pre_class_score, max: SECTION_MAX_SCORES.pre_class },
    { label: "First Timer Intro", score: ev.first_timer_intro_score, max: SECTION_MAX_SCORES.first_timer_intro },
    { label: "Intro", score: ev.intro_score, max: SECTION_MAX_SCORES.intro },
    { label: "Class", score: ev.class_score, max: SECTION_MAX_SCORES.class },
    { label: "Post Workout", score: ev.post_workout_score, max: SECTION_MAX_SCORES.post_workout },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="card-elevated p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">{coach ? getCoachName(coach) : "Unknown Coach"}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {ev.class_type} · {ev.class_date} at {ev.class_time} · {ev.class_size} members
            </p>
            <p className="text-xs text-muted-foreground mt-1">Evaluated by {ev.evaluator_name}</p>
          </div>
          <ScoreDisplay score={ev.normalized_score_percent} size="lg" />
        </div>
      </div>

      {/* Section Scores */}
      <div className="card-elevated p-5">
        <h2 className="text-sm font-semibold mb-4">Section Scores</h2>
        <div className="space-y-3">
          {sections.map(s => {
            const pct = Math.round((s.score / s.max) * 100);
            return (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-sm">{s.label}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 90 ? "bg-success" : pct >= 70 ? "bg-info" : pct >= 50 ? "bg-warning" : "bg-destructive"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-data text-sm w-16 text-right">{s.score}/{s.max}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Final Score */}
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Final Score</span>
          <div className="flex items-center gap-3">
            <span className="font-data text-lg">{ev.final_score} pts</span>
            <span className="font-data text-lg">{ev.normalized_score_percent}%</span>
            <PerformanceBadge score={ev.normalized_score_percent} size="lg" />
          </div>
        </div>
      </div>

      {ev.notes_general && (
        <div className="card-elevated p-5">
          <h2 className="text-sm font-semibold mb-2">Notes</h2>
          <p className="text-sm text-muted-foreground">{ev.notes_general}</p>
        </div>
      )}
    </div>
  );
}
