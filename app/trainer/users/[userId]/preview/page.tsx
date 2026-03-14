import Link from "next/link";
import { Card } from "@/components/Card";
import { NoWorkoutAssigned } from "@/components/NoWorkoutAssigned";
import { SectionTitle } from "@/components/SectionTitle";
import { requireUser } from "@/lib/auth/guard";
import { repo } from "@/lib/repo/sheets-repo";
import { getPlanForUser } from "@/lib/services/plans";

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

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/shorts\/([^?&/]+)/i,
    /youtube\.com\/watch\?v=([^?&/]+)/i,
    /youtube\.com\/embed\/([^?&/]+)/i,
    /youtu\.be\/([^?&/]+)/i
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
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
  const [users, plan] = await Promise.all([repo.readUsers(), getPlanForUser(userId)]);

  const trainee = users.find((u) => u.userId === userId && u.role === "user" && u.trainerId === trainer.userId);
  if (!trainee) return <p>User not found.</p>;

  if (!plan || !plan.days.length) {
    return (
      <div className="page-shell px-3 pb-4 sm:px-0">
        <SectionTitle title={`Preview: ${trainee.name}`} subtitle="No active plan assigned yet" />
        <NoWorkoutAssigned compact />
      </div>
    );
  }

  const view = query.view === "plan" ? "plan" : "today";
  const selectedDay = typeof query.day === "string" ? query.day : "";
  const day = plan.days.find((d) => d.planDayId === selectedDay) ?? plan.days[0];

  const startDate = parseDateOnly(plan.weekStartDate);
  const utcNow = new Date();
  const todayUtc = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate()));
  const daysSinceStart = startDate ? Math.floor((todayUtc.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) : 0;
  const slot = ((daysSinceStart % 7) + 7) % 7 + 1;
  const scheduledDay = plan.days.find((d) => Number(d.dayNumber) === slot) ?? null;

  return (
    <div className="page-shell px-3 pb-4 sm:px-0">
      <SectionTitle
        title="User POV Preview"
        subtitle={`${trainee.name} • ${plan.title} • This is a trainer-only preview`}
      />
      <p className="alert-warn text-sm">
        Note: After you send a plan, exercise videos can take a couple of minutes to populate in the user view.
      </p>

      <Card title="Preview Controls">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/trainer/users/${trainee.userId}/preview?view=today&day=${day.planDayId}`}
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
          <section className="surface p-3 sm:p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Scheduled today</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">
              {scheduledDay ? `Day ${scheduledDay.dayNumber} - ${scheduledDay.focus}` : "Rest / no assigned day"}
            </p>
            <form method="get" className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <input type="hidden" name="view" value="today" />
              <div>
                <label htmlFor="day" className="text-zinc-600">
                  Preview another day
                </label>
                <select id="day" name="day" defaultValue={day.planDayId} className="w-full bg-white text-sm">
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
          </section>

          {plan.overallNotes && (
            <div className="surface p-3 text-sm sm:p-4">
              <p className="mb-1 font-medium">Overall Notes</p>
              <pre className="whitespace-pre-wrap text-zinc-700">{plan.overallNotes}</pre>
            </div>
          )}

          <Card title={`Focus: ${day.focus}`}>
            <ul className="space-y-4">
              {day.exercises.map((e, exIdx) => {
                const reps = cleanReps(e.reps);
                const isDuration = isDurationExercise(e.exerciseName, reps);
                return (
                  <li key={`${e.planDayId}-${e.exerciseId}-${exIdx}`} className="rounded-xl border border-emerald-100 p-3 sm:p-4">
                    <p className="font-medium">{e.exerciseName}</p>
                    <p className="text-sm text-zinc-600">
                      {isDuration
                        ? `${reps || "duration"} • rest ${e.restSec}s`
                        : reps
                          ? `${e.sets} sets • ${reps} reps • rest ${e.restSec}s`
                          : `rest ${e.restSec}s`}
                    </p>
                    {(() => {
                      const videoId = getYouTubeVideoId(e.videoUrl || "");
                      if (!videoId) {
                        if (!e.videoUrl) return null;
                        return (
                          <a href={e.videoUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-emerald-700 underline">
                            Open video
                          </a>
                        );
                      }
                      return (
                        <div className="mt-3 mx-auto w-full max-w-[320px] rounded-2xl border border-emerald-100 bg-white p-2 shadow-sm">
                          <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-black">
                            <iframe
                              src={`https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0`}
                              title={`${e.exerciseName} preview`}
                              className="absolute inset-0 h-full w-full"
                              loading="lazy"
                              referrerPolicy="strict-origin-when-cross-origin"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      ) : (
        <>
          {(plan.overallNotes || plan.rawPlanText) && (
            <section className="surface overflow-hidden p-0">
              <div className="border-b border-emerald-100 bg-emerald-50/60 px-4 py-3 sm:px-5">
                <h3 className="text-base font-semibold text-zinc-900">Plan Brief</h3>
              </div>
              <div className="space-y-3 px-3 py-3 sm:px-4 sm:py-4">
                {plan.overallNotes && (
                  <article className="rounded-xl border border-emerald-100 bg-white p-3">
                    <h4 className="mb-2 font-semibold text-zinc-900">Overall Notes</h4>
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{plan.overallNotes}</pre>
                  </article>
                )}
                {plan.rawPlanText && (
                  <details className="group rounded-xl border border-emerald-100 bg-white p-3">
                    <summary className="cursor-pointer list-none font-semibold text-zinc-900">Trainer Original Workout Text</summary>
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
              </div>
              <ul className="space-y-2 px-3 py-3 sm:px-4 sm:py-4">
                {d.exercises.map((e, exIdx) => (
                  <li key={`${d.planDayId}-${e.exerciseId}-${exIdx}`} className="rounded-lg border border-emerald-100 bg-white p-2.5 text-sm sm:p-3">
                    <p className="font-medium text-zinc-900">{e.order}. {e.exerciseName}</p>
                    <p className="text-zinc-600">{e.sets} x {cleanReps(e.reps) || "-"} • rest {e.restSec}s</p>
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
