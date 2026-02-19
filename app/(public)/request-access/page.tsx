import { SectionTitle } from "@/components/SectionTitle";
import { repo } from "@/lib/repo/sheets-repo";

export default async function RequestAccessPage() {
  const trainers = (await repo.readUsers()).filter((u) => u.role === "trainer");

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <SectionTitle title="Request Access" subtitle="Your trainer will approve your mobile number." />
      <form action="/api/request-access" method="post" className="surface space-y-3 p-4">
        <label>Name</label>
        <input name="name" required />
        <label>Mobile</label>
        <input name="mobile" required />
        <label>Select Trainer</label>
        <select name="trainerId" defaultValue="">
          <option value="">No preference</option>
          {trainers.map((t) => (
            <option key={t.userId} value={t.userId}>
              {t.name}
            </option>
          ))}
        </select>
        <label>Notes</label>
        <textarea name="notes" placeholder="Trainer name, goals, etc." />
        <button className="btn btn-primary w-full" type="submit">
          Submit request
        </button>
      </form>
    </div>
  );
}
