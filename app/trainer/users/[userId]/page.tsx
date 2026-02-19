import Link from "next/link";
import { Card } from "@/components/Card";
import { DeletePlanButton } from "@/components/DeletePlanButton";
import { SectionTitle } from "@/components/SectionTitle";
import { requireUser } from "@/lib/auth/guard";
import { repo } from "@/lib/repo/sheets-repo";
import { getUserProgress } from "@/lib/services/progress";

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

  return (
    <div className="page-shell">
      <SectionTitle title={user.name} subtitle={user.mobile} />
      {query.deleted && <p className="alert-success">Plan deleted.</p>}
      {query.activeUpdated && <p className="alert-success">Active plan updated.</p>}
      {query.error && <p className="alert-error">{query.error}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Profile Data">
          <p className="text-sm">Weight: {profile?.weight || "-"} kg</p>
          <p className="text-sm">Height: {profile?.height || "-"} cm</p>
          <p className="text-sm">Age: {profile?.age || "-"}</p>
          <p className="text-sm">Diet: {profile?.dietPref || "-"}</p>
          <p className="text-sm">Training days: {profile?.trainingDays || "-"}/week</p>
        </Card>
        <Card title="Progress Snapshot">
          <p className="text-sm">Adherence: {progress.adherencePct}%</p>
          <p className="text-sm">Completed: {progress.completed}</p>
          <p className="text-sm">Planned: {progress.planned}</p>
          <p className="mt-1 text-sm">
            Current Active Plan: <span className="font-medium">{activePlan?.title ?? "No active plan"}</span>
          </p>
          <Link
            href={`/trainer/plans/create?userId=${user.userId}`}
            className="btn btn-primary mt-3"
          >
            Create New Plan
          </Link>
        </Card>
      </div>

      <Card title="Plans">
        <ul className="space-y-2">
          {userPlans.map((p) => (
            <li key={p.planId} className="flex flex-col gap-2 rounded border border-emerald-100 p-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0 break-words">{p.title}</span>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {p.planId === activePlanId ? (
                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Active
                  </span>
                ) : (
                  <form action="/api/trainer/plans/set-active" method="post">
                    <input type="hidden" name="planId" value={p.planId} />
                    <input type="hidden" name="userId" value={user.userId} />
                    <button
                      type="submit"
                      className="btn btn-muted text-xs"
                    >
                      Set Active
                    </button>
                  </form>
                )}
                <Link
                  href={`/trainer/plans/${p.planId}/edit`}
                  className="btn btn-primary text-xs"
                >
                  Edit Plan
                </Link>
                <DeletePlanButton planId={p.planId} userId={user.userId} planTitle={p.title} />
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
          <button className="btn btn-primary" type="submit">
            Send
          </button>
        </form>
        <div className="space-y-2">
          {thread.map((m) => (
            <div key={m.messageId} className="rounded border border-emerald-100 p-2 text-sm">
              <p className="text-xs text-zinc-500">
                {m.senderRole === "trainer" ? `Trainer: ${trainer.name}` : `User: ${user.name}`} • {new Date(m.createdAt).toLocaleString()}
              </p>
              <p className="break-words">{m.text}</p>
            </div>
          ))}
          {!thread.length && <p className="text-sm text-zinc-500">No messages yet.</p>}
        </div>
      </Card>
    </div>
  );
}
