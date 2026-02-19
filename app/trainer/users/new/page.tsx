import { SectionTitle } from "@/components/SectionTitle";
import { requireUser } from "@/lib/auth/guard";

export default async function NewUserPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser("trainer");
  const params = await searchParams;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <SectionTitle title="Create Trainee" />
      {params.error === "mobile_exists" && (
        <p className="alert-error">
          That mobile number already exists. Use a unique number.
        </p>
      )}
      <form action="/api/trainer/users" method="post" className="surface grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label>Name</label>
          <input name="name" required />
        </div>
        <div className="md:col-span-2">
          <label>Mobile</label>
          <input name="mobile" required />
        </div>
        <button className="btn btn-primary w-full md:col-span-2" type="submit">
          Create User
        </button>
      </form>
    </div>
  );
}
