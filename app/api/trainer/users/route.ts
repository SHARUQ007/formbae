import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { repo } from "@/lib/repo/sheets-repo";
import { uid } from "@/lib/sheets/base";
import { normalizeEnabledFlag } from "@/lib/utils/flags";
import { isValidMobile, normalizeMobile } from "@/lib/utils/mobile";

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dashboardPath = session.role === "admin" ? "/admin/dashboard" : "/trainer/dashboard";

  const form = await request.formData();
  const mode = String(form.get("mode") ?? "create");

  if (mode === "assignExisting") {
    if (session.role !== "trainer" && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = String(form.get("userId") ?? "");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const users = await repo.readUsers();
    const target = users.find((u) => u.userId === userId && u.role === "user");
    if (!target) {
      return NextResponse.redirect(new URL(`${dashboardPath}?error=user_not_found`, request.url));
    }

    if (session.role === "trainer" && target.trainerId && target.trainerId !== session.userId) {
      return NextResponse.redirect(new URL(`${dashboardPath}?error=user_assigned`, request.url));
    }

    await repo.upsertUser({
      ...target,
      trainerId: session.role === "trainer" ? session.userId : target.trainerId
    });

    return NextResponse.redirect(new URL(`${dashboardPath}?assigned=1`, request.url));
  }

  if (mode === "removeExisting") {
    if (session.role !== "trainer" && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = String(form.get("userId") ?? "");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const users = await repo.readUsers();
    const target = users.find((u) => u.userId === userId && u.role === "user");
    if (!target) {
      return NextResponse.redirect(new URL(`${dashboardPath}?error=user_not_found`, request.url));
    }

    if (session.role === "trainer" && target.trainerId !== session.userId) {
      return NextResponse.redirect(new URL(`${dashboardPath}?error=not_owner`, request.url));
    }

    await repo.upsertUser({
      ...target,
      trainerId: ""
    });

    return NextResponse.redirect(new URL(`${dashboardPath}?removed=1`, request.url));
  }

  if (mode === "setStatus") {
    if (session.role !== "trainer" && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = String(form.get("userId") ?? "");
    const allowlistFlag = normalizeEnabledFlag(String(form.get("allowlistFlag") ?? "disabled"));
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const users = await repo.readUsers();
    const target = users.find((u) => u.userId === userId);
    if (!target || (target.role ?? "").trim().toLowerCase() !== "user") {
      return NextResponse.redirect(new URL(`${dashboardPath}?error=user_not_found`, request.url));
    }

    if (session.role === "trainer" && (target.trainerId ?? "").trim() !== session.userId) {
      return NextResponse.redirect(new URL(`${dashboardPath}?error=not_owner`, request.url));
    }

    await repo.upsertUser({
      ...target,
      allowlistFlag
    });

    return NextResponse.redirect(new URL(`${dashboardPath}?statusUpdated=1`, request.url));
  }

  if (mode === "profile") {
    const userId = String(form.get("userId") ?? "");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    if (session.role !== "trainer" && session.role !== "admin" && session.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await repo.upsertProfile({
      userId,
      weight: String(form.get("weight") ?? ""),
      height: String(form.get("height") ?? ""),
      age: String(form.get("age") ?? ""),
      chest: String(form.get("chest") ?? ""),
      waist: String(form.get("waist") ?? ""),
      biceps: String(form.get("biceps") ?? ""),
      dietPref: String(form.get("dietPref") ?? ""),
      allergies: String(form.get("allergies") ?? ""),
      lifestyleJson: String(form.get("lifestyleJson") ?? "{}"),
      trainingDays: String(form.get("trainingDays") ?? ""),
      photosUrlsJson: String(form.get("photosUrlsJson") ?? "{}"),
      updatedAt: new Date().toISOString()
    });

    const redirectTo =
      session.role === "trainer"
        ? `/trainer/users/${userId}`
        : session.role === "admin"
          ? "/admin/dashboard"
          : "/app/profile?updated=1";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  if (mode === "approveRequest") {
    if (session.role !== "trainer" && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requestId = String(form.get("requestId") ?? "");
    if (!requestId) return NextResponse.json({ error: "requestId required" }, { status: 400 });

    const [requests, users, profiles] = await Promise.all([repo.readRequests(), repo.readUsers(), repo.readProfiles()]);
    const req = requests.find((r) => r.requestId === requestId);
    if (!req) {
      return NextResponse.redirect(new URL(`${dashboardPath}?error=request_not_found`, request.url));
    }

    if (req.status.toLowerCase() !== "pending") {
      return NextResponse.redirect(new URL(`${dashboardPath}?error=request_processed`, request.url));
    }

    const assignedTrainerId = req.trainerId?.trim() || (session.role === "trainer" ? session.userId : "");
    if (session.role === "trainer" && req.trainerId?.trim() && req.trainerId !== session.userId) {
      return NextResponse.redirect(new URL(`${dashboardPath}?error=request_not_owned`, request.url));
    }

    const reqMobile = normalizeMobile(req.mobile);
    let user = users.find((u) => normalizeMobile(u.mobile) === reqMobile);
    if (user) {
      await repo.upsertUser({
        ...user,
        name: req.name || user.name,
        mobile: reqMobile,
        role: "user",
        trainerId: assignedTrainerId,
        allowlistFlag: normalizeEnabledFlag("enabled")
      });
      user = { ...user, role: "user", trainerId: assignedTrainerId, allowlistFlag: "enabled", mobile: reqMobile };
    } else {
      const userId = uid("usr");
      user = {
        userId,
        role: "user",
        name: req.name || "Trainee",
        mobile: reqMobile,
        createdAt: new Date().toISOString(),
        trainerId: assignedTrainerId,
        allowlistFlag: normalizeEnabledFlag("enabled")
      };
      await repo.append("users", user);
    }

    const profileExists = profiles.some((p) => p.userId === user.userId);
    if (!profileExists) {
      await repo.upsertProfile({
        userId: user.userId,
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

    await repo.upsertRequest({
      ...req,
      status: "approved",
      trainerId: assignedTrainerId
    });

    return NextResponse.redirect(new URL(`${dashboardPath}?approved=1`, request.url));
  }

  if (mode === "importApprovedRequest") {
    if (session.role !== "trainer" && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requestId = String(form.get("requestId") ?? "");
    if (!requestId) return NextResponse.json({ error: "requestId required" }, { status: 400 });

    const [requests, users, profiles] = await Promise.all([repo.readRequests(), repo.readUsers(), repo.readProfiles()]);
    const req = requests.find((r) => r.requestId === requestId);
    if (!req) {
      return NextResponse.redirect(new URL(`${dashboardPath}?error=request_not_found`, request.url));
    }

    if ((req.status ?? "").toLowerCase() !== "approved") {
      return NextResponse.redirect(new URL(`${dashboardPath}?error=request_not_approved`, request.url));
    }

    const reqTrainerId = (req.trainerId ?? "").trim();
    if (session.role === "trainer" && reqTrainerId && reqTrainerId !== session.userId) {
      return NextResponse.redirect(new URL(`${dashboardPath}?error=request_not_owned`, request.url));
    }

    const assignedTrainerId = session.role === "trainer" ? session.userId : reqTrainerId;
    const reqMobile = normalizeMobile(req.mobile);
    let user = users.find((u) => normalizeMobile(u.mobile) === reqMobile);
    if (user) {
      await repo.upsertUser({
        ...user,
        role: "user",
        name: req.name || user.name,
        mobile: reqMobile,
        trainerId: assignedTrainerId || user.trainerId,
        allowlistFlag: normalizeEnabledFlag("enabled")
      });
      user = {
        ...user,
        role: "user",
        name: req.name || user.name,
        mobile: reqMobile,
        trainerId: assignedTrainerId || user.trainerId,
        allowlistFlag: "enabled"
      };
    } else {
      const userId = uid("usr");
      user = {
        userId,
        role: "user",
        name: req.name || "Trainee",
        mobile: reqMobile,
        createdAt: new Date().toISOString(),
        trainerId: assignedTrainerId,
        allowlistFlag: normalizeEnabledFlag("enabled")
      };
      await repo.append("users", user);
    }

    const profileExists = profiles.some((p) => p.userId === user.userId);
    if (!profileExists) {
      await repo.upsertProfile({
        userId: user.userId,
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

    await repo.upsertRequest({
      ...req,
      trainerId: assignedTrainerId || req.trainerId || ""
    });

    return NextResponse.redirect(new URL(`${dashboardPath}?imported=1`, request.url));
  }

  if (session.role !== "trainer" && session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const name = String(form.get("name") ?? "").trim();
  const mobile = normalizeMobile(String(form.get("mobile") ?? ""));
  const allowlistFlag = normalizeEnabledFlag(String(form.get("allowlistFlag") ?? "enabled"));
  if (!name || !isValidMobile(mobile)) return NextResponse.json({ error: "name and mobile required" }, { status: 400 });

  const existing = (await repo.readUsers()).find((u) => normalizeMobile(u.mobile) === mobile);
  if (existing) {
    const redirectTo = session.role === "trainer" ? "/trainer/users/new?error=mobile_exists" : "/admin/dashboard?error=mobile_exists";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  const userId = uid("usr");
  await repo.append("users", {
    userId,
    role: "user",
    name,
    mobile,
    createdAt: new Date().toISOString(),
    trainerId: session.role === "trainer" ? session.userId : "",
    allowlistFlag
  });

  await repo.append("profiles", {
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

  return NextResponse.redirect(new URL(`/trainer/users/${userId}`, request.url));
}
