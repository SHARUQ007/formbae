import { repo } from "@/lib/repo/sheets-repo";

function getStartOfWeekMonday(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() + diffToMonday);
  return copy;
}

function parseTrainingDays(raw: string): number {
  const value = Number((raw || "").trim());
  if (Number.isInteger(value) && value >= 1 && value <= 7) return value;
  return 0;
}

export async function getUserProgress(userId: string) {
  const [logs, sets, body, profiles] = await Promise.all([
    repo.readWorkoutLogs(),
    repo.readSetLogs(),
    repo.readBodyLogs(),
    repo.readProfiles()
  ]);

  const userLogs = logs.filter((l) => l.userId === userId);
  const profile = profiles.find((p) => p.userId === userId);
  const sessionMap = new Map<string, { completed: boolean }>();
  for (const log of userLogs) {
    const key = `${log.date}::${log.planId}::${log.planDayId}`;
    const prev = sessionMap.get(key) ?? { completed: false };
    const isCompletedRow = log.completedFlag === "true" || log.notes === "completion:day";
    sessionMap.set(key, { completed: prev.completed || isCompletedRow });
  }

  const plannedFromProfile = parseTrainingDays(profile?.trainingDays || "");
  const now = new Date();
  const weekStart = getStartOfWeekMonday(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const completedSessionsThisWeek = new Set<string>();
  for (const [key, value] of sessionMap.entries()) {
    if (!value.completed) continue;
    const [date] = key.split("::");
    const parsedDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) continue;
    if (parsedDate >= weekStart && parsedDate <= weekEnd) {
      completedSessionsThisWeek.add(key);
    }
  }

  const completed = completedSessionsThisWeek.size;
  const planned = plannedFromProfile || sessionMap.size;

  const dayOfWeekMondayBased = Math.min(7, Math.max(1, (now.getDay() + 6) % 7 + 1)); // Mon=1 ... Sun=7
  const expectedByToday =
    planned > 0 ? Math.min(planned, Math.max(1, Math.ceil((dayOfWeekMondayBased * planned) / 7))) : 0;
  const adherencePct = expectedByToday ? Math.min(100, Math.round((completed / expectedByToday) * 100)) : 0;

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
