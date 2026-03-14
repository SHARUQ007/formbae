import { Card } from "@/components/Card";
import { DayCompleteToggle } from "@/components/DayCompleteToggle";
import { ExerciseCompleteToggle } from "@/components/ExerciseCompleteToggle";
import { ExerciseVideoPlayer } from "@/components/ExerciseVideoPlayer";
import { NoWorkoutAssigned } from "@/components/NoWorkoutAssigned";
import { SectionTitle } from "@/components/SectionTitle";
import { CalendarDays, Sparkles } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { repo } from "@/lib/repo/sheets-repo";
import { parseCuePack, effortFeedback } from "@/lib/rules/form-bae";
import { getPlanForUser } from "@/lib/services/plans";

export const dynamic = "force-dynamic";

function isDurationExercise(exerciseName: string, reps: string): boolean {
  const name = (exerciseName || "").toLowerCase();
  const repsLower = (reps || "").toLowerCase();
  return /mins?|minutes?/.test(repsLower) || /\b(cardio|cycling|treadmill|cross trainer|elliptical|walk|run|jog)\b/.test(name);
}

function cleanReps(reps: string): string {
  const value = (reps || "").trim();
  return value.toLowerCase() === "as prescribed" ? "" : value;
}

function parseDateOnly(value: string): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  return new Date(Date.UTC(y, m, d));
}

export default async function TodayPage({
  searchParams
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser("user");
  const plan = await getPlanForUser(user.userId);
  const [messagesRaw, workoutLogs, allUsers] = await Promise.all([repo.readMessages(), repo.readWorkoutLogs(), repo.readUsers()]);
  const messages = messagesRaw
    .filter((m) => m.userId === user.userId && m.planId === plan?.planId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (!plan || !plan.days.length) {
    return (
      <div className="page-shell px-3 pb-4 sm:px-0">
        <SectionTitle title="Today" subtitle="No workout assigned yet" />
        <NoWorkoutAssigned />
      </div>
    );
  }

  const selectedDay = typeof params.day === "string" ? params.day : "";
  const todayDay = plan.days.find((d) => d.planDayId === selectedDay) ?? plan.days[0];
  const logDate = new Date().toISOString().slice(0, 10);
  const dayLogs = workoutLogs.filter(
    (l) =>
      l.userId === user.userId &&
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
  const trainerName = allUsers.find((u) => u.userId === plan.trainerId)?.name || "Trainer";

  const startDate = parseDateOnly(plan.weekStartDate);
  const utcNow = new Date();
  const todayUtc = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate()));
  const daysSinceStart = startDate ? Math.floor((todayUtc.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) : 0;
  const slot = ((daysSinceStart % 7) + 7) % 7 + 1;
  const scheduledDay = plan.days.find((d) => Number(d.dayNumber) === slot) ?? null;

  return (
    <div className="page-shell px-3 pb-4 sm:px-0">
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
          <Link href="/app/plan" className="btn mt-3 w-full border border-white/40 bg-white/15 text-white hover:bg-white/25 sm:w-auto">
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
              <li
                key={`${e.planDayId}-${e.exerciseId}-${exIdx}`}
                className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_8px_24px_rgba(16,24,40,0.04)]"
              >
                <div className="space-y-3 p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-base font-semibold tracking-tight text-zinc-900">{e.exerciseName}</p>
                      {(() => {
                        const reps = repsValue;
                        const isDuration = isDurationExercise(e.exerciseName, reps);
                        const meta = isDuration
                          ? `${reps || "duration"} • rest ${e.restSec}s`
                          : reps
                            ? `${e.sets} sets • ${reps} reps • rest ${e.restSec}s`
                            : `rest ${e.restSec}s`;
                        return (
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                            {meta}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="shrink-0">
                      <ExerciseCompleteToggle
                        planId={plan.planId}
                        planDayId={todayDay.planDayId}
                        exerciseId={e.exerciseId}
                        initialCompleted={exerciseDone.has(e.exerciseId)}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-2">
                    <ExerciseVideoPlayer
                      planDayId={todayDay.planDayId}
                      exerciseId={e.exerciseId}
                      exerciseName={e.exerciseName}
                      initialVideoUrl={e.videoUrl}
                    />
                  </div>

                  <form action="/api/video/report" method="post" className="flex flex-wrap gap-2">
                    <input type="hidden" name="exerciseId" value={e.exerciseId} />
                    <input type="hidden" name="videoUrl" value={e.videoUrl} />
                    <input type="hidden" name="reason" value="user_reported_bad_video" />
                    <button type="submit" className="btn btn-secondary w-full text-xs sm:w-auto">
                      Report bad video
                    </button>
                  </form>
                </div>

                <div className="border-t border-emerald-100 bg-zinc-50/60 p-3 sm:p-4">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded-lg border border-zinc-200 bg-white p-2.5">
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

                    <div className="rounded-lg border border-zinc-200 bg-white p-2.5">
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

                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
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
        <DayCompleteToggle planId={plan.planId} planDayId={todayDay.planDayId} initialCompleted={dayCompleted} />
      </Card>

      <Card title="How did it feel?">
        <form action="/api/workouts/log" method="post" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <input type="hidden" name="planId" value={plan.planId} />
          <input type="hidden" name="planDayId" value={todayDay.planDayId} />
          <input type="hidden" name="quick" value="true" />
          {(["easy", "ok", "hard", "pain"] as const).map((level) => (
            <button key={level} name="feel" value={level} className="btn btn-secondary capitalize">
              {level}
            </button>
          ))}
        </form>
        <p className="mt-2 text-xs text-zinc-500">{effortFeedback("ok")}</p>
      </Card>

      <Card title="Messages">
        <form action="/api/messages" method="post" className="mb-3 flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="planId" value={plan.planId} />
          <input name="text" placeholder="Ask your trainer a question" autoComplete="off" autoCorrect="off" spellCheck={false} required />
          <button className="btn btn-primary w-full sm:w-auto" type="submit">
            Send
          </button>
        </form>
        <div className="space-y-2">
          {messages.map((m) => (
            <div key={m.messageId} className="rounded border border-emerald-100 p-2 text-sm">
              <p className="text-xs text-zinc-500">
                {m.senderRole === "trainer" ? `Trainer: ${trainerName}` : `User: ${user.name}`} • {new Date(m.createdAt).toLocaleString()}
              </p>
              <p>{m.text}</p>
            </div>
          ))}
          {!messages.length && <p className="text-sm text-zinc-500">No messages yet.</p>}
        </div>
      </Card>

    </div>
  );
}
