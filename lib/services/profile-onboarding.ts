import { repo } from "@/lib/repo/sheets-repo";
import { ProfileRow } from "@/types";

export function parseLanguages(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => String(entry).trim()).filter(Boolean);
    }
  } catch {
    return raw
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

export function isProfileOnboardingComplete(profile: ProfileRow | undefined): boolean {
  if (!profile) return false;
  const required = [
    profile.weight,
    profile.height,
    profile.age,
    profile.gender,
    profile.dietPref,
    profile.fitnessGoal,
    profile.trainingDays,
    profile.avatarIcon
  ].map((value) => String(value ?? "").trim());
  const languages = parseLanguages(profile.languagePreferencesJson);
  return required.every(Boolean) && languages.length > 0;
}

export async function getProfileForUser(userId: string): Promise<ProfileRow | undefined> {
  const profiles = await repo.readProfiles();
  return profiles.find((p) => p.userId === userId);
}
