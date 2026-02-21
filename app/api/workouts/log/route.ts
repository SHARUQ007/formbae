import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { repo } from "@/lib/repo/sheets-repo";
import { effortFeedback } from "@/lib/rules/form-bae";
import { uid } from "@/lib/sheets/base";

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== "user") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const form = await request.formData();
  const quick = String(form.get("quick") ?? "") === "true";
  const planId = String(form.get("planId") ?? "");
  const planDayId = String(form.get("planDayId") ?? "");

  if (!planId || !planDayId) {
    return NextResponse.redirect(new URL("/app/today", request.url));
  }

  if (quick) {
    const feel = String(form.get("feel") ?? "ok");
    const logId = uid("log");
    await repo.append("workoutLogs", {
      logId,
      userId: session.userId,
      date: new Date().toISOString().slice(0, 10),
      planId,
      planDayId,
      completedFlag: "true",
      notes: `Quick check: ${feel} | ${effortFeedback(feel)}`
    });

    if (feel === "pain") {
      await repo.append("messages", {
        messageId: uid("msg"),
        userId: session.userId,
        planId,
        senderRole: "user",
        text: "Pain flagged in workout quick check. Please review my movement.",
        createdAt: new Date().toISOString()
      });
    }

    return NextResponse.redirect(new URL("/app/today", request.url));
  }

  const date = String(form.get("date") ?? "");
  const notes = String(form.get("notes") ?? "");
  const exerciseIds = form.getAll("exerciseId").map(String);
  const setNumbers = form.getAll("setNumber").map(String);
  const repsList = form.getAll("reps").map(String);
  const weightList = form.getAll("weight").map(String);
  const rpeList = form.getAll("rpe").map(String);
  const painFlags = form.getAll("painFlag").map(String);

  const setsFromFields: Array<{
    exerciseId: string;
    setNumber: number;
    reps: number;
    weight: number;
    rpe: number;
    painFlag: boolean;
  }> = exerciseIds.map((exerciseId, index) => {
    const reps = Number(repsList[index] || "0");
    const weight = Number(weightList[index] || "0");
    const rpe = Number(rpeList[index] || "0");
    const setNumber = Number(setNumbers[index] || "1");
    const painRaw = (painFlags[index] || "").toLowerCase();
    const painFlag = painRaw === "true" || painRaw === "1" || painRaw === "on";
    return { exerciseId, setNumber, reps, weight, rpe, painFlag };
  });

  let sets = setsFromFields.filter((s) => s.exerciseId && (s.reps > 0 || s.weight > 0 || s.rpe > 0 || s.painFlag));
  if (!sets.length) {
    const setsJson = String(form.get("setsJson") ?? "[]");
    try {
      sets = JSON.parse(setsJson) as Array<{
        exerciseId: string;
        setNumber: number;
        reps: number;
        weight: number;
        rpe: number;
        painFlag: boolean;
      }>;
    } catch {
      sets = [];
    }
  }

  const logId = uid("log");
  await repo.append("workoutLogs", {
    logId,
    userId: session.userId,
    date,
    planId,
    planDayId,
    completedFlag: "true",
    notes
  });

  for (const set of sets) {
    await repo.append("setLogs", {
      logId,
      exerciseId: set.exerciseId,
      setNumber: String(set.setNumber),
      reps: String(set.reps),
      weight: String(set.weight),
      rpe: String(set.rpe),
      painFlag: String(Boolean(set.painFlag))
    });
  }

  return NextResponse.redirect(new URL("/app/progress", request.url));
}
