import { ProgressCharts } from "@/components/ProgressCharts";
import { SectionTitle } from "@/components/SectionTitle";
import { requireUser } from "@/lib/auth/guard";
import { nudgeByAdherence } from "@/lib/rules/form-bae";
import { getUserProgress } from "@/lib/services/progress";
import { Activity, CalendarDays, CircleCheckBig, Clock3, Dumbbell } from "lucide-react";
import Link from "next/link";

export default async function ProgressPage() {
  const user = await requireUser("user");
  const progress = await getUserProgress(user.userId);
  const pending = Math.max(0, progress.planned - progress.completed);
  const adherenceTone =
    progress.adherencePct >= 80 ? "text-emerald-800" : progress.adherencePct >= 60 ? "text-amber-800" : "text-rose-800";
  const adherenceBg =
    progress.adherencePct >= 80 ? "bg-emerald-100/80" : progress.adherencePct >= 60 ? "bg-amber-100/80" : "bg-rose-100/80";

  return (
    <div className="page-shell px-3 pb-4 sm:px-0">
      <SectionTitle title="Progress" subtitle={`Adherence: ${progress.adherencePct}%`} />

      <section className="surface overflow-hidden p-0">
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 px-4 py-4 text-white sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-100">Weekly Snapshot</p>
              <h2 className="mt-1 text-xl font-semibold sm:text-2xl">Keep your streak alive</h2>
              <p className="mt-1 text-sm text-emerald-100">{nudgeByAdherence(progress.adherencePct)}</p>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${adherenceBg} ${adherenceTone}`}>
              <Activity className="h-3.5 w-3.5" />
              {progress.adherencePct}% adherence
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 px-3 py-3 sm:grid-cols-4 sm:gap-3 sm:px-4 sm:py-4">
          <div className="rounded-xl border border-emerald-100 bg-white p-3">
            <p className="mb-1 flex items-center gap-1 text-xs text-zinc-500">
              <CalendarDays className="h-3.5 w-3.5" />
              Planned
            </p>
            <p className="text-2xl font-semibold text-zinc-900">{progress.planned}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white p-3">
            <p className="mb-1 flex items-center gap-1 text-xs text-zinc-500">
              <CircleCheckBig className="h-3.5 w-3.5" />
              Completed
            </p>
            <p className="text-2xl font-semibold text-zinc-900">{progress.completed}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white p-3">
            <p className="mb-1 flex items-center gap-1 text-xs text-zinc-500">
              <Clock3 className="h-3.5 w-3.5" />
              Pending
            </p>
            <p className="text-2xl font-semibold text-zinc-900">{pending}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white p-3">
            <p className="mb-1 flex items-center gap-1 text-xs text-zinc-500">
              <Activity className="h-3.5 w-3.5" />
              Adherence
            </p>
            <p className="text-2xl font-semibold text-zinc-900">{progress.adherencePct}%</p>
          </div>
        </div>
      </section>

      <div className="surface p-3 sm:p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-800">Body Metrics Trend</h3>
        <ProgressCharts data={progress.bodyTrend} />
      </div>

      <section className="surface p-3 sm:p-4">
        <h3 className="mb-1 text-sm font-semibold text-zinc-900">Log New Body Measurement</h3>
        <p className="mb-3 text-xs text-zinc-500">Add weekly stats to get cleaner trend charts.</p>
        <form action="/api/body-log" method="post" className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <input name="date" type="date" required />
          <input name="weight" placeholder="Weight (kg)" />
          <input name="chest" placeholder="Chest (cm)" />
          <input name="waist" placeholder="Waist (cm)" />
          <input name="biceps" placeholder="Biceps (cm)" />
          <button className="btn btn-primary w-full sm:col-span-2 lg:col-span-5" type="submit">
            Save Body Log
          </button>
        </form>
      </section>

      <div className="surface p-3 sm:p-4">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <Dumbbell className="h-4 w-4 text-emerald-700" />
          Strength Progression
        </h3>
        <p className="mb-3 text-xs text-zinc-500">
          Add reps and weights in <Link href="/app/log" className="underline">Log Workout</Link> to keep this leaderboard updated.
        </p>
        <ul className="space-y-2 text-sm">
          {progress.strengthProgression.map((s, idx) => (
            <li key={s.exerciseId} className="flex items-center justify-between rounded-lg border border-emerald-100 bg-white px-3 py-2">
              <span className="truncate pr-2">
                <span className="mr-2 text-xs text-zinc-500">#{idx + 1}</span>
                {s.exerciseId}
              </span>
              <span className="font-semibold text-zinc-800">{s.topVolume.toFixed(1)}</span>
            </li>
          ))}
          {!progress.strengthProgression.length && <li className="rounded-lg border border-emerald-100 bg-white px-3 py-2 text-zinc-500">No set logs yet.</li>}
        </ul>
      </div>
    </div>
  );
}
