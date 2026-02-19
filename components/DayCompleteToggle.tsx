"use client";

import { useState } from "react";

type Props = {
  planId: string;
  planDayId: string;
  initialCompleted: boolean;
};

export function DayCompleteToggle({ planId, planDayId, initialCompleted }: Props) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [pending, setPending] = useState(false);

  async function toggleCompletion() {
    if (pending) return;
    setPending(true);
    const nextAction = completed ? "dayUndo" : "day";

    try {
      const formData = new FormData();
      formData.set("planId", planId);
      formData.set("planDayId", planDayId);
      formData.set("action", nextAction);
      formData.set("ajax", "true");

      const res = await fetch("/api/workouts/complete", {
        method: "POST",
        body: formData
      });
      if (!res.ok) return;
      const data = (await res.json()) as { ok?: boolean; completed?: boolean };
      if (data.ok) {
        setCompleted(Boolean(data.completed));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-zinc-700">
        {completed ? "Today's selected workout day is marked completed." : "Mark the entire selected day when all workouts are done."}
      </p>
      {completed ? (
        <button
          type="button"
          onClick={toggleCompletion}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-100 px-2 py-1 text-xs text-zinc-700 disabled:opacity-60"
          title="Undo full day completion"
        >
          {pending ? (
            <span>Saving...</span>
          ) : (
            <>
              <span>Day Completed</span>
              <span className="font-semibold">x</span>
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={toggleCompletion}
          disabled={pending}
          className="btn btn-primary disabled:opacity-60"
        >
          {pending ? "Saving..." : "Mark full day completed"}
        </button>
      )}
    </div>
  );
}
