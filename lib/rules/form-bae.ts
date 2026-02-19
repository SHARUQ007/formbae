import { CuePack } from "@/types";

const defaultPack: CuePack = {
  cues: [
    "Brace your core before each rep.",
    "Control the lowering phase; do not rush.",
    "Breathe out through the hardest part."
  ],
  mistakes: [
    "Using momentum instead of muscle control.",
    "Going too heavy and shortening range of motion.",
    "Ignoring pain signals and forcing reps."
  ],
  safety: "Stop the set for sharp pain, dizziness, or joint instability."
};

export function parseCuePack(raw: string): CuePack {
  if (!raw) return defaultPack;
  try {
    const parsed = JSON.parse(raw) as Partial<CuePack>;
    return {
      cues: parsed.cues?.slice(0, 3) ?? defaultPack.cues,
      mistakes: parsed.mistakes?.slice(0, 3) ?? defaultPack.mistakes,
      safety: parsed.safety ?? defaultPack.safety
    };
  } catch {
    return defaultPack;
  }
}

export function nudgeByAdherence(adherencePct: number): string {
  if (adherencePct >= 85) return "Strong consistency this week. Keep progressive overload gradual and clean.";
  if (adherencePct >= 60) return "Solid base. Focus on showing up for all scheduled sessions next week.";
  return "Momentum reset: lock your workout slots in calendar and hit the first session early.";
}

export function effortFeedback(feel: string): string {
  if (feel === "easy") return "Good. Increase load slightly next session while keeping form strict.";
  if (feel === "hard") return "Hard is okay. Keep reps clean before increasing weight.";
  if (feel === "pain") return "Pain flagged. Stop that movement and message your trainer before retrying.";
  return "Nice work. Keep technique and breathing consistent set to set.";
}
