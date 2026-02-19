import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { repo } from "@/lib/repo/sheets-repo";
import { findBestVideoForExercise } from "@/lib/services/video-picker";
import { uid } from "@/lib/sheets/base";

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== "trainer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const exerciseId = uid("ex");
  const name = String(form.get("name") ?? "").trim();
  const primaryMuscle = String(form.get("primaryMuscle") ?? "").trim();
  const equipment = String(form.get("equipment") ?? "").trim();
  const cuesText = String(form.get("cuesText") ?? "").trim();
  const mistakesText = String(form.get("mistakesText") ?? "").trim();
  const safetyText = String(form.get("safetyText") ?? "").trim();
  const defaultCuesJson = JSON.stringify({
    cues: splitLines(cuesText),
    mistakes: splitLines(mistakesText),
    safety: safetyText || "Stop if sharp pain appears"
  });
  const manualVideoUrl = String(form.get("manualVideoUrl") ?? "").trim();

  if (!name || !primaryMuscle || !equipment) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  await repo.append("exercises", { exerciseId, name, primaryMuscle, equipment, defaultCuesJson });

  let autoVideo = null;
  try {
    autoVideo = await findBestVideoForExercise(exerciseId, name);
  } catch {
    autoVideo = null;
  }

  if (!autoVideo && manualVideoUrl) {
    await repo.append("videos", {
      videoId: uid("vid"),
      exerciseId,
      url: manualVideoUrl,
      title: `${name} (manual)` ,
      channel: "manual",
      thumbnail: "",
      source: "manual",
      fetchedAt: new Date().toISOString(),
      score: "40",
      searchQuery: `${name} form`
    });
  }

  return NextResponse.redirect(new URL("/trainer/exercises", request.url));
}
