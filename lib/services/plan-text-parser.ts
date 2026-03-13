export type ParsedWorkoutText = {
  title: string;
  globalNotes: string[];
  days: Array<{
    dayNumber: number;
    focus: string;
    notes: string;
    exercises: Array<{
      exerciseName: string;
      sets: number;
      reps: string;
      restSec: number;
      notes: string;
    }>;
  }>;
};

export function parseWorkoutPlanText(input: string): ParsedWorkoutText {
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let title = "Workout Plan";
  let titleSet = false;
  let defaultSets = 1;
  const globalNotes: string[] = [];
  const days: ParsedWorkoutText["days"] = [];
  let currentDay: ParsedWorkoutText["days"][number] | null = null;
  let inGlobalNotesSection = false;

  for (const line of lines) {
    const setsInLine = readDefaultSets(line);
    if (setsInLine) {
      defaultSets = setsInLine;
    }

    const dayMatch = line.match(/^day\s*(\d+)\s*[-:]\s*(.+)$/i);
    if (dayMatch) {
      inGlobalNotesSection = false;
      currentDay = {
        dayNumber: Number(dayMatch[1]),
        focus: dayMatch[2].trim(),
        notes: "",
        exercises: []
      };
      days.push(currentDay);
      continue;
    }

    const weekdayMatch = matchWeekdayHeading(line);
    if (weekdayMatch) {
      inGlobalNotesSection = false;
      currentDay = {
        dayNumber: weekdayToDayNumber(weekdayMatch.weekday),
        focus: weekdayMatch.focus,
        notes: weekdayMatch.notes,
        exercises: []
      };
      days.push(currentDay);
      continue;
    }

    if (inGlobalNotesSection) {
      if (/^notes?\s*[:-]/i.test(line)) {
        const cleaned = cleanNoteLine(line);
        if (cleaned) globalNotes.push(cleaned);
      } else {
        globalNotes.push(line);
      }
      continue;
    }

    if (!currentDay) {
      if (/^note\s*[:-]/i.test(line)) {
        const cleaned = cleanNoteLine(line);
        if (cleaned) globalNotes.push(cleaned);
        inGlobalNotesSection = true;
      } else if (!/^notes?\s*[:-]/i.test(line) && !titleSet) {
        title = line;
        titleSet = true;
      } else if (!/^notes?\s*[:-]/i.test(line)) {
        globalNotes.push(line);
      }
      continue;
    }

    if (/^notes?\s*[:-]/i.test(line)) {
      const cleaned = cleanNoteLine(line);
      if (cleaned) globalNotes.push(cleaned);
      currentDay = null;
      inGlobalNotesSection = true;
      continue;
    }

    const parsedExercise = parseExerciseLine(line, defaultSets);
    if (parsedExercise) {
      currentDay.exercises.push(parsedExercise);
    } else if (currentDay) {
      const nextNote = currentDay.notes ? `${currentDay.notes}\n${line}` : line;
      currentDay.notes = nextNote;
    }
  }

  return { title, globalNotes, days };
}

function cleanNoteLine(line: string): string {
  return line.replace(/^notes?\s*[:-]\s*/i, "").trim();
}

function parseExerciseLine(raw: string, defaultSets: number): ParsedWorkoutText["days"][number]["exercises"][number] | null {
  const line = raw
    .replace(/^[-*•●]\s*/, "")
    .replace(/^\d+(?:\.\d+)?\s*[.)-]?\s*/, "")
    .trim();

  if (!line) return null;

  const setRepMatch = line.match(/(\d+)\s*x\s*(\d+)/i);
  if (setRepMatch) {
    const a = Number(setRepMatch[1]);
    const b = Number(setRepMatch[2]);
    const { sets, reps } = inferSetsReps(a, b);
    const name = line.slice(0, setRepMatch.index).replace(/[-:–]+\s*$/, "").trim();
    const exerciseName = name || line;
    return {
      exerciseName,
      sets,
      reps,
      restSec: 90,
      notes: ""
    };
  }

  const minsMatch = line.match(/(\d+)\s*mins?/i);
  if (minsMatch) {
    const minutes = Number(minsMatch[1]);
    const name = line
      .replace(/(\d+)\s*mins?/i, "")
      .replace(/[-:–]+\s*$/, "")
      .trim();
    return {
      exerciseName: name || line,
      sets: 1,
      reps: `${minutes} mins`,
      restSec: 30,
      notes: "cardio/conditioning"
    };
  }

  return {
    exerciseName: line,
    sets: Math.max(1, defaultSets || 1),
    reps: "",
    restSec: 60,
    notes: ""
  };
}

function inferSetsReps(a: number, b: number): { sets: number; reps: string } {
  if (a <= 8 && b >= 8) return { sets: a, reps: String(b) };
  if (b <= 8 && a >= 8) return { sets: b, reps: String(a) };
  return { sets: a, reps: String(b) };
}

function readDefaultSets(line: string): number | null {
  const match = line.match(/\b(\d+)\s*sets?\b/i);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function matchWeekdayHeading(line: string): { weekday: string; focus: string; notes: string } | null {
  const weekday = line.match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (!weekday?.[1]) return null;

  const rest = line.slice(weekday[0].length).replace(/^[:\-–—]\s*/, "").trim();
  if (!rest) {
    return { weekday: weekday[1], focus: weekday[1], notes: "" };
  }

  const parts = rest
    .split(/\s*[–—-]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  const focus = parts[0] ?? rest;
  const notes = parts.slice(1).join(" - ");

  return { weekday: weekday[1], focus, notes };
}

function weekdayToDayNumber(weekday: string): number {
  const normalized = weekday.trim().toLowerCase();
  if (normalized === "monday") return 1;
  if (normalized === "tuesday") return 2;
  if (normalized === "wednesday") return 3;
  if (normalized === "thursday") return 4;
  if (normalized === "friday") return 5;
  if (normalized === "saturday") return 6;
  if (normalized === "sunday") return 7;
  return 1;
}
