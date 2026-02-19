export const SHEETS = {
  users: "Users",
  profiles: "Profiles",
  plans: "Plans",
  planDays: "PlanDays",
  exercises: "Exercises",
  planDayExercises: "PlanDayExercises",
  videos: "Videos",
  workoutLogs: "WorkoutLogs",
  setLogs: "SetLogs",
  bodyLogs: "BodyLogs",
  messages: "Messages",
  requests: "Requests"
} as const;

export const SHEET_HEADERS: Record<string, string[]> = {
  Users: ["userId", "role", "name", "mobile", "createdAt", "trainerId", "allowlistFlag"],
  Profiles: [
    "userId",
    "weight",
    "height",
    "age",
    "chest",
    "waist",
    "biceps",
    "dietPref",
    "allergies",
    "lifestyleJson",
    "trainingDays",
    "photosUrlsJson",
    "updatedAt"
  ],
  Plans: ["planId", "userId", "trainerId", "title", "weekStartDate", "status", "overallNotes", "createdAt"],
  PlanDays: ["planDayId", "planId", "dayNumber", "focus", "notes"],
  Exercises: ["exerciseId", "name", "primaryMuscle", "equipment", "defaultCuesJson"],
  PlanDayExercises: ["planDayId", "exerciseId", "order", "sets", "reps", "restSec", "notes", "videoId", "videoUrl"],
  Videos: ["videoId", "exerciseId", "url", "title", "channel", "thumbnail", "source", "fetchedAt", "score", "searchQuery"],
  WorkoutLogs: ["logId", "userId", "date", "planId", "planDayId", "completedFlag", "notes"],
  SetLogs: ["logId", "exerciseId", "setNumber", "reps", "weight", "rpe", "painFlag"],
  BodyLogs: ["entryId", "userId", "date", "weight", "chest", "waist", "biceps"],
  Messages: ["messageId", "userId", "planId", "senderRole", "text", "createdAt"],
  Requests: ["requestId", "mobile", "name", "notes", "createdAt", "status", "trainerId"]
};
