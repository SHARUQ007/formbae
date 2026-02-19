import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { readSheet, overwriteRows } from "@/lib/sheets/base";
import { SHEETS, SHEET_HEADERS } from "@/lib/constants";

function idx(headers: string[], key: string): number {
  const i = headers.indexOf(key);
  if (i < 0) throw new Error(`Missing header: ${key}`);
  return i;
}

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session || (session.role !== "trainer" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const planId = String(form.get("planId") ?? "").trim();
  const userId = String(form.get("userId") ?? "").trim();
  if (!planId || !userId) {
    return NextResponse.json({ error: "planId and userId are required" }, { status: 400 });
  }

  const plansRows = await readSheet(SHEETS.plans);
  const planHeaders = plansRows[0] ?? SHEET_HEADERS[SHEETS.plans];
  const planIdIdx = idx(planHeaders, "planId");
  const trainerIdIdx = idx(planHeaders, "trainerId");
  const userIdIdx = idx(planHeaders, "userId");
  const target = (plansRows[0] ? plansRows.slice(1) : []).find((r) => r[planIdIdx] === planId);

  if (!target) {
    return NextResponse.redirect(new URL(`/trainer/users/${userId}?error=PlanNotFound`, request.url));
  }
  if (target[userIdIdx] !== userId) {
    return NextResponse.redirect(new URL(`/trainer/users/${userId}?error=UserPlanMismatch`, request.url));
  }
  if (session.role === "trainer" && target[trainerIdIdx] !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const planDaysRows = await readSheet(SHEETS.planDays);
  const dayHeaders = planDaysRows[0] ?? SHEET_HEADERS[SHEETS.planDays];
  const dayPlanIdIdx = idx(dayHeaders, "planId");
  const dayIdIdx = idx(dayHeaders, "planDayId");
  const dayIds = new Set(
    (planDaysRows[0] ? planDaysRows.slice(1) : [])
      .filter((r) => r[dayPlanIdIdx] === planId)
      .map((r) => r[dayIdIdx])
  );

  const pdeRows = await readSheet(SHEETS.planDayExercises);
  const pdeHeaders = pdeRows[0] ?? SHEET_HEADERS[SHEETS.planDayExercises];
  const pdeDayIdIdx = idx(pdeHeaders, "planDayId");

  const workoutRows = await readSheet(SHEETS.workoutLogs);
  const workoutHeaders = workoutRows[0] ?? SHEET_HEADERS[SHEETS.workoutLogs];
  const workoutPlanIdIdx = idx(workoutHeaders, "planId");
  const workoutLogIdIdx = idx(workoutHeaders, "logId");
  const deletedLogIds = new Set(
    (workoutRows[0] ? workoutRows.slice(1) : [])
      .filter((r) => r[workoutPlanIdIdx] === planId)
      .map((r) => r[workoutLogIdIdx])
  );

  const setRows = await readSheet(SHEETS.setLogs);
  const setHeaders = setRows[0] ?? SHEET_HEADERS[SHEETS.setLogs];
  const setLogIdIdx = idx(setHeaders, "logId");

  const messageRows = await readSheet(SHEETS.messages);
  const messageHeaders = messageRows[0] ?? SHEET_HEADERS[SHEETS.messages];
  const messagePlanIdIdx = idx(messageHeaders, "planId");

  const plansBody = (plansRows[0] ? plansRows.slice(1) : []).filter((r) => r[planIdIdx] !== planId);
  const daysBody = (planDaysRows[0] ? planDaysRows.slice(1) : []).filter((r) => r[dayPlanIdIdx] !== planId);
  const pdeBody = (pdeRows[0] ? pdeRows.slice(1) : []).filter((r) => !dayIds.has(r[pdeDayIdIdx]));
  const workoutBody = (workoutRows[0] ? workoutRows.slice(1) : []).filter((r) => r[workoutPlanIdIdx] !== planId);
  const setBody = (setRows[0] ? setRows.slice(1) : []).filter((r) => !deletedLogIds.has(r[setLogIdIdx]));
  const messageBody = (messageRows[0] ? messageRows.slice(1) : []).filter((r) => r[messagePlanIdIdx] !== planId);

  await overwriteRows(SHEETS.plans, [planHeaders, ...plansBody]);
  await overwriteRows(SHEETS.planDays, [dayHeaders, ...daysBody]);
  await overwriteRows(SHEETS.planDayExercises, [pdeHeaders, ...pdeBody]);
  await overwriteRows(SHEETS.workoutLogs, [workoutHeaders, ...workoutBody]);
  await overwriteRows(SHEETS.setLogs, [setHeaders, ...setBody]);
  await overwriteRows(SHEETS.messages, [messageHeaders, ...messageBody]);

  return NextResponse.redirect(new URL(`/trainer/users/${userId}?deleted=1`, request.url));
}

