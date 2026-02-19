import { SHEETS, SHEET_HEADERS } from "@/lib/constants";
import { appendRows, overwriteRows, readSheet, toObjects } from "@/lib/sheets/base";
import {
  BodyLogRow,
  ExerciseRow,
  MessageRow,
  PlanDayExerciseRow,
  PlanDayRow,
  PlanRow,
  ProfileRow,
  RequestRow,
  SetLogRow,
  UserRow,
  VideoRow,
  WorkoutLogRow
} from "@/types";

type TabRow =
  | UserRow
  | ProfileRow
  | PlanRow
  | PlanDayRow
  | ExerciseRow
  | PlanDayExerciseRow
  | VideoRow
  | WorkoutLogRow
  | SetLogRow
  | BodyLogRow
  | MessageRow
  | RequestRow;

async function readTab<T extends Record<string, string>>(tab: keyof typeof SHEETS): Promise<T[]> {
  const sheetName = SHEETS[tab];
  const raw = await readSheet(sheetName);
  if (raw.length === 0) {
    await appendRows(sheetName, [SHEET_HEADERS[sheetName]]);
    return [];
  }
  return toObjects<T>(raw, SHEET_HEADERS[sheetName]);
}

function toRowValues(tab: keyof typeof SHEETS, row: TabRow): string[] {
  const headers = SHEET_HEADERS[SHEETS[tab]];
  return headers.map((header) => (row as Record<string, string>)[header] ?? "");
}

async function upsertByKey<T extends TabRow>(tab: keyof typeof SHEETS, key: keyof T & string, item: T): Promise<void> {
  const sheetName = SHEETS[tab];
  const allRows = await readSheet(sheetName);
  const headers = SHEET_HEADERS[sheetName];
  const headerRow = allRows[0] ?? headers;
  const keyIndex = headers.indexOf(key);
  const itemValues = headers.map((h) => (item as Record<string, string>)[h] ?? "");

  const bodyRows = (allRows.length > 1 ? allRows.slice(1) : []).map((row) => {
    const normalized = [...row];
    while (normalized.length < headers.length) normalized.push("");
    return normalized;
  });

  const keyValue = String(item[key] ?? "").trim();
  const existingIndex = bodyRows.findIndex((row) => String(row[keyIndex] ?? "").trim() === keyValue);
  if (existingIndex >= 0) {
    bodyRows[existingIndex] = itemValues;
  } else {
    bodyRows.push(itemValues);
  }

  await overwriteRows(sheetName, [headerRow, ...bodyRows]);
}

export const repo = {
  readUsers: () => readTab<UserRow>("users"),
  readProfiles: () => readTab<ProfileRow>("profiles"),
  readPlans: () => readTab<PlanRow>("plans"),
  readPlanDays: () => readTab<PlanDayRow>("planDays"),
  readExercises: () => readTab<ExerciseRow>("exercises"),
  readPlanDayExercises: () => readTab<PlanDayExerciseRow>("planDayExercises"),
  readVideos: () => readTab<VideoRow>("videos"),
  readWorkoutLogs: () => readTab<WorkoutLogRow>("workoutLogs"),
  readSetLogs: () => readTab<SetLogRow>("setLogs"),
  readBodyLogs: () => readTab<BodyLogRow>("bodyLogs"),
  readMessages: () => readTab<MessageRow>("messages"),
  readRequests: () => readTab<RequestRow>("requests"),

  async append<T extends TabRow>(tab: keyof typeof SHEETS, row: T) {
    await appendRows(SHEETS[tab], [toRowValues(tab, row)]);
  },
  async appendMany<T extends TabRow>(tab: keyof typeof SHEETS, rows: T[]) {
    await appendRows(
      SHEETS[tab],
      rows.map((row) => toRowValues(tab, row))
    );
  },

  upsertUser: (row: UserRow) => upsertByKey("users", "userId", row),
  upsertProfile: (row: ProfileRow) => upsertByKey("profiles", "userId", row),
  upsertExercise: (row: ExerciseRow) => upsertByKey("exercises", "exerciseId", row),
  upsertVideo: (row: VideoRow) => upsertByKey("videos", "videoId", row),
  upsertPlan: (row: PlanRow) => upsertByKey("plans", "planId", row),
  upsertRequest: (row: RequestRow) => upsertByKey("requests", "requestId", row)
};
