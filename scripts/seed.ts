import { config } from "dotenv";
import { repo } from "../lib/repo/sheets-repo";
import { uid } from "../lib/sheets/base";
import { normalizeMobile } from "../lib/utils/mobile";

config({ path: ".env.local" });
config();

async function main() {
  const users = await repo.readUsers();
  const adminId = uid("usr");
  const trainerId = uid("usr");

  const hasAdmin = users.some((u) => normalizeMobile(u.mobile) === "10000000000");
  if (!hasAdmin) {
    await repo.append("users", {
      userId: adminId,
      role: "admin",
      name: "Default Admin",
      mobile: "10000000000",
      createdAt: new Date().toISOString(),
      trainerId: "",
      allowlistFlag: "enabled"
    });
  }

  const hasTrainer = users.some((u) => normalizeMobile(u.mobile) === "10000000001");
  if (!hasTrainer) {
    await repo.append("users", {
      userId: trainerId,
      role: "trainer",
      name: "Default Trainer",
      mobile: "10000000001",
      createdAt: new Date().toISOString(),
      trainerId: "",
      allowlistFlag: "enabled"
    });
  }

  const exercises = [
    {
      name: "Barbell Squat",
      primaryMuscle: "Quads",
      equipment: "Barbell",
      cues: {
        cues: ["Brace before descent", "Knees track over toes", "Drive through mid-foot"],
        mistakes: ["Knees cave in", "Heels lift", "Losing neutral spine"],
        safety: "Use safeties and stop if back pain appears"
      }
    },
    {
      name: "Dumbbell Bench Press",
      primaryMuscle: "Chest",
      equipment: "Dumbbells",
      cues: {
        cues: ["Shoulders packed", "Wrists stacked", "Touch same line each rep"],
        mistakes: ["Flaring elbows too much", "Bouncing at bottom", "Uneven press path"],
        safety: "Use spotter or controlled load"
      }
    },
    {
      name: "Lat Pulldown",
      primaryMuscle: "Lats",
      equipment: "Cable",
      cues: {
        cues: ["Pull elbows down", "Slight lean only", "Pause at chest"],
        mistakes: ["Excessive swing", "Partial reps", "Shrugging shoulders"],
        safety: "Avoid jerking heavy loads"
      }
    }
  ];

  const existingExercises = await repo.readExercises();
  for (const ex of exercises) {
    if (existingExercises.some((e) => e.name.toLowerCase() === ex.name.toLowerCase())) continue;
    const exerciseId = uid("ex");
    await repo.append("exercises", {
      exerciseId,
      name: ex.name,
      primaryMuscle: ex.primaryMuscle,
      equipment: ex.equipment,
      defaultCuesJson: JSON.stringify(ex.cues)
    });
  }

  console.log("Seed complete");
  console.log("Admin login mobile:", "10000000000");
  console.log("Trainer login mobile:", "10000000001");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
