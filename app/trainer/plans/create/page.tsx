import { SectionTitle } from "@/components/SectionTitle";
import { PlanEditorForm } from "@/components/PlanEditorForm";
import { requireUser } from "@/lib/auth/guard";
import { repo } from "@/lib/repo/sheets-repo";
import { redirect } from "next/navigation";

export default async function CreatePlanPage({ searchParams }: { searchParams: Promise<{ userId?: string }> }) {
  const actor = await requireUser();
  if (actor.role !== "trainer" && actor.role !== "admin") {
    redirect("/app/today");
  }
  const params = await searchParams;
  const users = (await repo.readUsers()).filter((u) => u.role === "user");

  return (
    <div className="page-shell max-w-4xl">
      <SectionTitle title="Create Plan" subtitle="Paste plan text and confirm day-wise format." />
      <PlanEditorForm
        role={actor.role}
        action="/api/trainer/plans"
        users={users.map((u) => ({ userId: u.userId, name: u.name, mobile: u.mobile }))}
        initialUserId={params.userId}
        initialStatus="active"
        initialOverallNotes=""
        initialPlanJson="[]"
        submitLabel="Save Plan"
      />
    </div>
  );
}
