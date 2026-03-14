export const AVATAR_ICON_IDS = [
  "panther",
  "wolf",
  "eagle",
  "shark",
  "rabbit",
  "cobra",
  "rhino",
  "bear",
  "tiger",
  "lion"
] as const;

export type AvatarIconId = (typeof AVATAR_ICON_IDS)[number];

export const DEFAULT_AVATAR_ICON_ID: AvatarIconId = "panther";

export const AVATAR_ICON_META: Record<AvatarIconId, { name: string; tagline: string }> = {
  panther: { name: "Panther Mode", tagline: "Lowkey calm, PRs go boom." },
  wolf: { name: "Wolf Grindset", tagline: "Solo sesh, main-character energy." },
  eagle: { name: "Eagle Lock-In", tagline: "Form check = no ego lifting." },
  shark: { name: "Shark Tanked", tagline: "No skips, just swim through pain." },
  rabbit: { name: "Bunny Burst", tagline: "Cardio goblin with turbo reps." },
  cobra: { name: "Cobra Core", tagline: "Abs so tight, posture went viral." },
  rhino: { name: "Tortoise W", tagline: "Slow grind, big W. Consistency clears." },
  bear: { name: "Bear Bulk Era", tagline: "Lift heavy, snack heavy, sleep heavy." },
  tiger: { name: "Tiger Tempo", tagline: "Clean reps only. Zero chaos." },
  lion: { name: "Lion PR King", tagline: "Chest day CEO, respectfully." }
};

export function normalizeAvatarIconId(value: string): AvatarIconId {
  const normalized = value.trim().toLowerCase();
  const legacyToCurrent: Record<string, AvatarIconId> = {
    sparkles: "panther",
    flame: "wolf",
    zap: "eagle",
    rocket: "shark",
    heart: "rabbit",
    star: "cobra",
    target: "rhino",
    shield: "bear",
    crown: "tiger",
    dumbbell: "lion",
    cat: "panther",
    dog: "wolf",
    bird: "eagle",
    fish: "shark",
    bug: "cobra",
    bot: "rhino",
    baby: "bear",
    ghost: "tiger",
    alien: "lion"
  };
  if (legacyToCurrent[normalized]) {
    return legacyToCurrent[normalized];
  }
  if (AVATAR_ICON_IDS.includes(normalized as AvatarIconId)) {
    return normalized as AvatarIconId;
  }
  return DEFAULT_AVATAR_ICON_ID;
}
