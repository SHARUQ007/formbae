import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { repo } from "@/lib/repo/sheets-repo";
import { SHEET_HEADERS, SHEETS } from "@/lib/constants";
import { overwriteRows, readSheet } from "@/lib/sheets/base";
import { findAlternativeVideoForExercise } from "@/lib/services/video-picker";

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const planDayId = String(body.planDayId ?? "").trim();
  const exerciseId = String(body.exerciseId ?? "").trim();
  const exerciseName = String(body.exerciseName ?? "").trim();
  const previousVideoUrl = String(body.previousVideoUrl ?? "").trim();

  if (!planDayId || !exerciseId || !exerciseName) {
    return NextResponse.json({ error: "planDayId, exerciseId, exerciseName required" }, { status: 400 });
  }

  const existingVideos = await repo.readVideos();
  const excludedUrls = [
    previousVideoUrl,
    ...existingVideos.filter((v) => v.exerciseId === exerciseId).map((v) => v.url)
  ].filter(Boolean);

  const candidate = await findAlternativeVideoForExercise(exerciseId, exerciseName, excludedUrls);
  if (!candidate) {
    return NextResponse.json({ ok: false, message: "No alternate video found." }, { status: 404 });
  }

  const rows = await readSheet(SHEETS.planDayExercises);
  const headers = rows[0] ?? SHEET_HEADERS[SHEETS.planDayExercises];
  const planDayIdx = headers.indexOf("planDayId");
  const exerciseIdx = headers.indexOf("exerciseId");
  const videoIdIdx = headers.indexOf("videoId");
  const videoUrlIdx = headers.indexOf("videoUrl");
  const bodyRows = rows[0] ? rows.slice(1) : [];

  let updated = false;
  const nextBody = bodyRows.map((row) => {
    const normalized = [...row];
    while (normalized.length < headers.length) normalized.push("");
    if (normalized[planDayIdx] === planDayId && normalized[exerciseIdx] === exerciseId) {
      normalized[videoIdIdx] = candidate.videoId;
      normalized[videoUrlIdx] = candidate.url;
      updated = true;
    }
    return normalized;
  });

  if (updated) {
    await overwriteRows(SHEETS.planDayExercises, [headers, ...nextBody]);
  }

  return NextResponse.json({ ok: true, video: candidate, updated });
}
