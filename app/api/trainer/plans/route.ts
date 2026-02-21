import { after, NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { repo } from "@/lib/repo/sheets-repo";
import { readSheet, overwriteRows, uid } from "@/lib/sheets/base";
import { SHEETS, SHEET_HEADERS } from "@/lib/constants";
import { parseWorkoutPlanText } from "@/lib/services/plan-text-parser";
import { backfillExerciseVideosInBackground } from "@/lib/services/video-backfill";

type PlanExerciseInput = {
  exerciseId?: string;
  exerciseName?: string;
  order: number;
  sets: number;
  reps: string;
  restSec: number;
  notes?: string;
  videoId?: string;
  videoUrl?: string;
};

type PlanDayInput = {
  dayNumber: number;
  focus: string;
  notes: string;
  planDayId?: string;
  exercises: PlanExerciseInput[];
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function sanitizeReps(value: unknown): string {
  const reps = asString(value, "").trim();
  return reps.toLowerCase() === "as prescribed" ? "" : reps;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function sortPlanDays(days: PlanDayInput[]): PlanDayInput[] {
  return [...days].sort((a, b) => Number(a.dayNumber) - Number(b.dayNumber));
}

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session || (session.role !== "trainer" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const planId = String(form.get("planId") ?? uid("plan"));
  const userId = String(form.get("userId") ?? "");
  let title = String(form.get("title") ?? "").trim();
  const weekStartDate = String(form.get("weekStartDate") ?? "");
  const status = String(form.get("status") ?? "active");
  let overallNotes = String(form.get("overallNotes") ?? "").trim();
  const planJson = String(form.get("planJson") ?? "[]");
  const planText = String(form.get("planText") ?? "").trim();
  const dayWiseJson = String(form.get("dayWiseJson") ?? "").trim();
  const confirmPlan = String(form.get("confirmPlan") ?? "");

  if (!userId || !weekStartDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const isTrainer = session.role === "trainer";
  if (isTrainer) {
    const users = await repo.readUsers();
    const assigned = users.find((u) => u.userId === userId && u.role === "user" && u.trainerId === session.userId);
    if (!assigned) {
      return NextResponse.json({ error: "You can only create plans for your assigned users." }, { status: 403 });
    }
  }

  let parsedDays: PlanDayInput[] = [];
  if (isTrainer) {
    if (confirmPlan !== "true") {
      return NextResponse.json({ error: "Please confirm parsed day-wise plan before assigning" }, { status: 400 });
    }

    if (dayWiseJson) {
      parsedDays = JSON.parse(dayWiseJson) as PlanDayInput[];
      for (const day of parsedDays) {
        day.exercises = (day.exercises ?? []).map((e, index) => ({
          ...e,
          order: Number(e.order ?? index + 1),
          sets: Number(e.sets ?? 0),
          restSec: Number(e.restSec ?? 60),
          reps: sanitizeReps(e.reps)
        }));
      }
    } else if (planText) {
      const parsedText = parseWorkoutPlanText(planText);
      if (!title) title = parsedText.title;
      if (!overallNotes && parsedText.globalNotes.length) {
        overallNotes = parsedText.globalNotes.join("\n");
      }
      parsedDays = parsedText.days.map((d) => ({
        dayNumber: d.dayNumber,
        focus: d.focus,
        notes: d.notes,
        exercises: d.exercises.map((e, index) => ({
          exerciseName: e.exerciseName,
          order: index + 1,
          sets: e.sets,
          reps: e.reps,
          restSec: e.restSec,
          notes: e.notes
        }))
      }));
    } else {
      return NextResponse.json({ error: "Trainer must provide plan text or day-wise plan" }, { status: 400 });
    }
  } else if (planText) {
    const parsedText = parseWorkoutPlanText(planText);
    if (!title) title = parsedText.title;
    if (!overallNotes && parsedText.globalNotes.length) {
      overallNotes = parsedText.globalNotes.join("\n");
    }
    parsedDays = parsedText.days.map((d) => ({
      dayNumber: d.dayNumber,
      focus: d.focus,
      notes: d.notes,
      exercises: d.exercises.map((e, index) => ({
        exerciseName: e.exerciseName,
        order: index + 1,
        sets: e.sets,
        reps: e.reps,
        restSec: e.restSec,
        notes: e.notes
      }))
    }));
  } else if (planJson.trim()) {
    parsedDays = JSON.parse(planJson) as PlanDayInput[];
  }

  if (!title || !parsedDays.length) {
    return NextResponse.json({ error: "Provide title and at least one day" }, { status: 400 });
  }

  const resolvedDays = await resolveExerciseReferences(sortPlanDays(parsedDays));

  await repo.upsertPlan({
    planId,
    userId,
    trainerId: session.userId,
    title,
    weekStartDate,
    status,
    overallNotes,
    createdAt: new Date().toISOString()
  });
  if (status === "active") {
    await ensureSingleActivePlanForUser(userId, planId);
  }

  await replacePlanRows(planId, resolvedDays);

  const backgroundExercises = resolvedDays.flatMap((day) =>
    (day.exercises ?? []).map((ex) => ({
      exerciseId: asString(ex.exerciseId),
      exerciseName: asString(ex.exerciseName)
    }))
  );
  after(async () => {
    try {
      await backfillExerciseVideosInBackground(backgroundExercises, {
        youtubeDelayMs: 450,
        sheetsBatchSize: 10,
        sheetsDelayMs: 500
      });
    } catch {
      // Best-effort async enrichment.
    }
  });

  const redirectUrl = new URL(`/trainer/plans/${planId}/edit`, request.url);
  if (confirmPlan === "true") {
    redirectUrl.searchParams.set("sent", "1");
  }
  return NextResponse.redirect(redirectUrl);
}

async function ensureSingleActivePlanForUser(userId: string, activePlanId: string) {
  const rows = await readSheet(SHEETS.plans);
  const headers = rows[0] ?? SHEET_HEADERS[SHEETS.plans];
  const planIdIdx = headers.indexOf("planId");
  const userIdIdx = headers.indexOf("userId");
  const statusIdx = headers.indexOf("status");
  const body = rows[0] ? rows.slice(1) : [];

  const nextBody = body.map((row) => {
    if (row[userIdIdx] !== userId) return row;
    const next = [...row];
    if (row[planIdIdx] === activePlanId) {
      next[statusIdx] = "active";
    } else if ((row[statusIdx] ?? "").toLowerCase() === "active") {
      next[statusIdx] = "draft";
    }
    return next;
  });

  await overwriteRows(SHEETS.plans, [headers, ...nextBody]);
}

async function resolveExerciseReferences(days: PlanDayInput[]): Promise<PlanDayInput[]> {
  const [allExercises, allVideos] = await Promise.all([repo.readExercises(), repo.readVideos()]);

  const exercises = [...allExercises];
  const videos = [...allVideos];
  const existingExerciseIds = new Set(exercises.map((e) => e.exerciseId));
  const pendingNewExercises: Array<{
    exerciseId: string;
    name: string;
    primaryMuscle: string;
    equipment: string;
    defaultCuesJson: string;
  }> = [];
  const pendingExerciseIds = new Set<string>();
  const pendingByName = new Map<string, string>();

  function queueExercise(exerciseId: string, name: string) {
    const id = exerciseId.trim();
    if (!id || existingExerciseIds.has(id) || pendingExerciseIds.has(id)) return;
    const resolvedName = name.trim() || "Unspecified Exercise";
    const row = {
      exerciseId: id,
      name: resolvedName,
      primaryMuscle: "General",
      equipment: "Mixed",
      defaultCuesJson: "{}"
    };
    pendingNewExercises.push(row);
    exercises.push(row);
    existingExerciseIds.add(id);
    pendingExerciseIds.add(id);
  }

  async function ensureExercise(exerciseName?: string, exerciseId?: string): Promise<{ exerciseId: string; videoId?: string; videoUrl?: string }> {
    if (exerciseId) {
      const id = exerciseId.trim();
      if (id && !existingExerciseIds.has(id)) {
        queueExercise(id, (exerciseName ?? "").trim() || "Unspecified Exercise");
      }
      const matchedVideo = videos.find((v) => v.exerciseId === id);
      return { exerciseId: id, videoId: matchedVideo?.videoId, videoUrl: matchedVideo?.url };
    }

    const name = (exerciseName ?? "").trim();
    if (!name) {
      const fallbackId = uid("ex");
      queueExercise(fallbackId, "Unspecified Exercise");
      return { exerciseId: fallbackId };
    }

    const existing = exercises.find((e) => normalizeName(e.name) === normalizeName(name));
    if (existing) {
      const matchedVideo = videos.find((v) => v.exerciseId === existing.exerciseId);
      return { exerciseId: existing.exerciseId, videoId: matchedVideo?.videoId, videoUrl: matchedVideo?.url };
    }

    const key = normalizeName(name);
    const queuedId = pendingByName.get(key);
    if (queuedId) {
      return { exerciseId: queuedId };
    }

    const newExerciseId = uid("ex");
    pendingByName.set(key, newExerciseId);
    queueExercise(newExerciseId, name);

    return { exerciseId: newExerciseId };
  }

  const resolved: PlanDayInput[] = [];
  for (const day of days) {
    const exercisesResolved: PlanExerciseInput[] = [];
    for (const ex of day.exercises ?? []) {
      const refs = await ensureExercise(ex.exerciseName, ex.exerciseId);
      exercisesResolved.push({
        ...ex,
        exerciseId: refs.exerciseId,
        videoId: ex.videoId || refs.videoId,
        videoUrl: ex.videoUrl || refs.videoUrl
      });
    }

    resolved.push({
      ...day,
      exercises: exercisesResolved
    });
  }

  if (pendingNewExercises.length) {
    await repo.appendMany("exercises", pendingNewExercises);
  }

  return resolved;
}

async function replacePlanRows(planId: string, payload: PlanDayInput[]) {
  const dayRows = await readSheet(SHEETS.planDays);
  const dayHeaders = SHEET_HEADERS[SHEETS.planDays];
  const dayBody = (dayRows[0] ? dayRows.slice(1) : []).filter((row) => row[1] !== planId);

  const pdeRows = await readSheet(SHEETS.planDayExercises);
  const pdeHeaders = SHEET_HEADERS[SHEETS.planDayExercises];

  const existingDayIds = new Set((dayRows[0] ? dayRows.slice(1) : []).filter((row) => row[1] === planId).map((row) => row[0]));
  const pdeBody = (pdeRows[0] ? pdeRows.slice(1) : []).filter((row) => !existingDayIds.has(row[0]));

  const newDayRows: string[][] = [];
  const newExerciseRows: string[][] = [];

  for (const day of payload) {
    const planDayId = day.planDayId || uid("pday");
    newDayRows.push([planDayId, planId, String(day.dayNumber), asString(day.focus), asString(day.notes)]);

    for (const ex of day.exercises ?? []) {
      newExerciseRows.push([
        planDayId,
        asString(ex.exerciseId),
        String(ex.order ?? 1),
        String(ex.sets ?? 3),
        sanitizeReps(ex.reps),
        String(ex.restSec ?? 60),
        asString(ex.notes),
        asString(ex.videoId),
        asString(ex.videoUrl)
      ]);
    }
  }

  await overwriteRows(SHEETS.planDays, [dayRows[0] ?? dayHeaders, ...dayBody, ...newDayRows]);
  await overwriteRows(SHEETS.planDayExercises, [pdeRows[0] ?? pdeHeaders, ...pdeBody, ...newExerciseRows]);
}
