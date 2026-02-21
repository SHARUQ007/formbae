import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { repo } from "@/lib/repo/sheets-repo";
import { uid } from "@/lib/sheets/base";

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.redirect(new URL("/login", request.url));

  const form = await request.formData();
  const exerciseId = String(form.get("exerciseId") ?? "");
  const videoUrl = String(form.get("videoUrl") ?? "");
  const reason = String(form.get("reason") ?? "bad fit");

  if (!exerciseId || !videoUrl) {
    return NextResponse.redirect(new URL(session.role === "trainer" ? "/trainer/exercises" : "/app/today", request.url));
  }

  if (session.role === "trainer") {
    await repo.append("videos", {
      videoId: uid("vid"),
      exerciseId,
      url: videoUrl,
      title: `trainer replacement (${reason})`,
      channel: "trainer-manual",
      thumbnail: "",
      source: "manual",
      fetchedAt: new Date().toISOString(),
      score: "50",
      searchQuery: reason
    });
  }

  return NextResponse.redirect(new URL(session.role === "trainer" ? "/trainer/exercises" : "/app/today", request.url));
}
