import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { repo } from "@/lib/repo/sheets-repo";
import { uid } from "@/lib/sheets/base";
import { readSheet, overwriteRows } from "@/lib/sheets/base";
import { SHEETS, SHEET_HEADERS } from "@/lib/constants";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const planId = String(form.get("planId") ?? "");
  const planDayId = String(form.get("planDayId") ?? "");
  const exerciseId = String(form.get("exerciseId") ?? "");
  const action = String(form.get("action") ?? "");
  const dayParam = String(form.get("day") ?? "");
  const ajax = String(form.get("ajax") ?? "") === "true";

  if (!planId || !planDayId || !action) {
    return NextResponse.json({ error: "planId, planDayId and action are required" }, { status: 400 });
  }

  const date = todayDate();
  const logs = await repo.readWorkoutLogs();
  const dayLogs = logs.filter(
    (l) => l.userId === session.userId && l.planId === planId && l.planDayId === planDayId && l.date === date
  );

  let completed = false;
  if (action === "exercise") {
    if (!exerciseId) return NextResponse.json({ error: "exerciseId required" }, { status: 400 });
    const marker = `completion:exercise:${exerciseId}`;
    if (!dayLogs.some((l) => l.notes === marker)) {
      await repo.append("workoutLogs", {
        logId: uid("log"),
        userId: session.userId,
        date,
        planId,
        planDayId,
        completedFlag: "false",
        notes: marker
      });
    }
    await syncDayCompletionFromExerciseMarkers(session.userId, planId, planDayId, date);
    completed = true;
  } else if (action === "exerciseUndo") {
    if (!exerciseId) return NextResponse.json({ error: "exerciseId required" }, { status: 400 });
    const marker = `completion:exercise:${exerciseId}`;
    await removeWorkoutMarkers(session.userId, planId, planDayId, marker, date);
    await syncDayCompletionFromExerciseMarkers(session.userId, planId, planDayId, date);
    completed = false;
  } else if (action === "day") {
    const marker = "completion:day";
    if (!dayLogs.some((l) => l.notes === marker)) {
      await repo.append("workoutLogs", {
        logId: uid("log"),
        userId: session.userId,
        date,
        planId,
        planDayId,
        completedFlag: "true",
        notes: marker
      });
    }
    completed = true;
  } else if (action === "dayUndo") {
    const marker = "completion:day";
    await removeWorkoutMarkers(session.userId, planId, planDayId, marker, date);
    completed = false;
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (ajax) {
    return NextResponse.json({ ok: true, completed });
  }

  const redirectUrl = new URL("/app/today", request.url);
  if (dayParam) redirectUrl.searchParams.set("day", dayParam);
  return NextResponse.redirect(redirectUrl);
}

async function removeWorkoutMarkers(
  userId: string,
  planId: string,
  planDayId: string,
  marker: string,
  date: string
) {
  const rows = await readSheet(SHEETS.workoutLogs);
  const headers = rows[0] ?? SHEET_HEADERS[SHEETS.workoutLogs];
  const userIdx = headers.indexOf("userId");
  const planIdx = headers.indexOf("planId");
  const dayIdx = headers.indexOf("planDayId");
  const dateIdx = headers.indexOf("date");
  const notesIdx = headers.indexOf("notes");

  const body = (rows[0] ? rows.slice(1) : []).filter((row) => {
    return !(
      row[userIdx] === userId &&
      row[planIdx] === planId &&
      row[dayIdx] === planDayId &&
      row[dateIdx] === date &&
      row[notesIdx] === marker
    );
  });

  await overwriteRows(SHEETS.workoutLogs, [headers, ...body]);
}

async function syncDayCompletionFromExerciseMarkers(
  userId: string,
  planId: string,
  planDayId: string,
  date: string
) {
  const [planDayExercises, logs] = await Promise.all([repo.readPlanDayExercises(), repo.readWorkoutLogs()]);
  const plannedExerciseIds = new Set(
    planDayExercises.filter((row) => row.planDayId === planDayId).map((row) => row.exerciseId)
  );

  if (!plannedExerciseIds.size) return;

  const dayLogs = logs.filter(
    (l) => l.userId === userId && l.planId === planId && l.planDayId === planDayId && l.date === date
  );
  const completedExerciseIds = new Set(
    dayLogs
      .map((l) => l.notes.match(/^completion:exercise:(.+)$/)?.[1] ?? "")
      .filter((id) => id && plannedExerciseIds.has(id))
  );
  const hasDayMarker = dayLogs.some((l) => l.notes === "completion:day");
  const allExercisesCompleted = completedExerciseIds.size >= plannedExerciseIds.size;

  if (allExercisesCompleted && !hasDayMarker) {
    await repo.append("workoutLogs", {
      logId: uid("log"),
      userId,
      date,
      planId,
      planDayId,
      completedFlag: "true",
      notes: "completion:day"
    });
  }

  if (!allExercisesCompleted && hasDayMarker) {
    await removeWorkoutMarkers(userId, planId, planDayId, "completion:day", date);
  }
}
