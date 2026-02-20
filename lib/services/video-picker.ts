import { google } from "googleapis";
import { repo } from "@/lib/repo/sheets-repo";
import { uid } from "@/lib/sheets/base";
import { VideoRow } from "@/types";

const API_KEY = process.env.YOUTUBE_API_KEY;

function scoreVideo(title: string, views: number, durationSec: number): number {
  const titleLower = title.toLowerCase();
  const keywordBoost = ["form", "tutorial", "technique", "tips"].some((k) => titleLower.includes(k)) ? 25 : 0;
  const shortBoost = durationSec <= 60 ? 20 : 0;
  return keywordBoost + shortBoost + Math.min(views / 10000, 55);
}

export async function findBestVideoForExercise(exerciseId: string, exerciseName: string): Promise<VideoRow | null> {
  const best = await buildBestVideoCandidate(exerciseId, exerciseName);

  if (best) {
    await repo.append("videos", best);
  }

  return best;
}

export async function findAlternativeVideoForExercise(
  exerciseId: string,
  exerciseName: string,
  excludedUrls: string[]
): Promise<VideoRow | null> {
  const excludedKeys = new Set(excludedUrls.map((url) => toComparableVideoKey(url)).filter(Boolean));
  const candidates = await buildVideoCandidates(exerciseId, exerciseName);
  const next = candidates.find((candidate) => !excludedKeys.has(toComparableVideoKey(candidate.url)));
  if (!next) return null;
  await repo.append("videos", next);
  return next;
}

export async function buildBestVideoCandidate(exerciseId: string, exerciseName: string): Promise<VideoRow | null> {
  const candidates = await buildVideoCandidates(exerciseId, exerciseName);
  return candidates[0] ?? null;
}

async function buildVideoCandidates(exerciseId: string, exerciseName: string): Promise<VideoRow[]> {
  if (!API_KEY) return [];

  const youtube = google.youtube({ version: "v3", auth: API_KEY });
  const query = `${exerciseName} proper form shorts`;
  const searchRes = await youtube.search.list({
    part: ["snippet"],
    q: query,
    maxResults: 10,
    type: ["video"],
    videoDuration: "short"
  });

  const ids = (searchRes.data.items ?? []).map((i) => i.id?.videoId).filter(Boolean) as string[];
  if (!ids.length) return [];

  const details = await youtube.videos.list({
    part: ["snippet", "statistics", "contentDetails"],
    id: ids
  });

  const candidates: VideoRow[] = [];
  for (const item of details.data.items ?? []) {
    const id = item.id;
    if (!id) continue;

    const duration = item.contentDetails?.duration ?? "PT0S";
    const sec = parseIsoDuration(duration);
    const views = Number(item.statistics?.viewCount ?? "0");
    const title = item.snippet?.title ?? "";
    const row: VideoRow = {
      videoId: uid("vid"),
      exerciseId,
      url: `https://www.youtube.com/shorts/${id}`,
      title,
      channel: item.snippet?.channelTitle ?? "",
      thumbnail: item.snippet?.thumbnails?.high?.url ?? "",
      source: "api",
      fetchedAt: new Date().toISOString(),
      score: scoreVideo(title, views, sec).toFixed(2),
      searchQuery: query
    };

    candidates.push(row);
  }

  return candidates.sort((a, b) => Number(b.score) - Number(a.score));
}

function parseIsoDuration(input: string): number {
  const match = input.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const mins = Number(match[1] ?? "0");
  const secs = Number(match[2] ?? "0");
  return mins * 60 + secs;
}

function extractYouTubeId(url: string): string {
  if (!url) return "";
  const patterns = [
    /youtube\.com\/shorts\/([^?&/]+)/i,
    /youtube\.com\/watch\?v=([^?&/]+)/i,
    /youtube\.com\/embed\/([^?&/]+)/i,
    /youtu\.be\/([^?&/]+)/i
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return "";
}

function toComparableVideoKey(url: string): string {
  const id = extractYouTubeId(url);
  if (id) return `yt:${id}`;
  return url.trim().toLowerCase();
}
