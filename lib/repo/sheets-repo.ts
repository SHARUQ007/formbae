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
  const canonicalHeaders = SHEET_HEADERS[sheetName];
  const raw = await readSheet(sheetName);
  if (raw.length === 0) {
    await appendRows(sheetName, [canonicalHeaders]);
    return [];
  }

  const sourceHeaders = raw[0] ?? canonicalHeaders;
  const body = raw.length > 1 ? raw.slice(1) : [];
  const normalized = body.map((row) =>
    canonicalHeaders.map((header) => {
      const sourceIndex = sourceHeaders.indexOf(header);
      return sourceIndex >= 0 ? (row[sourceIndex] ?? "") : "";
    })
  );

  return toObjects<T>([canonicalHeaders, ...normalized], canonicalHeaders);
}

function toRowValues(tab: keyof typeof SHEETS, row: TabRow): string[] {
  const headers = SHEET_HEADERS[SHEETS[tab]];
  return headers.map((header) => (row as Record<string, string>)[header] ?? "");
}

async function upsertByKey<T extends TabRow>(tab: keyof typeof SHEETS, key: keyof T & string, item: T): Promise<void> {
  const sheetName = SHEETS[tab];
  const allRows = await readSheet(sheetName);
  const headers = SHEET_HEADERS[sheetName];
  const sourceHeaders = allRows[0] ?? headers;
  const keyIndex = headers.indexOf(key);
  const itemValues = headers.map((h) => (item as Record<string, string>)[h] ?? "");

  const sourceBody = allRows.length > 1 ? allRows.slice(1) : [];
  const bodyRows = sourceBody.map((row) =>
    headers.map((header) => {
      const sourceIndex = sourceHeaders.indexOf(header);
      return sourceIndex >= 0 ? (row[sourceIndex] ?? "") : "";
    })
  );

  const keyValue = String(item[key] ?? "").trim();
  const existingIndex = bodyRows.findIndex((row) => String(row[keyIndex] ?? "").trim() === keyValue);
  if (existingIndex >= 0) {
    bodyRows[existingIndex] = itemValues;
  } else {
    bodyRows.push(itemValues);
  }

  await overwriteRows(sheetName, [headers, ...bodyRows]);
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
