import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { repo } from "@/lib/repo/sheets-repo";
import { uid } from "@/lib/sheets/base";

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== "user") return NextResponse.redirect(new URL("/login", request.url));

  const form = await request.formData();
  await repo.append("bodyLogs", {
    entryId: uid("body"),
    userId: session.userId,
    date: String(form.get("date") ?? new Date().toISOString().slice(0, 10)),
    weight: String(form.get("weight") ?? ""),
    chest: String(form.get("chest") ?? ""),
    waist: String(form.get("waist") ?? ""),
    biceps: String(form.get("biceps") ?? "")
  });

  return NextResponse.redirect(new URL("/app/progress", request.url));
}
