import Link from "next/link";
import { Card } from "@/components/Card";
import { ExerciseVideoPlayer } from "@/components/ExerciseVideoPlayer";
import { NoWorkoutAssigned } from "@/components/NoWorkoutAssigned";
import { SectionTitle } from "@/components/SectionTitle";
import { requireUser } from "@/lib/auth/guard";
import { repo } from "@/lib/repo/sheets-repo";
import { parseCuePack, effortFeedback } from "@/lib/rules/form-bae";
import { getPlanForUser } from "@/lib/services/plans";
import { CalendarDays, ClipboardList, Sparkles } from "lucide-react";

function parseDateOnly(value: string): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  return new Date(Date.UTC(y, m, d));
}

function isDurationExercise(exerciseName: string, reps: string): boolean {
  const name = (exerciseName || "").toLowerCase();
  const repsLower = (reps || "").toLowerCase();
  return /mins?|minutes?/.test(repsLower) || /\b(cardio|cycling|treadmill|cross trainer|elliptical|walk|run|jog)\b/.test(name);
}

function cleanReps(reps: string): string {
  const value = (reps || "").trim();
  return value.toLowerCase() === "as prescribed" ? "" : value;
}

export default async function TrainerUserPreviewPage({
  params,
  searchParams
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ view?: string; day?: string }>;
}) {
  const trainer = await requireUser("trainer");
  const { userId } = await params;
  const query = await searchParams;
  const plan = await getPlanForUser(userId);
  const [users, messagesRaw, workoutLogs] = await Promise.all([repo.readUsers(), repo.readMessages(), repo.readWorkoutLogs()]);

  const trainee = users.find((u) => u.userId === userId && u.role === "user" && u.trainerId === trainer.userId);
  if (!trainee) return <p>User not found.</p>;

  if (!plan || !plan.days.length) {
    return (
      <div className="page-shell px-3 pb-4 sm:px-0">
        <SectionTitle title={`Preview: ${trainee.name}`} subtitle="No workout assigned yet" />
        <NoWorkoutAssigned compact />
      </div>
    );
  }

  const trainerName = users.find((u) => u.userId === plan.trainerId)?.name || "Trainer";
  const messages = messagesRaw
    .filter((m) => m.userId === trainee.userId && m.planId === plan.planId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const view = query.view === "plan" ? "plan" : "today";
  const selectedDay = typeof query.day === "string" ? query.day : "";
  const todayDay = plan.days.find((d) => d.planDayId === selectedDay) ?? plan.days[0];

  const logDate = new Date().toISOString().slice(0, 10);
  const dayLogs = workoutLogs.filter(
    (l) =>
      l.userId === trainee.userId &&
      l.planId === plan.planId &&
      l.planDayId === todayDay.planDayId &&
      l.date === logDate
  );
  const exerciseDone = new Set(
    dayLogs
      .map((l) => l.notes.match(/^completion:exercise:(.+)$/)?.[1] ?? "")
      .filter(Boolean)
  );
  const dayCompleted = dayLogs.some((l) => l.notes === "completion:day");

  const startDate = parseDateOnly(plan.weekStartDate);
  const utcNow = new Date();
  const todayUtc = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate()));
  const daysSinceStart = startDate ? Math.floor((todayUtc.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) : 0;
  const slot = ((daysSinceStart % 7) + 7) % 7 + 1;
  const scheduledDay = plan.days.find((d) => Number(d.dayNumber) === slot) ?? null;

  return (
    <div className="page-shell px-3 pb-4 sm:px-0">
      <SectionTitle title="User POV Preview" subtitle={`${trainee.name} • Trainer-only mirror of user screens`} />
      <p className="alert-warn text-sm">Preview mode is read-only. Layout/content mirrors what the trainee sees.</p>

      <Card title="Preview Controls">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/trainer/users/${trainee.userId}/preview?view=today&day=${todayDay.planDayId}`}
            className={`btn ${view === "today" ? "btn-primary" : "btn-secondary"} w-full sm:w-auto`}
          >
            Today Screen
          </Link>
          <Link
            href={`/trainer/users/${trainee.userId}/preview?view=plan`}
            className={`btn ${view === "plan" ? "btn-primary" : "btn-secondary"} w-full sm:w-auto`}
          >
            Full Plan Screen
          </Link>
          <Link href={`/trainer/users/${trainee.userId}`} className="btn btn-muted w-full sm:w-auto">
            Back to Trainee
          </Link>
        </div>
      </Card>

      {view === "today" ? (
        <>
          <SectionTitle title="Today" subtitle={`${plan.title} • Day ${todayDay.dayNumber} • Coach: ${trainerName}`} />
          <section className="surface overflow-hidden p-0">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-4 text-white sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-emerald-100">Weekly Navigation</p>
                  <h3 className="mt-1 text-lg font-semibold">Need the complete weekly split?</h3>
                  <p className="mt-1 text-sm text-emerald-100">Open the full plan to scan all workout days in one place.</p>
                </div>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <Sparkles className="h-5 w-5" />
                </span>
              </div>
              <Link href={`/trainer/users/${trainee.userId}/preview?view=plan`} className="btn mt-3 w-full border border-white/40 bg-white/15 text-white hover:bg-white/25 sm:w-auto">
                View Full Workout Plan
              </Link>
            </div>

            <div className="space-y-3 bg-white px-4 py-4 sm:px-5">
              <div className="flex items-center gap-2 text-zinc-500">
                <CalendarDays className="h-4 w-4" />
                <p className="text-xs uppercase tracking-wide">Today&apos;s Slot</p>
              </div>
              <p className="text-lg font-semibold text-zinc-900">
                {scheduledDay ? `Day ${scheduledDay.dayNumber} - ${scheduledDay.focus}` : "Rest / no assigned day"}
              </p>
              <form method="get" className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <input type="hidden" name="view" value="today" />
                <div>
                  <label htmlFor="day" className="text-zinc-600">
                    Preview another day
                  </label>
                  <select id="day" name="day" defaultValue={todayDay.planDayId} className="w-full bg-white text-sm">
                    {plan.days.map((d, idx) => (
                      <option key={`${d.planDayId}-${idx}`} value={d.planDayId}>
                        Day {d.dayNumber} - {d.focus}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-secondary w-full sm:w-auto">
                  Switch Day
                </button>
              </form>
              <p className="text-xs text-zinc-500">This only updates your current page view.</p>
            </div>
          </section>

          {plan.overallNotes && (
            <div className="surface p-3 text-sm sm:p-4">
              <p className="mb-1 font-medium">Overall Notes</p>
              <pre className="whitespace-pre-wrap text-zinc-700">{plan.overallNotes}</pre>
            </div>
          )}

          <Card title={`Focus: ${todayDay.focus}`}>
            <ul className="space-y-4">
              {todayDay.exercises.map((e, exIdx) => {
                const pack = parseCuePack(e.cuesJson);
                const repsValue = cleanReps(e.reps);
                return (
                  <li key={`${e.planDayId}-${e.exerciseId}-${exIdx}`} className="rounded-xl border border-emerald-100 p-3 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{e.exerciseName}</p>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          exerciseDone.has(e.exerciseId) ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {exerciseDone.has(e.exerciseId) ? "Completed" : "Not done"}
                      </span>
                    </div>
                    {(() => {
                      const reps = repsValue;
                      const isDuration = isDurationExercise(e.exerciseName, reps);
                      return (
                        <p className="text-sm text-zinc-600">
                          {isDuration
                            ? `${reps || "duration"} • rest ${e.restSec}s`
                            : reps
                              ? `${e.sets} sets • ${reps} reps • rest ${e.restSec}s`
                              : `rest ${e.restSec}s`}
                        </p>
                      );
                    })()}
                    <ExerciseVideoPlayer
                      planDayId={todayDay.planDayId}
                      exerciseId={e.exerciseId}
                      exerciseName={e.exerciseName}
                      initialVideoUrl={e.videoUrl}
                    />
                    <div className="mt-3 space-y-2">
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-semibold text-white">
                              C
                            </span>
                            <p className="text-xs font-semibold text-zinc-800">Key Cues</p>
                          </div>
                          <ul className="space-y-1 text-xs text-zinc-700">
                            {pack.cues.map((c) => (
                              <li key={c} className="flex items-start gap-2">
                                <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-zinc-400" />
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-semibold text-white">
                              M
                            </span>
                            <p className="text-xs font-semibold text-zinc-800">Common Mistakes</p>
                          </div>
                          <ul className="space-y-1 text-xs text-zinc-700">
                            {pack.mistakes.map((m) => (
                              <li key={m} className="flex items-start gap-2">
                                <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-zinc-400" />
                                <span>{m}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                        <span className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full border border-amber-300 text-[10px] font-semibold">
                          !
                        </span>
                        <span className="font-medium">Safety:</span> {pack.safety}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title="Day Completion">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                dayCompleted ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {dayCompleted ? "Completed" : "Incomplete"}
            </span>
          </Card>

          <Card title="How did it feel?">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {(["easy", "ok", "hard", "pain"] as const).map((level) => (
                <button key={level} type="button" className="btn btn-secondary capitalize" disabled>
                  {level}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-500">{effortFeedback("ok")}</p>
          </Card>

          <Card title="Messages">
            <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-600">
              Read-only in preview mode.
            </div>
            <div className="space-y-2">
              {messages.map((m) => (
                <div key={m.messageId} className="rounded border border-emerald-100 p-2 text-sm">
                  <p className="text-xs text-zinc-500">
                    {m.senderRole === "trainer" ? `Trainer: ${trainerName}` : `User: ${trainee.name}`} • {new Date(m.createdAt).toLocaleString()}
                  </p>
                  <p>{m.text}</p>
                </div>
              ))}
              {!messages.length && <p className="text-sm text-zinc-500">No messages yet.</p>}
            </div>
          </Card>
        </>
      ) : (
        <>
          <SectionTitle title="Full Plan" subtitle="Your complete weekly split" />
          <section className="surface overflow-hidden p-0">
            <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 px-4 py-5 text-white sm:px-5 sm:py-6">
              <h2 className="text-2xl font-semibold leading-tight sm:text-3xl">{plan.title}</h2>
              <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Week of {plan.weekStartDate}
                </span>
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
                        <ClipboardList className="h-4 w-4 text-emerald-700" />
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
        </>
      )}
    </div>
  );
}
