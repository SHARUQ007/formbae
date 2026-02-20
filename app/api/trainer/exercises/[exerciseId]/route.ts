import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { repo } from "@/lib/repo/sheets-repo";
import { uid } from "@/lib/sheets/base";

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ exerciseId: string }> }) {
  const session = await getSessionUser();
  if (!session || session.role !== "trainer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { exerciseId: exerciseIdParam } = await params;
  const exerciseId = String(exerciseIdParam ?? "").trim();
  if (!exerciseId) {
    return NextResponse.json({ error: "exerciseId required" }, { status: 400 });
  }

  const [existingExercises, existingVideos] = await Promise.all([repo.readExercises(), repo.readVideos()]);
  const existing = existingExercises.find((e) => e.exerciseId === exerciseId);
  if (!existing) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const primaryMuscle = String(form.get("primaryMuscle") ?? "").trim();
  const equipment = String(form.get("equipment") ?? "").trim();
  const cuesText = String(form.get("cuesText") ?? "").trim();
  const mistakesText = String(form.get("mistakesText") ?? "").trim();
  const safetyText = String(form.get("safetyText") ?? "").trim();
  const manualVideoUrl = String(form.get("manualVideoUrl") ?? "").trim();

  if (!name || !primaryMuscle || !equipment) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const defaultCuesJson = JSON.stringify({
    cues: splitLines(cuesText),
    mistakes: splitLines(mistakesText),
    safety: safetyText || "Stop if sharp pain appears"
  });

  await repo.upsertExercise({
    exerciseId,
    name,
    primaryMuscle,
    equipment,
    defaultCuesJson
  });

  if (manualVideoUrl) {
    const existingVideo = existingVideos.find((v) => v.exerciseId === exerciseId);
    await repo.upsertVideo({
      videoId: existingVideo?.videoId || uid("vid"),
      exerciseId,
      url: manualVideoUrl,
      title: `${name} (manual)`,
      channel: "manual",
      thumbnail: existingVideo?.thumbnail ?? "",
      source: "manual",
      fetchedAt: new Date().toISOString(),
      score: existingVideo?.score || "40",
      searchQuery: `${name} form`
    });
  }

  return NextResponse.redirect(new URL("/trainer/exercises", request.url));
}
