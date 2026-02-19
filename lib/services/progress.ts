import { repo } from "@/lib/repo/sheets-repo";

export async function getUserProgress(userId: string) {
  const [logs, sets, body] = await Promise.all([repo.readWorkoutLogs(), repo.readSetLogs(), repo.readBodyLogs()]);

  const userLogs = logs.filter((l) => l.userId === userId);
  const sessionMap = new Map<string, { completed: boolean }>();
  for (const log of userLogs) {
    const key = `${log.date}::${log.planId}::${log.planDayId}`;
    const prev = sessionMap.get(key) ?? { completed: false };
    const isCompletedRow = log.completedFlag === "true" || log.notes === "completion:day";
    sessionMap.set(key, { completed: prev.completed || isCompletedRow });
  }

  const planned = sessionMap.size;
  const completed = Array.from(sessionMap.values()).filter((s) => s.completed).length;
  const adherencePct = planned ? Math.round((completed / planned) * 100) : 0;
  const completionHistory = Array.from(sessionMap.entries())
    .filter(([, v]) => v.completed)
    .map(([k]) => {
      const [date, planId, planDayId] = k.split("::");
      return { date, planId, planDayId };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const bodyTrend = body
    .filter((b) => b.userId === userId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({
      date: entry.date,
      weight: Number(entry.weight || "0"),
      chest: Number(entry.chest || "0"),
      waist: Number(entry.waist || "0"),
      biceps: Number(entry.biceps || "0")
    }));

  const setByExercise = new Map<string, number>();
  for (const s of sets.filter((s) => userLogs.some((l) => l.logId === s.logId))) {
    const key = s.exerciseId;
    const load = Number(s.weight || "0") * Number(s.reps || "0");
    const prev = setByExercise.get(key) ?? 0;
    if (load > prev) setByExercise.set(key, load);
  }

  const strengthProgression = Array.from(setByExercise.entries()).map(([exerciseId, volume]) => ({ exerciseId, topVolume: volume }));

  return {
    adherencePct,
    completed,
    planned,
    completionHistory,
    bodyTrend,
    strengthProgression
  };
}
