"use client";

import { useEffect, useMemo, useState } from "react";

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
  const [isOnline, setIsOnline] = useState(true);
  const [preferLightMode, setPreferLightMode] = useState(false);
  const [showEmbed, setShowEmbed] = useState(true);
  const videoId = useMemo(() => getYouTubeVideoId(videoUrl), [videoUrl]);
  const youtubeWatchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : videoUrl;
  const thumbnailUrl = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";

  useEffect(() => {
    const online = typeof navigator !== "undefined" ? navigator.onLine : true;
    setIsOnline(online);

    if (typeof navigator === "undefined") return;

    const connection = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
    const effectiveType = connection?.effectiveType || "";
    const saveData = Boolean(connection?.saveData);
    const slowNetwork = saveData || effectiveType === "slow-2g" || effectiveType === "2g" || effectiveType === "3g";
    setPreferLightMode(slowNetwork);
    setShowEmbed(!slowNetwork && online);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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
        showEmbed ? (
          <div className="overflow-hidden rounded-lg border border-emerald-100">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title={`${exerciseName} short`}
              className="h-52 w-full sm:h-64 md:h-80"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="space-y-2 rounded-lg border border-emerald-100 bg-zinc-50 p-2">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={`${exerciseName} video preview`}
                className="h-44 w-full rounded object-cover sm:h-56"
                loading="lazy"
              />
            ) : null}
            <p className="text-xs text-zinc-600">
              {!isOnline
                ? "You are offline. Video streaming is unavailable."
                : preferLightMode
                  ? "Low-data mode: video is paused to reduce buffering."
                  : "Video paused. Tap play to load stream."}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={() => setShowEmbed(true)}
                disabled={!isOnline}
              >
                {isOnline ? "Play video" : "Offline"}
              </button>
              <a href={youtubeWatchUrl} target="_blank" rel="noreferrer" className="btn btn-muted text-xs">
                Open in YouTube
              </a>
            </div>
          </div>
        )
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
