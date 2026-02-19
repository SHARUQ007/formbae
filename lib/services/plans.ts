import { repo } from "@/lib/repo/sheets-repo";

export async function getPlanForUser(userId: string) {
  const [plans, days, dayExercises, exercises, videos] = await Promise.all([
    repo.readPlans(),
    repo.readPlanDays(),
    repo.readPlanDayExercises(),
    repo.readExercises(),
    repo.readVideos()
  ]);

  const activePlan = plans
    .filter((p) => p.userId === userId && p.status === "active")
    .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))[0];

  if (!activePlan) return null;

  const planDays = days
    .filter((d) => d.planId === activePlan.planId)
    .sort((a, b) => Number(a.dayNumber) - Number(b.dayNumber))
    .map((day) => {
      const linked = dayExercises
        .filter((de) => de.planDayId === day.planDayId)
        .sort((a, b) => Number(a.order) - Number(b.order))
        .map((de) => {
          const ex = exercises.find((e) => e.exerciseId === de.exerciseId);
          const vid = videos.find((v) => v.videoId === de.videoId) ?? videos.find((v) => v.exerciseId === de.exerciseId);
          return {
            ...de,
            exerciseName: ex?.name ?? "Unknown",
            cuesJson: ex?.defaultCuesJson ?? "",
            videoUrl: de.videoUrl || vid?.url || ""
          };
        });

      return { ...day, exercises: linked };
    });

  return { ...activePlan, days: planDays };
}
