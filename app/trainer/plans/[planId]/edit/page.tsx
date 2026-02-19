import { SectionTitle } from "@/components/SectionTitle";
import { PlanEditorForm } from "@/components/PlanEditorForm";
import { PlanSentModal } from "@/components/PlanSentModal";
import { requireUser } from "@/lib/auth/guard";
import { repo } from "@/lib/repo/sheets-repo";
import { redirect } from "next/navigation";

export default async function EditPlanPage({
  params,
  searchParams
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  const actor = await requireUser();
  if (actor.role !== "trainer" && actor.role !== "admin") {
    redirect("/app/today");
  }
  const { planId } = await params;
  const query = await searchParams;

  const [plans, days, links, users, exercises] = await Promise.all([
    repo.readPlans(),
    repo.readPlanDays(),
    repo.readPlanDayExercises(),
    repo.readUsers(),
    repo.readExercises()
  ]);
  const plan = plans.find((p) => p.planId === planId);
  if (!plan) return <p>Plan not found.</p>;

  const planDays = days.filter((d) => d.planId === planId);
  const payload = planDays.map((d) => ({
    ...d,
    exercises: links
      .filter((l) => l.planDayId === d.planDayId)
      .map((l) => ({
        ...l,
        exerciseName: exercises.find((e) => e.exerciseId === l.exerciseId)?.name ?? l.exerciseId
      }))
  }));
  const traineeUsers = users.filter((u) => u.role === "user");
  const initialPlanText = buildPlanTextFromPayload(plan.title, plan.overallNotes, payload);

  return (
    <div className="page-shell max-w-4xl">
      <PlanSentModal initialOpen={query.sent === "1"} />
      <SectionTitle title={`Edit ${plan.title}`} />
      <PlanEditorForm
        role={actor.role}
        action="/api/trainer/plans"
        users={traineeUsers.map((u) => ({ userId: u.userId, name: u.name, mobile: u.mobile }))}
        initialPlanId={plan.planId}
        initialUserId={plan.userId}
        initialTitle={plan.title}
        initialWeekStartDate={plan.weekStartDate}
        initialStatus={plan.status}
        initialOverallNotes={plan.overallNotes}
        initialPlanJson={JSON.stringify(payload, null, 2)}
        initialPlanText={initialPlanText}
        submitLabel="Update Plan"
      />
    </div>
  );
}

function buildPlanTextFromPayload(
  title: string,
  overallNotes: string,
  payload: Array<{
    dayNumber: string;
    focus: string;
    notes: string;
    exercises: Array<{
      exerciseName?: string;
      sets: string;
      reps: string;
      notes?: string;
    }>;
  }>
): string {
  const lines: string[] = [title, ""];
  if (overallNotes?.trim()) {
    lines.push("Notes :-");
    for (const noteLine of overallNotes.split("\\n")) {
      const trimmed = noteLine.trim();
      if (trimmed) lines.push(trimmed);
    }
    lines.push("");
  }
  const sortedDays = [...payload].sort((a, b) => Number(a.dayNumber) - Number(b.dayNumber));

  for (const day of sortedDays) {
    lines.push(`Day ${day.dayNumber} - ${day.focus}`);
    for (const [index, ex] of day.exercises.entries()) {
      const order = `${day.dayNumber}.${index + 1}`;
      const name = ex.exerciseName || "Exercise";
      const repPart = ex.reps ? ` - ${ex.sets}x${ex.reps}` : "";
      const notePart = ex.notes ? ` (${ex.notes})` : "";
      lines.push(`${order} ${name}${repPart}${notePart}`);
    }
    if (day.notes) {
      lines.push(`Notes: ${day.notes}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}
