import { SectionTitle } from "@/components/SectionTitle";
import { AdminUserRow } from "@/components/AdminUserRow";
import { requireUser } from "@/lib/auth/guard";
import { repo } from "@/lib/repo/sheets-repo";
import { normalizeMobile } from "@/lib/utils/mobile";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; updated?: string; created?: string; deleted?: string }>;
}) {
  await requireUser("admin");
  const params = await searchParams;

  const [users, requests] = await Promise.all([repo.readUsers(), repo.readRequests()]);
  const trainers = users.filter((u) => u.role === "trainer");

  const dupMap = new Map<string, number>();
  for (const u of users) {
    const m = normalizeMobile(u.mobile);
    dupMap.set(m, (dupMap.get(m) ?? 0) + 1);
  }
  const duplicateMobiles = Array.from(dupMap.entries()).filter(([, c]) => c > 1);

  return (
    <div className="page-shell">
      <SectionTitle title="Admin Dashboard" subtitle="Manage users, trainers, and allowlist." />
      {params.error && (
        <p className="alert-error">
          {params.error === "user_not_found" && "User not found."}
          {params.error === "invalid_mobile" && "Invalid mobile number."}
          {params.error === "mobile_exists" && "Mobile already exists."}
          {params.error === "cannot_disable_self" && "You cannot disable your own admin account."}
          {params.error === "cannot_delete_self" && "You cannot delete your own admin account."}
        </p>
      )}
      {params.created && <p className="alert-success">Account created.</p>}
      {params.updated && <p className="alert-success">User updated.</p>}
      {params.deleted && <p className="alert-success">Account permanently deleted.</p>}

      <section className="surface p-4">
        <h2 className="mb-3 text-base font-semibold">Add Trainer</h2>
        <form action="/api/admin/users" method="post" className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input type="hidden" name="action" value="create" />
          <input type="hidden" name="role" value="trainer" />
          <div>
            <label>Trainer Name</label>
            <input name="name" required />
          </div>
          <div>
            <label>Trainer Mobile</label>
            <input name="mobile" required />
          </div>
          <div>
            <label>Status</label>
            <select name="allowlistFlag" defaultValue="enabled">
              <option value="enabled">enabled</option>
              <option value="disabled">disabled</option>
            </select>
          </div>
          <button className="btn btn-primary w-full md:col-span-3" type="submit">
            Add Trainer
          </button>
        </form>
      </section>

      <section className="surface p-4">
        <h2 className="mb-3 text-base font-semibold">Create Account</h2>
        <form action="/api/admin/users" method="post" className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input type="hidden" name="action" value="create" />
          <div className="md:col-span-2">
            <label>Name</label>
            <input name="name" required />
          </div>
          <div>
            <label>Mobile</label>
            <input name="mobile" required />
          </div>
          <div>
            <label>Role</label>
            <select name="role" defaultValue="trainer">
              <option value="trainer">trainer</option>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div>
            <label>Assign Trainer (for user role)</label>
            <select name="trainerId" defaultValue="">
              <option value="">none</option>
              {trainers.map((t) => (
                <option value={t.userId} key={t.userId}>{t.name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary w-full md:col-span-2" type="submit">Create</button>
        </form>
      </section>

      <section className="surface p-4">
        <h2 className="mb-3 text-base font-semibold">Duplicate Mobile Numbers</h2>
        <ul className="space-y-1 text-sm">
          {duplicateMobiles.map(([mobile, count]) => (
            <li key={mobile}>{mobile} • {count} records</li>
          ))}
          {!duplicateMobiles.length && <li>No duplicates found.</li>}
        </ul>
      </section>

      <section className="surface p-4">
        <h2 className="mb-3 text-base font-semibold">Users</h2>
        <div className="space-y-2">
          {users.map((u) => (
            <AdminUserRow key={u.userId} user={u} trainers={trainers.map((t) => ({ userId: t.userId, name: t.name }))} />
          ))}
        </div>
      </section>

      <section className="surface p-4">
        <h2 className="mb-3 text-base font-semibold">Access Requests</h2>
        <ul className="space-y-2 text-sm">
          {requests.map((r) => (
            <li key={r.requestId} className="rounded border border-emerald-100 p-2">
              {r.name} • {r.mobile} • {r.status}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
