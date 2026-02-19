import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const { repo } = await import("../lib/repo/sheets-repo");
  const { findBestVideoForExercise } = await import("../lib/services/video-picker");

  const exercises = await repo.readExercises();
  const videos = await repo.readVideos();
  const hasByExercise = new Set(videos.map((v) => v.exerciseId));

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const ex of exercises) {
    if (hasByExercise.has(ex.exerciseId)) {
      skipped += 1;
      continue;
    }

    try {
      const found = await findBestVideoForExercise(ex.exerciseId, ex.name);
      if (found) {
        created += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
  }

  console.log(`Backfill done. created=${created} skipped=${skipped} failed=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
