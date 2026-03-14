import Link from "next/link";
import { Activity, ClipboardList, Sparkles } from "lucide-react";

type Props = {
  compact?: boolean;
};

export function NoWorkoutAssigned({ compact = false }: Props) {
  return (
    <section className="surface relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-100/70 blur-xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-cyan-100/60 blur-xl" />

      <div className="relative flex flex-col items-start gap-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50">
            <ClipboardList className="h-5 w-5 text-emerald-700" />
          </span>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50">
            <Activity className="h-5 w-5 text-cyan-700" />
          </span>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50">
            <Sparkles className="h-5 w-5 text-amber-700" />
          </span>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Your trainer has not assigned a workout yet</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Good things take planning. Your trainer is busy charting your workouts and diet, so your plan is personalized for you.
          </p>
        </div>

        {!compact && (
          <div className="flex flex-wrap gap-2">
            <Link href="/app/profile" className="btn btn-secondary">
              Finish Profile
            </Link>
            <Link href="/app/progress" className="btn btn-muted">
              Check Progress
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

