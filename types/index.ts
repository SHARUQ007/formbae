export type Role = "admin" | "trainer" | "user";

export type UserRow = {
  userId: string;
  role: Role;
  name: string;
  mobile: string;
  createdAt: string;
  trainerId?: string;
  allowlistFlag: string;
};

export type ProfileRow = {
  userId: string;
  weight: string;
  height: string;
  age: string;
  chest: string;
  waist: string;
  biceps: string;
  dietPref: string;
  allergies: string;
  lifestyleJson: string;
  trainingDays: string;
  photosUrlsJson: string;
  updatedAt: string;
};

export type PlanRow = {
  planId: string;
  userId: string;
  trainerId: string;
  title: string;
  weekStartDate: string;
  status: string;
  overallNotes: string;
  createdAt: string;
};

export type PlanDayRow = {
  planDayId: string;
  planId: string;
  dayNumber: string;
  focus: string;
  notes: string;
};

export type ExerciseRow = {
  exerciseId: string;
  name: string;
  primaryMuscle: string;
  equipment: string;
  defaultCuesJson: string;
};

export type PlanDayExerciseRow = {
  planDayId: string;
  exerciseId: string;
  order: string;
  sets: string;
  reps: string;
  restSec: string;
  notes: string;
  videoId: string;
  videoUrl: string;
};

export type VideoRow = {
  videoId: string;
  exerciseId: string;
  url: string;
  title: string;
  channel: string;
  thumbnail: string;
  source: "api" | "manual";
  fetchedAt: string;
  score: string;
  searchQuery: string;
};

export type WorkoutLogRow = {
  logId: string;
  userId: string;
  date: string;
  planId: string;
  planDayId: string;
  completedFlag: string;
  notes: string;
};

export type SetLogRow = {
  logId: string;
  exerciseId: string;
  setNumber: string;
  reps: string;
  weight: string;
  rpe: string;
  painFlag: string;
};

export type BodyLogRow = {
  entryId: string;
  userId: string;
  date: string;
  weight: string;
  chest: string;
  waist: string;
  biceps: string;
};

export type MessageRow = {
  messageId: string;
  userId: string;
  planId: string;
  senderRole: Role;
  text: string;
  createdAt: string;
};

export type RequestRow = {
  requestId: string;
  mobile: string;
  name: string;
  notes: string;
  createdAt: string;
  status: string;
  trainerId?: string;
};

export type SessionUser = {
  userId: string;
  role: Role;
  name: string;
  mobile: string;
  trainerId?: string;
};

export type CuePack = {
  cues: string[];
  mistakes: string[];
  safety: string;
};
