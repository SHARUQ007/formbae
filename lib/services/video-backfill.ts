import { repo } from "@/lib/repo/sheets-repo";
import { buildBestVideoCandidate } from "@/lib/services/video-picker";
import { VideoRow } from "@/types";

export type ExerciseRef = {
  exerciseId: string;
  exerciseName: string;
};

type BackfillOptions = {
  youtubeDelayMs?: number;
  sheetsBatchSize?: number;
  sheetsDelayMs?: number;
};

function hasUsableVideo(videos: VideoRow[], exerciseId: string): boolean {
  return videos.some((v) => v.exerciseId === exerciseId && Boolean(v.url));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function backfillExerciseVideosInBackground(exercises: ExerciseRef[], options: BackfillOptions = {}): Promise<void> {
  if (!exercises.length) return;
  const youtubeDelayMs = Math.max(0, Number(options.youtubeDelayMs ?? 400));
  const sheetsBatchSize = Math.max(1, Number(options.sheetsBatchSize ?? 15));
  const sheetsDelayMs = Math.max(0, Number(options.sheetsDelayMs ?? 350));

  const [allVideos, allExercises] = await Promise.all([repo.readVideos(), repo.readExercises()]);
  const namesById = new Map(allExercises.map((e) => [e.exerciseId, e.name]));

  const unique = new Map<string, string>();
  for (const ex of exercises) {
    const id = (ex.exerciseId || "").trim();
    if (!id || unique.has(id) || hasUsableVideo(allVideos, id)) continue;
    const resolvedName = (ex.exerciseName || "").trim() || namesById.get(id) || "";
    if (!resolvedName) continue;
    unique.set(id, resolvedName);
  }

  if (!unique.size) return;

  const created: VideoRow[] = [];
  for (const [exerciseId, exerciseName] of unique.entries()) {
    try {
      const candidate = await buildBestVideoCandidate(exerciseId, exerciseName);
      if (candidate) created.push(candidate);
    } catch {
      // Best-effort background enrichment.
    }
    if (youtubeDelayMs) {
      await sleep(youtubeDelayMs);
    }
  }

  if (created.length) {
    for (let start = 0; start < created.length; start += sheetsBatchSize) {
      const chunk = created.slice(start, start + sheetsBatchSize);
      await repo.appendMany("videos", chunk);
      if (sheetsDelayMs && start + sheetsBatchSize < created.length) {
        await sleep(sheetsDelayMs);
      }
    }
  }
}
