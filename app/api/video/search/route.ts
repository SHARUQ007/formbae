import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { findBestVideoForExercise } from "@/lib/services/video-picker";

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== "trainer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const exerciseId = String(body.exerciseId ?? "");
  const exerciseName = String(body.exerciseName ?? "");

  if (!exerciseId || !exerciseName) {
    return NextResponse.json({ error: "exerciseId and exerciseName required" }, { status: 400 });
  }

  const video = await findBestVideoForExercise(exerciseId, exerciseName);
  if (!video) {
    return NextResponse.json({ ok: false, message: "No API result. Use manual link fallback." });
  }

  return NextResponse.json({ ok: true, video });
}
