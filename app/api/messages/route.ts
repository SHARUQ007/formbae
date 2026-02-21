import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { repo } from "@/lib/repo/sheets-repo";
import { uid } from "@/lib/sheets/base";

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.redirect(new URL("/login", request.url));

  const form = await request.formData();
  const userId = String(form.get("userId") ?? session.userId);
  const planId = String(form.get("planId") ?? "");
  const text = String(form.get("text") ?? "").trim();

  if (!planId || !text) {
    const fallback = session.role === "trainer" ? `/trainer/users/${userId}` : "/app/today";
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  await repo.append("messages", {
    messageId: uid("msg"),
    userId,
    planId,
    senderRole: session.role,
    text,
    createdAt: new Date().toISOString()
  });

  const redirectTo = session.role === "trainer" ? `/trainer/users/${userId}` : "/app/today";
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
