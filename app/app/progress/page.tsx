import { ProgressCharts } from "@/components/ProgressCharts";
import { SectionTitle } from "@/components/SectionTitle";
import { requireUser } from "@/lib/auth/guard";
import { nudgeByAdherence } from "@/lib/rules/form-bae";
import { getUserProgress } from "@/lib/services/progress";
import Link from "next/link";

export default async function ProgressPage() {
  const user = await requireUser("user");
  const progress = await getUserProgress(user.userId);

  return (
    <div className="page-shell">
      <SectionTitle title="Progress" subtitle={`Adherence: ${progress.adherencePct}%`} />
      <div className="surface p-4 text-sm">
        <p>{nudgeByAdherence(progress.adherencePct)}</p>
      </div>
      <div className="surface p-4">
        <h3 className="mb-3 text-sm font-semibold">Workout Tracker</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-emerald-100 bg-white p-3">
            <p className="text-xs text-zinc-500">Planned</p>
            <p className="text-xl font-semibold text-zinc-900">{progress.planned}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white p-3">
            <p className="text-xs text-zinc-500">Completed</p>
            <p className="text-xl font-semibold text-zinc-900">{progress.completed}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white p-3">
            <p className="text-xs text-zinc-500">Pending</p>
            <p className="text-xl font-semibold text-zinc-900">{Math.max(0, progress.planned - progress.completed)}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white p-3">
            <p className="text-xs text-zinc-500">Adherence</p>
            <p className="text-xl font-semibold text-zinc-900">{progress.adherencePct}%</p>
          </div>
        </div>
      </div>
      <ProgressCharts data={progress.bodyTrend} />
      <form action="/api/body-log" method="post" className="surface grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input name="date" type="date" required />
        <input name="weight" placeholder="Weight" />
        <input name="chest" placeholder="Chest" />
        <input name="waist" placeholder="Waist" />
        <input name="biceps" placeholder="Biceps" />
        <button className="btn btn-primary w-full sm:col-span-2 lg:col-span-5" type="submit">
          Save Body Log
        </button>
      </form>
      <div className="surface p-4">
        <h3 className="mb-2 text-sm font-semibold">Strength Progression (Top Volume)</h3>
        <p className="mb-2 text-xs text-zinc-500">
          Add reps and weights in <Link href="/app/log" className="underline">Log Workout</Link> to track strength growth here.
        </p>
        <ul className="space-y-1 text-sm">
          {progress.strengthProgression.map((s) => (
            <li key={s.exerciseId}>{s.exerciseId}: {s.topVolume.toFixed(1)}</li>
          ))}
          {!progress.strengthProgression.length && <li>No set logs yet.</li>}
        </ul>
      </div>
    </div>
  );
}
