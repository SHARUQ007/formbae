import Link from "next/link";
import { Card } from "@/components/Card";
import { DeletePlanButton } from "@/components/DeletePlanButton";
import { SectionTitle } from "@/components/SectionTitle";
import { requireUser } from "@/lib/auth/guard";
import { repo } from "@/lib/repo/sheets-repo";
import { getUserProgress } from "@/lib/services/progress";
import { CalendarDays, ChartNoAxesCombined, ClipboardList, Eye, Languages, Phone, PlusCircle, Weight } from "lucide-react";

function formatLanguages(raw: string | undefined): string {
  if (!raw) return "-";
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      const cleaned = parsed.map((entry) => String(entry).trim()).filter(Boolean);
      return cleaned.length ? cleaned.join(", ") : "-";
    }
  } catch {
    const cleaned = raw
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    return cleaned.length ? cleaned.join(", ") : "-";
  }
  return "-";
}

export default async function TrainerUserPage({
  params,
  searchParams
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ deleted?: string; error?: string; activeUpdated?: string }>;
}) {
  const trainer = await requireUser("trainer");
  const { userId } = await params;
  const query = await searchParams;

  const [users, profiles, plans, messages, progress] = await Promise.all([
    repo.readUsers(),
    repo.readProfiles(),
    repo.readPlans(),
    repo.readMessages(),
    getUserProgress(userId)
  ]);

  const user = users.find((u) => u.userId === userId && u.trainerId === trainer.userId);
  if (!user) {
    return <p>User not found.</p>;
  }

  const profile = profiles.find((p) => p.userId === userId);
  const userPlans = plans.filter((p) => p.userId === userId);
  const activePlan = userPlans
    .filter((p) => p.status === "active")
    .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))[0];
  const activePlanId = activePlan?.planId ?? "";
  const thread = messages.filter((m) => m.userId === userId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const pending = Math.max(0, progress.planned - progress.completed);

  return (
    <div className="page-shell px-3 pb-4 sm:px-0">
      <SectionTitle title={user.name} subtitle={user.mobile} />
      {query.deleted && <p className="alert-success">Plan deleted.</p>}
      {query.activeUpdated && <p className="alert-success">Active plan updated.</p>}
      {query.error && <p className="alert-error">{query.error}</p>}
      <section className="surface overflow-hidden p-0">
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 px-4 py-4 text-white sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-100">Trainee Profile</p>
              <h2 className="mt-1 text-2xl font-semibold leading-tight">{user.name}</h2>
              <p className="mt-1 flex items-center gap-1 text-sm text-emerald-100">
                <Phone className="h-3.5 w-3.5" />
                {user.mobile}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
              <ChartNoAxesCombined className="h-3.5 w-3.5" />
              {progress.adherencePct}% adherence
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 px-3 py-3 sm:grid-cols-4 sm:gap-3 sm:px-4 sm:py-4">
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
            <p className="text-xl font-semibold text-zinc-900">{pending}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white p-3">
            <p className="text-xs text-zinc-500">Active Plan</p>
            <p className="truncate text-sm font-semibold text-zinc-900">{activePlan?.title ?? "None"}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-12 md:items-start">
        <div className="md:col-span-7">
          <Card title="Profile Snapshot">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2.5">
              <p className="flex items-center gap-1 text-xs text-zinc-500">
                <Weight className="h-3.5 w-3.5 text-emerald-700" />
                Weight
              </p>
              <p className="mt-1 text-base font-semibold text-zinc-900">{profile?.weight || "-"} kg</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2.5">
              <p className="text-xs text-zinc-500">Height</p>
              <p className="mt-1 text-base font-semibold text-zinc-900">{profile?.height || "-"} cm</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2.5">
              <p className="text-xs text-zinc-500">Age / Gender</p>
              <p className="mt-1 text-base font-semibold text-zinc-900">{profile?.age || "-"} / {profile?.gender || "-"}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2.5">
              <p className="text-xs text-zinc-500">Diet</p>
              <p className="mt-1 text-base font-semibold text-zinc-900">{profile?.dietPref || "-"}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2.5 sm:col-span-2">
              <p className="flex items-center gap-1 text-xs text-zinc-500">
                <Languages className="h-3.5 w-3.5 text-emerald-700" />
                Languages
              </p>
              <p className="mt-1 text-base font-semibold text-zinc-900 break-words">{formatLanguages(profile?.languagePreferencesJson)}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2.5 sm:col-span-2">
              <p className="flex items-center gap-1 text-xs text-zinc-500">
                <CalendarDays className="h-3.5 w-3.5 text-emerald-700" />
                Training Days
              </p>
              <p className="mt-1 text-base font-semibold text-zinc-900">{profile?.trainingDays || "-"} / week</p>
            </div>
          </div>
          </Card>
        </div>

        <div className="self-start md:col-span-5">
          <Card title="Coach Actions">
            <div className="rounded-xl border border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30 p-3">
              <p className="flex items-center gap-1 text-sm font-semibold text-zinc-800">
                <ClipboardList className="h-4 w-4 text-emerald-700" />
                Current Active Plan
              </p>
              <p className="mt-1 text-lg font-semibold leading-tight text-zinc-900">{activePlan?.title ?? "No active plan"}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {activePlan ? "Preview trainee screen or update the plan." : "Create and assign a plan to unlock preview."}
              </p>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-emerald-100 bg-white p-2.5">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Total Plans</p>
                <p className="mt-1 text-xl font-semibold text-zinc-900">{userPlans.length}</p>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-white p-2.5">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Messages</p>
                <p className="mt-1 text-xl font-semibold text-zinc-900">{thread.length}</p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Link
                href={`/trainer/plans/create?userId=${user.userId}`}
                className="group rounded-xl border border-emerald-700 bg-emerald-700 px-3 py-2.5 text-white transition hover:bg-emerald-800"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <PlusCircle className="h-4 w-4" />
                  Create New Plan
                </span>
                <span className="mt-1 block text-xs text-emerald-100">Build and assign the next weekly split.</span>
              </Link>
              <Link
                href={`/trainer/users/${user.userId}/preview`}
                className={`group rounded-xl border px-3 py-2.5 transition ${
                  activePlan
                    ? "border-emerald-200 bg-white hover:bg-emerald-50"
                    : "pointer-events-none border-zinc-200 bg-zinc-100 opacity-70"
                }`}
                aria-disabled={!activePlan}
              >
                <span className={`flex items-center gap-2 text-sm font-semibold ${activePlan ? "text-zinc-800" : "text-zinc-500"}`}>
                  <Eye className="h-4 w-4" />
                  Preview User POV
                </span>
                <span className={`mt-1 block text-xs ${activePlan ? "text-zinc-500" : "text-zinc-400"}`}>
                  {activePlan ? "See exactly what the trainee sees." : "Enable after setting an active plan."}
                </span>
              </Link>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Tip: set a plan active to let the trainee see it on their Today screen.
            </p>
          </Card>
        </div>
      </div>

      <Card title="Plans">
        <ul className="space-y-2.5">
          {userPlans.map((p) => (
            <li
              key={p.planId}
              className={`rounded-xl p-3 ${
                p.planId === activePlanId
                  ? "border-2 border-emerald-500 bg-emerald-50/60 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                  : "border border-emerald-100 bg-white"
              }`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 break-words text-sm font-semibold text-zinc-900">{p.title}</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  {p.planId === activePlanId && (
                    <span className="inline-flex rounded-full border border-emerald-600 bg-emerald-600 px-2.5 py-1 text-xs font-semibold tracking-wide text-white">
                      ACTIVE PLAN
                    </span>
                  )}
                  <Link href={`/trainer/plans/${p.planId}/edit`} className="btn btn-primary w-full text-xs sm:w-auto">
                    Edit Plan
                  </Link>
                  {p.planId === activePlanId ? (
                    <Link href={`/trainer/users/${user.userId}/preview`} className="btn btn-secondary w-full text-xs sm:w-auto">
                      Preview POV
                    </Link>
                  ) : (
                    <form action="/api/trainer/plans/set-active" method="post" className="w-full sm:w-auto">
                      <input type="hidden" name="planId" value={p.planId} />
                      <input type="hidden" name="userId" value={user.userId} />
                      <button type="submit" className="btn btn-muted w-full text-xs sm:w-auto">
                        Set Active
                      </button>
                    </form>
                  )}
                  <DeletePlanButton planId={p.planId} userId={user.userId} planTitle={p.title} />
                </div>
              </div>
            </li>
          ))}
          {!userPlans.length && <p className="text-sm text-zinc-500">No plans yet.</p>}
        </ul>
      </Card>

      <Card title="Messages">
        <form action="/api/messages" method="post" className="mb-3 flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="userId" value={user.userId} />
          <input type="hidden" name="planId" value={userPlans[0]?.planId ?? ""} />
          <input name="text" placeholder="Send coaching feedback" autoComplete="off" autoCorrect="off" spellCheck={false} required />
          <button className="btn btn-primary w-full sm:w-auto" type="submit">
            Send
          </button>
        </form>
        <div className="space-y-2">
          {thread.map((m) => (
            <div key={m.messageId} className="rounded-lg border border-emerald-100 bg-white p-2.5 text-sm">
              <p className="text-xs font-medium text-zinc-500">
                {m.senderRole === "trainer" ? `Trainer: ${trainer.name}` : `User: ${user.name}`} • {new Date(m.createdAt).toLocaleString()}
              </p>
              <p className="mt-1 break-words text-zinc-800">{m.text}</p>
            </div>
          ))}
          {!thread.length && (
            <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50/40 p-3 text-sm text-zinc-500">
              No messages yet.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
