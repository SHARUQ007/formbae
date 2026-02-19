import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { repo } from "@/lib/repo/sheets-repo";
import { uid, readSheet, overwriteRows } from "@/lib/sheets/base";
import { SHEETS, SHEET_HEADERS } from "@/lib/constants";
import { normalizeEnabledFlag } from "@/lib/utils/flags";
import { isValidMobile, normalizeMobile } from "@/lib/utils/mobile";

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const action = String(form.get("action") ?? "create");

  if (action === "delete") {
    const userId = String(form.get("userId") ?? "").trim();
    if (!userId) {
      return NextResponse.redirect(new URL("/admin/dashboard?error=user_not_found", request.url));
    }

    const users = await repo.readUsers();
    const target = users.find((u) => u.userId === userId);
    if (!target) {
      return NextResponse.redirect(new URL("/admin/dashboard?error=user_not_found", request.url));
    }
    if (target.userId === session.userId) {
      return NextResponse.redirect(new URL("/admin/dashboard?error=cannot_delete_self", request.url));
    }

    await deleteUserCascade(target.userId, target.role, target.mobile);
    revalidatePath("/admin/dashboard");
    return NextResponse.redirect(new URL("/admin/dashboard?deleted=1", request.url));
  }

  if (action === "update") {
    const userId = String(form.get("userId") ?? "").trim();
    const name = String(form.get("name") ?? "").trim();
    const mobile = normalizeMobile(String(form.get("mobile") ?? ""));
    const allowlistRaw = String(form.get("allowlistFlag") ?? "").trim();
    const trainerId = String(form.get("trainerId") ?? "");

    if (!userId || !name || !isValidMobile(mobile)) {
      return NextResponse.redirect(new URL("/admin/dashboard?error=invalid_mobile", request.url));
    }

    const users = await repo.readUsers();
    const found = users.find((u) => u.userId === userId);
    if (!found) {
      return NextResponse.redirect(new URL("/admin/dashboard?error=user_not_found", request.url));
    }
    const allowlistFlag = allowlistRaw ? normalizeEnabledFlag(allowlistRaw) : found.allowlistFlag;
    if (found.userId === session.userId && allowlistFlag === "disabled") {
      return NextResponse.redirect(new URL("/admin/dashboard?error=cannot_disable_self", request.url));
    }

    const duplicate = users.find((u) => u.userId !== userId && normalizeMobile(u.mobile) === mobile);
    if (duplicate) {
      return NextResponse.redirect(new URL("/admin/dashboard?error=mobile_exists", request.url));
    }

    await repo.upsertUser({
      ...found,
      name,
      mobile,
      allowlistFlag,
      trainerId: found.role === "user" ? trainerId : ""
    });
    revalidatePath("/admin/dashboard");
    return NextResponse.redirect(new URL("/admin/dashboard?updated=1", request.url));
  }

  if (action === "allowlist" || action === "setStatus") {
    const userId = String(form.get("userId") ?? "");
    const allowlistFlag = normalizeEnabledFlag(String(form.get("allowlistFlag") ?? "disabled"));
    const users = await repo.readUsers();
    const found = users.find((u) => u.userId === userId);
    if (!found) {
      return NextResponse.redirect(new URL("/admin/dashboard?error=user_not_found", request.url));
    }

    if (found.userId === session.userId && allowlistFlag === "disabled") {
      return NextResponse.redirect(new URL("/admin/dashboard?error=cannot_disable_self", request.url));
    }

    await repo.upsertUser({ ...found, allowlistFlag });
    revalidatePath("/admin/dashboard");
    return NextResponse.redirect(new URL("/admin/dashboard?updated=1", request.url));
  }

  const name = String(form.get("name") ?? "").trim();
  const role = String(form.get("role") ?? "user") as "admin" | "trainer" | "user";
  const mobile = normalizeMobile(String(form.get("mobile") ?? ""));
  const allowlistFlag = normalizeEnabledFlag(String(form.get("allowlistFlag") ?? "enabled"));
  const trainerId = String(form.get("trainerId") ?? "");

  if (!name || !isValidMobile(mobile)) {
    return NextResponse.redirect(new URL("/admin/dashboard?error=invalid_mobile", request.url));
  }

  const existing = (await repo.readUsers()).find((u) => normalizeMobile(u.mobile) === mobile);
  if (existing) {
    return NextResponse.redirect(new URL("/admin/dashboard?error=mobile_exists", request.url));
  }

  const userId = uid("usr");
  await repo.append("users", {
    userId,
    role,
    name,
    mobile,
    createdAt: new Date().toISOString(),
    trainerId: role === "user" ? trainerId : "",
    allowlistFlag
  });

  if (role === "user") {
    await repo.upsertProfile({
      userId,
      weight: "",
      height: "",
      age: "",
      chest: "",
      waist: "",
      biceps: "",
      dietPref: "",
      allergies: "",
      lifestyleJson: "{}",
      trainingDays: "",
      photosUrlsJson: "{}",
      updatedAt: new Date().toISOString()
    });
  }

  revalidatePath("/admin/dashboard");
  return NextResponse.redirect(new URL("/admin/dashboard?created=1", request.url));
}

