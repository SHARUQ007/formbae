import Link from "next/link";
import { Card } from "@/components/Card";
import { SectionTitle } from "@/components/SectionTitle";
import { Stat } from "@/components/Stat";
import { requireUser } from "@/lib/auth/guard";
import { repo } from "@/lib/repo/sheets-repo";
import { syncApprovedRequestsToUsers } from "@/lib/services/request-sync";
import { normalizeMobile } from "@/lib/utils/mobile";

export default async function TrainerDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; assigned?: string; removed?: string; approved?: string; statusUpdated?: string }>;
}) {
  const trainer = await requireUser("trainer");
  const params = await searchParams;
  await syncApprovedRequestsToUsers();

  const [users, plans, logs, requests] = await Promise.all([
    repo.readUsers(),
    repo.readPlans(),
    repo.readWorkoutLogs(),
    repo.readRequests()
  ]);

  const trainees = users.filter((u) => {
    const role = (u.role ?? "").trim().toLowerCase();
    const trainerId = (u.trainerId ?? "").trim();
    return (
      role === "user" &&
      (trainerId === trainer.userId || normalizeMobile(trainerId) === normalizeMobile(trainer.mobile))
    );
  });
  const unassignedUsers = users.filter((u) => {
    const role = (u.role ?? "").trim().toLowerCase();
    if (role !== "user") return false;
    const trainerId = (u.trainerId ?? "").trim().toLowerCase();
    return !trainerId || trainerId === "none" || trainerId === "null" || trainerId === "na" || trainerId === "-";
  });
  const trainerPendingRequests = requests.filter((r) => {
    const status = (r.status ?? "").toLowerCase();
    const requestedTrainerId = (r.trainerId ?? "").trim();
    return (
      status === "pending" &&
      (!requestedTrainerId ||
        requestedTrainerId === trainer.userId ||
        normalizeMobile(requestedTrainerId) === normalizeMobile(trainer.mobile))
    );
  });
  const activePlans = plans.filter((p) => p.trainerId === trainer.userId && p.status === "active").length;
  const completed = logs.filter((l) => trainees.some((t) => t.userId === l.userId) && l.completedFlag === "true").length;
  const pendingRequests = trainerPendingRequests.length;

  return (
    <div className="page-shell">
      <SectionTitle title="Trainer Dashboard" subtitle={`Welcome, ${trainer.name}`} />
      {params.error && (
        <p className="alert-error">
          {params.error === "user_assigned" && "User is already assigned to another trainer."}
          {params.error === "not_owner" && "You can only remove users assigned to you."}
          {params.error === "user_not_found" && "User was not found."}
          {params.error === "request_not_found" && "Request not found."}
          {params.error === "request_processed" && "Request is already processed."}
          {params.error === "request_not_owned" && "That request is assigned to another trainer."}
          {params.error === "request_not_approved" && "Only approved requests can be imported."}
        </p>
      )}
      {params.assigned && <p className="alert-success">User added to your trainee list.</p>}
      {params.removed && <p className="alert-warn">User removed from your trainee list.</p>}
      {params.approved && <p className="alert-success">User enabled and added to your list.</p>}
      {params.statusUpdated && <p className="alert-success">User status updated.</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Trainees" value={trainees.length} />
        <Stat label="Active Plans" value={activePlans} />
        <Stat label="Completed Workouts" value={completed} />
        <Stat label="Pending Requests" value={pendingRequests} />
      </div>

      <Card title="Trainees">
        <div className="mb-3 flex justify-end">
          <Link href="/trainer/users/new" className="btn btn-primary">
            Create User
          </Link>
        </div>
        <ul className="space-y-2">
          {trainees.map((t) => (
            <li key={t.userId} className="flex flex-col gap-3 rounded border border-emerald-100 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">{t.name}</p>
                <p className="text-sm text-zinc-600">{t.mobile} • {t.allowlistFlag}</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Link
                  className="btn btn-primary text-xs"
                  href={`/trainer/users/${t.userId}`}
                >
                  Open
                </Link>
                <Link
                  className="btn btn-secondary text-xs"
                  href={`/trainer/plans/create?userId=${t.userId}`}
                >
                  Create Plan
                </Link>
                <form action="/api/trainer/users" method="post">
                  <input type="hidden" name="mode" value="removeExisting" />
                  <input type="hidden" name="userId" value={t.userId} />
                  <button className="btn btn-secondary text-sm" type="submit">
                    Remove
                  </button>
                </form>
                {t.allowlistFlag === "enabled" ? (
                  <form action="/api/trainer/users" method="post">
                    <input type="hidden" name="mode" value="setStatus" />
                    <input type="hidden" name="userId" value={t.userId} />
                    <button className="btn btn-danger text-sm" type="submit" name="allowlistFlag" value="disabled">
                      Disable
                    </button>
                  </form>
                ) : (
                  <form action="/api/trainer/users" method="post">
                    <input type="hidden" name="mode" value="setStatus" />
                    <input type="hidden" name="userId" value={t.userId} />
                    <button className="btn btn-secondary text-sm" type="submit" name="allowlistFlag" value="enabled">
                      Enable
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
          {!trainees.length && <p className="text-sm text-zinc-500">No trainees yet.</p>}
        </ul>
      </Card>

      <Card title="Pending Access Requests">
        <ul className="space-y-2">
          {trainerPendingRequests.map((r) => (
            <li key={r.requestId} className="flex flex-col gap-3 rounded border border-emerald-100 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">{r.name}</p>
                <p className="text-sm text-zinc-600">{r.mobile}</p>
                <p className="text-xs text-zinc-500">{r.notes}</p>
              </div>
              <form action="/api/trainer/users" method="post">
                <input type="hidden" name="mode" value="approveRequest" />
                <input type="hidden" name="requestId" value={r.requestId} />
                <button className="btn btn-primary" type="submit">
                  Enable User
                </button>
              </form>
            </li>
          ))}
          {!trainerPendingRequests.length && <p className="text-sm text-zinc-500">No pending requests assigned to you.</p>}
        </ul>
      </Card>

      <Card title="Existing Users (Unassigned)">
        <ul className="space-y-2">
          {unassignedUsers.map((u) => (
            <li key={u.userId} className="flex flex-col gap-3 rounded border border-emerald-100 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">{u.name}</p>
                <p className="text-sm text-zinc-600">{u.mobile}</p>
              </div>
              <form action="/api/trainer/users" method="post">
                <input type="hidden" name="mode" value="assignExisting" />
                <input type="hidden" name="userId" value={u.userId} />
                <button className="btn btn-primary" type="submit">
                  Add to My List
                </button>
              </form>
            </li>
          ))}
          {!unassignedUsers.length && <p className="text-sm text-zinc-500">No unassigned users available.</p>}
        </ul>
      </Card>
    </div>
  );
}
