import { repo } from "@/lib/repo/sheets-repo";
import { uid } from "@/lib/sheets/base";
import { normalizeEnabledFlag } from "@/lib/utils/flags";
import { normalizeMobile } from "@/lib/utils/mobile";

export async function syncApprovedRequestsToUsers(): Promise<number> {
  const [requests, users, profiles] = await Promise.all([
    repo.readRequests(),
    repo.readUsers(),
    repo.readProfiles()
  ]);

  let changes = 0;

  for (const req of requests) {
    if ((req.status ?? "").trim().toLowerCase() !== "approved") continue;

    const mobile = normalizeMobile(req.mobile);
    if (!mobile) continue;

    const existing = users.find((u) => normalizeMobile(u.mobile) === mobile);
    if (existing) {
      const nextTrainerId = (req.trainerId ?? "").trim() || existing.trainerId || "";
      const needsUpdate =
        existing.role !== "user" ||
        existing.allowlistFlag !== "enabled" ||
        normalizeMobile(existing.mobile) !== mobile ||
        (existing.trainerId ?? "") !== nextTrainerId ||
        (req.name && req.name !== existing.name);

      if (needsUpdate) {
        await repo.upsertUser({
          ...existing,
          role: "user",
          name: req.name || existing.name,
          mobile,
          trainerId: nextTrainerId,
          allowlistFlag: normalizeEnabledFlag("enabled")
        });
        changes += 1;
      }

      const hasProfile = profiles.some((p) => p.userId === existing.userId);
      if (!hasProfile) {
        await repo.upsertProfile({
          userId: existing.userId,
          weight: "",
          height: "",
          age: "",
          chest: "",
          waist: "",
          biceps: "",
          dietPref: "",
          allergies: "",
          lifestyleJson: "{}",
          trainingDays: "",
          photosUrlsJson: "{}",
          updatedAt: new Date().toISOString()
        });
        changes += 1;
      }
      continue;
    }

    const userId = uid("usr");
    await repo.append("users", {
      userId,
      role: "user",
      name: req.name || "Trainee",
      mobile,
      createdAt: new Date().toISOString(),
      trainerId: (req.trainerId ?? "").trim(),
      allowlistFlag: normalizeEnabledFlag("enabled")
    });

    await repo.upsertProfile({
      userId,
      weight: "",
      height: "",
      age: "",
      chest: "",
      waist: "",
      biceps: "",
      dietPref: "",
      allergies: "",
      lifestyleJson: "{}",
      trainingDays: "",
      photosUrlsJson: "{}",
      updatedAt: new Date().toISOString()
    });

    changes += 1;
  }

  return changes;
}
