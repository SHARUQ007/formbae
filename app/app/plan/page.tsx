import { NoWorkoutAssigned } from "@/components/NoWorkoutAssigned";
import { SectionTitle } from "@/components/SectionTitle";
import { requireUser } from "@/lib/auth/guard";
import { repo } from "@/lib/repo/sheets-repo";
import { getPlanForUser } from "@/lib/services/plans";
import { CalendarDays, ClipboardList, Dumbbell, UserRound } from "lucide-react";

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
  if (!plan) {
    return (
      <div className="page-shell px-3 pb-4 sm:px-0">
        <SectionTitle title="Full Plan" subtitle="No workout assigned yet" />
        <NoWorkoutAssigned />
      </div>
    );
  }
  const users = await repo.readUsers();
  const trainerName = users.find((u) => u.userId === plan.trainerId)?.name || "Trainer";
  const totalDays = plan.days.length;
  const totalExercises = plan.days.reduce((sum, day) => sum + day.exercises.length, 0);

  return (
    <div className="page-shell px-3 pb-4 sm:px-0">
      <SectionTitle title="Full Plan" subtitle="Your complete weekly split" />
      <section className="surface overflow-hidden p-0">
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 px-4 py-5 text-white sm:px-5 sm:py-6">
          <h2 className="text-2xl font-semibold leading-tight sm:text-3xl">{plan.title}</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Week of {plan.weekStartDate}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1">
              <UserRound className="h-3.5 w-3.5" />
              Coach: {trainerName}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 px-4 py-4 sm:grid-cols-3 sm:gap-3 sm:px-5">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
            <p className="text-xs text-zinc-500">Training Days</p>
            <p className="mt-1 text-xl font-semibold text-zinc-900">{totalDays}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
            <p className="text-xs text-zinc-500">Total Exercises</p>
            <p className="mt-1 text-xl font-semibold text-zinc-900">{totalExercises}</p>
          </div>
          <div className="col-span-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 sm:col-span-1">
            <p className="text-xs text-zinc-500">Plan Type</p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">Strength + Form Focus</p>
          </div>
        </div>
      </section>

      {(plan.overallNotes || plan.rawPlanText) && (
        <section className="surface overflow-hidden p-0">
          <div className="border-b border-emerald-100 bg-emerald-50/60 px-4 py-3 sm:px-5">
            <h3 className="text-base font-semibold text-zinc-900">Plan Brief</h3>
            <p className="mt-1 text-sm text-zinc-600">Key notes and the trainer&apos;s original text source.</p>
          </div>

          <div className="space-y-3 px-3 py-3 sm:px-4 sm:py-4">
            {plan.overallNotes && (
              <article className="rounded-xl border border-emerald-100 bg-white p-3">
                <h4 className="mb-2 flex items-center gap-2 font-semibold text-zinc-900">
                  <ClipboardList className="h-4 w-4 text-emerald-700" />
                  Overall Notes
                </h4>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-2.5">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{plan.overallNotes}</pre>
                </div>
              </article>
            )}

            {plan.rawPlanText && (
              <details className="group rounded-xl border border-emerald-100 bg-white p-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-semibold text-zinc-900">
                    <Dumbbell className="h-4 w-4 text-emerald-700" />
                    Trainer Original Workout Text
                  </span>
                  <span className="text-xs text-zinc-500 group-open:hidden">Tap to expand</span>
                  <span className="hidden text-xs text-zinc-500 group-open:inline">Tap to collapse</span>
                </summary>
                <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm leading-relaxed text-zinc-700">
                  {plan.rawPlanText}
                </pre>
              </details>
            )}
          </div>
        </section>
      )}

      {plan.days.map((d, dayIdx) => (
        <section key={`${d.planDayId}-${dayIdx}`} className="surface overflow-hidden p-0">
          <div className="border-b border-emerald-100 bg-emerald-50/60 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
                Day {d.dayNumber}
              </span>
              <h3 className="text-base font-semibold text-zinc-900 sm:text-lg">{d.focus}</h3>
            </div>
            {d.notes && <p className="mt-2 text-sm text-zinc-600">{d.notes}</p>}
          </div>
          <ul className="space-y-2 px-3 py-3 sm:px-4 sm:py-4">
            {d.exercises.map((e, exIdx) => (
              <li
                key={`${d.planDayId}-${e.exerciseId}-${exIdx}`}
                className="rounded-lg border border-emerald-100 bg-white p-2.5 text-sm sm:p-3"
              >
                {(() => {
                  const reps = cleanReps(e.reps);
                  if (isDurationExercise(e.exerciseName, reps)) {
                    return (
                      <div className="space-y-1">
                        <p className="font-medium text-zinc-900">{e.order}. {e.exerciseName}</p>
                        <p className="text-zinc-600">{reps || "duration"} • rest {e.restSec}s</p>
                      </div>
                    );
                  }
                  if (!reps) {
                    return (
                      <div className="space-y-1">
                        <p className="font-medium text-zinc-900">{e.order}. {e.exerciseName}</p>
                        <p className="text-zinc-600">rest {e.restSec}s</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-1">
                      <p className="font-medium text-zinc-900">{e.order}. {e.exerciseName}</p>
                      <p className="text-zinc-600">{e.sets} x {reps} • rest {e.restSec}s</p>
                    </div>
                  );
                })()}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
