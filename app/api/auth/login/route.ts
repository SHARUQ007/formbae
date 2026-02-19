import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repo/sheets-repo";
import { setSession } from "@/lib/auth/session";
import { checkLoginRateLimit } from "@/lib/auth/rate-limit";
import { uid } from "@/lib/sheets/base";
import { isEnabledFlag, normalizeEnabledFlag } from "@/lib/utils/flags";
import { isValidMobile, normalizeMobile } from "@/lib/utils/mobile";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const mobile = normalizeMobile(String(form.get("mobile") ?? ""));

  if (!isValidMobile(mobile)) {
    return NextResponse.redirect(new URL("/login?error=mobile_required", request.url));
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rate = checkLoginRateLimit(`${ip}:${mobile}`);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many attempts", retryAfterSec: rate.retryAfterSec }, { status: 429 });
  }

  const users = await repo.readUsers();
  const matchingUsers = users.filter((u) => normalizeMobile(u.mobile) === mobile && isEnabledFlag(u.allowlistFlag));
  let user =
    matchingUsers.find((u) => u.role === "admin") ||
    matchingUsers.find((u) => u.role === "trainer") ||
    matchingUsers.find((u) => u.role === "user");

  if (!user) {
    const requests = await repo.readRequests();
    const approvedRequest = requests
      .filter((r) => normalizeMobile(r.mobile) === mobile && r.status.toLowerCase() === "approved")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

    if (approvedRequest) {
      const existingByMobile = users.find((u) => normalizeMobile(u.mobile) === mobile);
      if (existingByMobile) {
        await repo.upsertUser({ ...existingByMobile, allowlistFlag: normalizeEnabledFlag("enabled"), mobile });
        user = { ...existingByMobile, allowlistFlag: normalizeEnabledFlag("enabled"), mobile };
      } else {
        const newUserId = uid("usr");
        const createdUser = {
          userId: newUserId,
          role: "user" as const,
          name: approvedRequest.name || "Trainee",
          mobile,
          createdAt: new Date().toISOString(),
          trainerId: approvedRequest.trainerId || "",
          allowlistFlag: normalizeEnabledFlag("enabled")
        };

        await repo.append("users", createdUser);
        await repo.upsertProfile({
          userId: newUserId,
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

        user = createdUser;
      }

      if (user) {
        const profiles = await repo.readProfiles();
        const profile = profiles.find((p) => p.userId === user?.userId);
        if (!profile) {
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
      }
    }
  }

  if (!user) {
    return NextResponse.redirect(new URL("/request-access", request.url));
  }

  await setSession({
    userId: user.userId,
    role: user.role,
    name: user.name,
    mobile: user.mobile,
    trainerId: user.trainerId
  });

  const redirectTo =
    user.role === "admin" ? "/admin/dashboard" : user.role === "trainer" ? "/trainer/dashboard" : "/app/today";
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
