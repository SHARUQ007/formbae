"use client";

import { useMemo, useState } from "react";
import { parseCuePack } from "@/lib/rules/form-bae";
import { ExerciseRow, VideoRow } from "@/types";

type Props = {
  exercises: ExerciseRow[];
  videos: VideoRow[];
};

export function ExerciseLibraryList({ exercises, videos }: Props) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalized) return exercises;
    return exercises.filter((e) =>
      [e.name, e.primaryMuscle, e.equipment]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [exercises, normalized]);

  return (
    <div className="surface p-3 sm:p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h3 className="text-sm font-semibold">Existing Exercises</h3>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, muscle, equipment"
            className="w-full sm:w-80"
          />
        </div>
      </div>
      <ul className="space-y-3">
        {filtered.map((e) => (
          <li key={e.exerciseId} className="rounded border border-emerald-100 p-3 text-sm">
            <details>
              <summary className="cursor-pointer list-none">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{e.name}</p>
                    <p className="text-zinc-600">{e.primaryMuscle} • {e.equipment}</p>
                  </div>
                  <span className="inline-flex w-fit rounded border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700">
                    Edit exercise
                  </span>
                </div>
              </summary>
              <form action={`/api/trainer/exercises/${e.exerciseId}`} method="post" className="mt-3 space-y-3">
                <div>
                  <label>Exercise Name</label>
                  <input name="name" defaultValue={e.name} required />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label>Primary Muscle</label>
                    <input name="primaryMuscle" defaultValue={e.primaryMuscle} required />
                  </div>
                  <div>
                    <label>Equipment</label>
                    <input name="equipment" defaultValue={e.equipment} required />
                  </div>
                </div>
                {(() => {
                  const cuePack = parseCuePack(e.defaultCuesJson);
                  const currentVideo = videos.find((v) => v.exerciseId === e.exerciseId)?.url ?? "";
                  return (
                    <>
                      <label>3 Key Cues (one per line)</label>
                      <textarea name="cuesText" rows={4} defaultValue={cuePack.cues.join("\n")} required />
                      <label>3 Common Mistakes (one per line)</label>
                      <textarea name="mistakesText" rows={4} defaultValue={cuePack.mistakes.join("\n")} required />
                      <label>Safety Note</label>
                      <input name="safetyText" defaultValue={cuePack.safety} required />
                      <label>Manual Video URL (optional)</label>
                      <input name="manualVideoUrl" defaultValue={currentVideo} placeholder="https://youtube.com/shorts/..." />
                    </>
                  );
                })()}
                <button className="btn btn-secondary w-full" type="submit">Save Changes</button>
              </form>
            </details>
          </li>
        ))}
      </ul>
      {!filtered.length && (
        <p className="mt-3 text-sm text-zinc-500">No exercises found for this search.</p>
      )}
    </div>
  );
}
