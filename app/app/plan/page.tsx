import { SectionTitle } from "@/components/SectionTitle";
import { requireUser } from "@/lib/auth/guard";
import { repo } from "@/lib/repo/sheets-repo";
import { getPlanForUser } from "@/lib/services/plans";

function isDurationExercise(exerciseName: string, reps: string): boolean {
  const name = (exerciseName || "").toLowerCase();
  const repsLower = (reps || "").toLowerCase();
  return /mins?|minutes?/.test(repsLower) || /\b(cardio|cycling|treadmill|cross trainer|elliptical|walk|run|jog)\b/.test(name);
}

function cleanReps(reps: string): string {
  const value = (reps || "").trim();
  return value.toLowerCase() === "as prescribed" ? "" : value;
}

export default async function PlanPage() {
  const user = await requireUser("user");
  const plan = await getPlanForUser(user.userId);
  if (!plan) return <p>No active plan assigned.</p>;
  const users = await repo.readUsers();
  const trainerName = users.find((u) => u.userId === plan.trainerId)?.name || "Trainer";

  return (
    <div className="page-shell px-3 pb-4 sm:px-0">
      <SectionTitle title={plan.title} subtitle={`Week starting ${plan.weekStartDate} • Coach: ${trainerName}`} />
      {plan.overallNotes && (
        <section className="surface p-3 sm:p-4">
          <h3 className="mb-2 font-semibold">Overall Notes</h3>
          <pre className="whitespace-pre-wrap text-sm text-zinc-700">{plan.overallNotes}</pre>
        </section>
      )}
      {plan.rawPlanText && (
        <section className="surface p-3 sm:p-4">
          <h3 className="mb-2 font-semibold">Trainer Original Workout Text</h3>
          <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap text-sm text-zinc-700">{plan.rawPlanText}</pre>
        </section>
      )}
      {plan.days.map((d, dayIdx) => (
        <section key={`${d.planDayId}-${dayIdx}`} className="surface p-3 sm:p-4">
          <h3 className="font-semibold">Day {d.dayNumber}: {d.focus}</h3>
          <p className="mb-2 text-sm text-zinc-600">{d.notes}</p>
          <ul className="space-y-2 rounded-lg border border-emerald-100 bg-emerald-50/30 p-2 sm:p-3">
            {d.exercises.map((e, exIdx) => (
              <li key={`${d.planDayId}-${e.exerciseId}-${exIdx}`} className="break-words text-sm">
                {(() => {
                  const reps = cleanReps(e.reps);
                  if (isDurationExercise(e.exerciseName, reps)) {
                    return `${e.order}. ${e.exerciseName} • ${reps || "duration"} • rest ${e.restSec}s`;
                  }
                  if (!reps) {
                    return `${e.order}. ${e.exerciseName} • rest ${e.restSec}s`;
                  }
                  return `${e.order}. ${e.exerciseName} • ${e.sets} x ${reps} • rest ${e.restSec}s`;
                })()}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
