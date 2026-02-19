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
  const userId = String(form.get("userId") ?? "").trim();
  const planId = String(form.get("planId") ?? "").trim();
  if (!userId || !planId) {
    return NextResponse.json({ error: "userId and planId are required" }, { status: 400 });
  }

  const rows = await readSheet(SHEETS.plans);
  const headers = rows[0] ?? SHEET_HEADERS[SHEETS.plans];
  const planIdIdx = idx(headers, "planId");
  const userIdIdx = idx(headers, "userId");
  const trainerIdIdx = idx(headers, "trainerId");
  const statusIdx = idx(headers, "status");

  const body = rows[0] ? rows.slice(1) : [];
  const target = body.find((r) => r[planIdIdx] === planId);
  if (!target) {
    return NextResponse.redirect(new URL(`/trainer/users/${userId}?error=PlanNotFound`, request.url));
  }
  if (target[userIdIdx] !== userId) {
    return NextResponse.redirect(new URL(`/trainer/users/${userId}?error=UserPlanMismatch`, request.url));
  }
  if (session.role === "trainer" && target[trainerIdIdx] !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const nextBody = body.map((row) => {
    if (row[userIdIdx] !== userId) return row;
    const next = [...row];
    if (row[planIdIdx] === planId) {
      next[statusIdx] = "active";
      return next;
    }
    if ((row[statusIdx] ?? "").toLowerCase() === "active") {
      next[statusIdx] = "draft";
    }
    return next;
  });

  await overwriteRows(SHEETS.plans, [headers, ...nextBody]);
  return NextResponse.redirect(new URL(`/trainer/users/${userId}?activeUpdated=1`, request.url));
}

