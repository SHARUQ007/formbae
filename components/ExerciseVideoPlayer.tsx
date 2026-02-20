"use client";

import { useMemo, useState } from "react";

type Props = {
  planDayId: string;
  exerciseId: string;
  exerciseName: string;
  initialVideoUrl: string;
};

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
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
  return null;
}

export function ExerciseVideoPlayer({ planDayId, exerciseId, exerciseName, initialVideoUrl }: Props) {
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const videoId = useMemo(() => getYouTubeVideoId(videoUrl), [videoUrl]);

  async function replaceVideo() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/video/replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planDayId,
          exerciseId,
          exerciseName,
          previousVideoUrl: videoUrl
        })
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.video?.url) {
        setMessage(data?.error || data?.message || "Could not find another video.");
        return;
      }
      setVideoUrl(String(data.video.url));
      setMessage("Replaced with another video.");
    } catch {
      setMessage("Could not replace video right now.");
    } finally {
      setLoading(false);
    }
  }

  if (!videoUrl) return null;

  return (
    <div className="mt-2 space-y-2">
      {videoId ? (
        <div className="overflow-hidden rounded-lg border border-emerald-100">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title={`${exerciseName} short`}
            className="h-52 w-full sm:h-64 md:h-80"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <a href={videoUrl} target="_blank" className="inline-block text-sm text-emerald-700 underline" rel="noreferrer">
          Watch short
        </a>
      )}
      <button type="button" onClick={replaceVideo} disabled={loading} className="btn btn-muted text-xs">
        {loading ? "Finding another video..." : "Try another"}
      </button>
      {message && <p className="text-xs text-zinc-600">{message}</p>}
    </div>
  );
}
