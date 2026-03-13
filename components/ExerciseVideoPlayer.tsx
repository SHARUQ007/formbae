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
    <div className="mt-3 space-y-2">
      {videoId ? (
        showEmbed ? (
          <div className="mx-auto w-full max-w-[320px] rounded-2xl border border-emerald-100 bg-white p-2 shadow-sm">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-xs font-medium text-zinc-700">Form Clip</p>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">Reel</span>
            </div>
            <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title={`${exerciseName} short`}
                className="absolute inset-0 h-full w-full"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[320px] space-y-2 rounded-2xl border border-emerald-100 bg-zinc-50 p-2">
            <div className="mb-1 flex items-center justify-between px-1">
              <p className="text-xs font-medium text-zinc-700">Form Clip</p>
              <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] text-zinc-600">Preview</span>
            </div>
            <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-zinc-200">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={`${exerciseName} video preview`}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
              ) : null}
            </div>
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
        <div className="mx-auto w-full max-w-[320px] rounded-2xl border border-emerald-100 bg-zinc-50 p-3 text-center">
          <a href={videoUrl} target="_blank" className="inline-block text-sm text-emerald-700 underline" rel="noreferrer">
            Watch short
          </a>
        </div>
      )}
      <button type="button" onClick={replaceVideo} disabled={loading} className="btn btn-muted text-xs">
        {loading ? "Finding another video..." : "Try another"}
      </button>
      {message && <p className="text-xs text-zinc-600">{message}</p>}
    </div>
  );
}
