"use client";

import { useState } from "react";

type Props = {
  planId: string;
  planDayId: string;
  exerciseId: string;
  initialCompleted: boolean;
};

export function ExerciseCompleteToggle({ planId, planDayId, exerciseId, initialCompleted }: Props) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [pending, setPending] = useState(false);

  async function toggleCompletion() {
    if (pending) return;
    setPending(true);
    const nextAction = completed ? "exerciseUndo" : "exercise";

    try {
      const formData = new FormData();
      formData.set("planId", planId);
      formData.set("planDayId", planDayId);
      formData.set("exerciseId", exerciseId);
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

  if (completed) {
    return (
      <button
        type="button"
        onClick={toggleCompletion}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 disabled:opacity-60"
        title="Undo completed"
      >
        {pending ? (
          <span>Saving...</span>
        ) : (
          <>
            <span>Completed</span>
            <span className="font-semibold">x</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleCompletion}
      disabled={pending}
      className="btn btn-primary text-xs disabled:opacity-60"
    >
      {pending ? "Saving..." : "Mark Workout Done"}
    </button>
  );
}
