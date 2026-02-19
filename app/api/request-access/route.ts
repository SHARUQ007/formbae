import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repo/sheets-repo";
import { uid } from "@/lib/sheets/base";
import { isEnabledFlag } from "@/lib/utils/flags";
import { isValidMobile, normalizeMobile } from "@/lib/utils/mobile";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const mobile = normalizeMobile(String(form.get("mobile") ?? ""));
  const notes = String(form.get("notes") ?? "").trim();
  const trainerId = String(form.get("trainerId") ?? "").trim();

  if (!name || !isValidMobile(mobile)) {
    return NextResponse.json({ error: "name and mobile required" }, { status: 400 });
  }

  const [users, requests] = await Promise.all([repo.readUsers(), repo.readRequests()]);
  if (trainerId) {
    const trainer = users.find((u) => u.userId === trainerId && u.role === "trainer");
    if (!trainer) {
      return NextResponse.json({ error: "invalid trainer selection" }, { status: 400 });
    }
  }

  const existingUser = users.find((u) => normalizeMobile(u.mobile) === mobile);
  if (existingUser && isEnabledFlag(existingUser.allowlistFlag)) {
    return NextResponse.redirect(new URL("/login?requested=exists", request.url));
  }

  const existingPending = requests.find(
    (r) => normalizeMobile(r.mobile) === mobile && r.status.toLowerCase() === "pending"
  );
  if (existingPending) {
    return NextResponse.redirect(new URL("/login?requested=pending", request.url));
  }

  await repo.append("requests", {
    requestId: uid("req"),
    name,
    mobile,
    notes,
    createdAt: new Date().toISOString(),
    status: "pending",
    trainerId
  });

  return NextResponse.redirect(new URL("/login?requested=1", request.url));
}