function idx(headers: string[], key: string): number {
  const i = headers.indexOf(key);
  if (i < 0) throw new Error(`Missing header: ${key}`);
  return i;
}

async function deleteUserCascade(userId: string, role: "admin" | "trainer" | "user", targetMobile = "") {
  const usersRows = await readSheet(SHEETS.users);
  const userHeaders = usersRows[0] ?? SHEET_HEADERS[SHEETS.users];
  const userIdIdx = idx(userHeaders, "userId");
  const roleIdx = idx(userHeaders, "role");
  const mobileIdx = idx(userHeaders, "mobile");
  const trainerIdIdx = idx(userHeaders, "trainerId");
  const allUsersBody = usersRows[0] ? usersRows.slice(1) : [];
  const targetMobileNorm = normalizeMobile(targetMobile);
  const normalizedRole = (role ?? "").trim().toLowerCase();
  const normalizedUserId = (userId ?? "").trim();
  const deletedUserIds = new Set<string>([userId, normalizedUserId].filter(Boolean));

  if (normalizedRole === "user" && targetMobileNorm) {
    for (const row of allUsersBody) {
      const rowRole = (row[roleIdx] ?? "").trim().toLowerCase();
      const rowUserId = (row[userIdIdx] ?? "").trim();
      const rowMobile = normalizeMobile(row[mobileIdx] ?? "");
      if (rowRole === "user" && isSameMobileForDelete(rowMobile, targetMobileNorm)) {
        deletedUserIds.add(rowUserId);
      }
    }
  }

  let usersBody = allUsersBody.filter((r) => !deletedUserIds.has((r[userIdIdx] ?? "").trim()));

  if (normalizedRole === "trainer") {
    usersBody = usersBody.map((r) => {
      if (r[trainerIdIdx] === userId) {
        const next = [...r];
        next[trainerIdIdx] = "";
        return next;
      }
      return r;
    });
  }
  await overwriteRows(SHEETS.users, [userHeaders, ...usersBody]);

  if (normalizedRole !== "user") {
    const plansRows = await readSheet(SHEETS.plans);
    const planHeaders = plansRows[0] ?? SHEET_HEADERS[SHEETS.plans];
    const planTrainerIdIdx = idx(planHeaders, "trainerId");
    if (normalizedRole === "trainer") {
      const nextPlans = (plansRows[0] ? plansRows.slice(1) : []).map((r) => {
        if (r[planTrainerIdIdx] === userId) {
          const next = [...r];
          next[planTrainerIdIdx] = "";
          return next;
        }
        return r;
      });
      await overwriteRows(SHEETS.plans, [planHeaders, ...nextPlans]);
    }

    const requestsRows = await readSheet(SHEETS.requests);
    const requestHeaders = requestsRows[0] ?? SHEET_HEADERS[SHEETS.requests];
    const requestTrainerIdIdx = idx(requestHeaders, "trainerId");
    if (normalizedRole === "trainer") {
      const nextRequests = (requestsRows[0] ? requestsRows.slice(1) : []).map((r) => {
        if (r[requestTrainerIdIdx] === userId) {
          const next = [...r];
          next[requestTrainerIdIdx] = "";
          return next;
        }
        return r;
      });
      await overwriteRows(SHEETS.requests, [requestHeaders, ...nextRequests]);
    }

    return;
  }

  const profileRows = await readSheet(SHEETS.profiles);
  const profileHeaders = profileRows[0] ?? SHEET_HEADERS[SHEETS.profiles];
  const profileUserIdIdx = idx(profileHeaders, "userId");
  await overwriteRows(
    SHEETS.profiles,
    [profileHeaders, ...(profileRows[0] ? profileRows.slice(1) : []).filter((r) => !deletedUserIds.has(r[profileUserIdIdx]))]
  );

  const bodyRows = await readSheet(SHEETS.bodyLogs);
  const bodyHeaders = bodyRows[0] ?? SHEET_HEADERS[SHEETS.bodyLogs];
  const bodyUserIdIdx = idx(bodyHeaders, "userId");
  await overwriteRows(
    SHEETS.bodyLogs,
    [bodyHeaders, ...(bodyRows[0] ? bodyRows.slice(1) : []).filter((r) => !deletedUserIds.has(r[bodyUserIdIdx]))]
  );

  const messageRows = await readSheet(SHEETS.messages);
  const messageHeaders = messageRows[0] ?? SHEET_HEADERS[SHEETS.messages];
  const messageUserIdIdx = idx(messageHeaders, "userId");
  await overwriteRows(
    SHEETS.messages,
    [messageHeaders, ...(messageRows[0] ? messageRows.slice(1) : []).filter((r) => !deletedUserIds.has(r[messageUserIdIdx]))]
  );

  const requestRows = await readSheet(SHEETS.requests);
  const requestHeaders = requestRows[0] ?? SHEET_HEADERS[SHEETS.requests];
  const requestMobileIdx = idx(requestHeaders, "mobile");
  const requestStatusIdx = idx(requestHeaders, "status");
  const nextRequests = (requestRows[0] ? requestRows.slice(1) : []).filter(
    (r) => !(
      isSameMobileForDelete(normalizeMobile(r[requestMobileIdx] ?? ""), targetMobileNorm) &&
      (r[requestStatusIdx] ?? "").toLowerCase() === "approved"
    )
  );
  await overwriteRows(SHEETS.requests, [requestHeaders, ...nextRequests]);

  const planRows = await readSheet(SHEETS.plans);
  const planHeaders = planRows[0] ?? SHEET_HEADERS[SHEETS.plans];
  const planUserIdIdx = idx(planHeaders, "userId");
  const planIdIdx = idx(planHeaders, "planId");
  const removedPlanIds = new Set(
    (planRows[0] ? planRows.slice(1) : []).filter((r) => deletedUserIds.has(r[planUserIdIdx])).map((r) => r[planIdIdx])
  );
  const keptPlans = (planRows[0] ? planRows.slice(1) : []).filter((r) => !deletedUserIds.has(r[planUserIdIdx]));
  await overwriteRows(SHEETS.plans, [planHeaders, ...keptPlans]);

  const dayRows = await readSheet(SHEETS.planDays);
  const dayHeaders = dayRows[0] ?? SHEET_HEADERS[SHEETS.planDays];
  const dayPlanIdIdx = idx(dayHeaders, "planId");
  const dayIdIdx = idx(dayHeaders, "planDayId");
  const removedDayIds = new Set(
    (dayRows[0] ? dayRows.slice(1) : []).filter((r) => removedPlanIds.has(r[dayPlanIdIdx])).map((r) => r[dayIdIdx])
  );
  const keptDays = (dayRows[0] ? dayRows.slice(1) : []).filter((r) => !removedPlanIds.has(r[dayPlanIdIdx]));
  await overwriteRows(SHEETS.planDays, [dayHeaders, ...keptDays]);

  const pdeRows = await readSheet(SHEETS.planDayExercises);
  const pdeHeaders = pdeRows[0] ?? SHEET_HEADERS[SHEETS.planDayExercises];
  const pdeDayIdIdx = idx(pdeHeaders, "planDayId");
  await overwriteRows(
    SHEETS.planDayExercises,
    [pdeHeaders, ...(pdeRows[0] ? pdeRows.slice(1) : []).filter((r) => !removedDayIds.has(r[pdeDayIdIdx]))]
  );

  const workoutRows = await readSheet(SHEETS.workoutLogs);
  const workoutHeaders = workoutRows[0] ?? SHEET_HEADERS[SHEETS.workoutLogs];
  const workoutUserIdIdx = idx(workoutHeaders, "userId");
  const workoutLogIdIdx = idx(workoutHeaders, "logId");
  const removedLogIds = new Set(
    (workoutRows[0] ? workoutRows.slice(1) : []).filter((r) => deletedUserIds.has(r[workoutUserIdIdx])).map((r) => r[workoutLogIdIdx])
  );
  await overwriteRows(
    SHEETS.workoutLogs,
    [workoutHeaders, ...(workoutRows[0] ? workoutRows.slice(1) : []).filter((r) => !deletedUserIds.has(r[workoutUserIdIdx]))]
  );

  const setRows = await readSheet(SHEETS.setLogs);
  const setHeaders = setRows[0] ?? SHEET_HEADERS[SHEETS.setLogs];
  const setLogIdIdx = idx(setHeaders, "logId");
  await overwriteRows(
    SHEETS.setLogs,
    [setHeaders, ...(setRows[0] ? setRows.slice(1) : []).filter((r) => !removedLogIds.has(r[setLogIdIdx]))]
  );
}

function isSameMobileForDelete(a: string, b: string): boolean {
  const m1 = normalizeMobile(a);
  const m2 = normalizeMobile(b);
  if (!m1 || !m2) return false;
  if (m1 === m2) return true;
  const t1 = m1.length >= 10 ? m1.slice(-10) : m1;
  const t2 = m2.length >= 10 ? m2.slice(-10) : m2;
  return t1 === t2;
}
