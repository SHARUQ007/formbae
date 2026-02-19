import { repo } from "@/lib/repo/sheets-repo";
import { buildBestVideoCandidate } from "@/lib/services/video-picker";
import { VideoRow } from "@/types";

type ExerciseRef = {
  exerciseId: string;
  exerciseName: string;
};

function hasUsableVideo(videos: VideoRow[], exerciseId: string): boolean {
  return videos.some((v) => v.exerciseId === exerciseId && Boolean(v.url));
}

export async function backfillExerciseVideosInBackground(exercises: ExerciseRef[]): Promise<void> {
  if (!exercises.length) return;

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
  }

  if (created.length) {
    await repo.appendMany("videos", created);
  }
}
