export const LANGUAGE_OPTIONS = [
  "English",
  "Hindi",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Marathi",
  "Bengali",
  "Gujarati",
  "Punjabi",
  "Urdu",
  "Spanish",
  "French",
  "German",
  "Arabic"
] as const;

export function normalizeTrainingDays(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  const n = Number(value);
  if (Number.isInteger(n) && n >= 1 && n <= 7) return String(n);
  return "";
}

