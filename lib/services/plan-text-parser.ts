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
  const globalNotes: string[] = [];
  const days: ParsedWorkoutText["days"] = [];
  let currentDay: ParsedWorkoutText["days"][number] | null = null;
  let inGlobalNotesSection = false;

  for (const line of lines) {
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
      } else if (!/^notes?\s*[:-]/i.test(line)) {
        title = line;
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

    const parsedExercise = parseExerciseLine(line);
    if (parsedExercise) {
      currentDay.exercises.push(parsedExercise);
    }
  }

  return { title, globalNotes, days };
}

function cleanNoteLine(line: string): string {
  return line.replace(/^notes?\s*[:-]\s*/i, "").trim();
}

function parseExerciseLine(raw: string): ParsedWorkoutText["days"][number]["exercises"][number] | null {
  let line = raw
    .replace(/^[-*]\s*/, "")
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
    sets: 1,
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
