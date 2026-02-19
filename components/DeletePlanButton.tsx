"use client";

import { useState } from "react";

type Props = {
  planId: string;
  userId: string;
  planTitle: string;
};

export function DeletePlanButton({ planId, userId, planTitle }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-danger text-xs"
      >
        Delete Plan
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-4 shadow-lg">
            <h3 className="text-base font-semibold text-zinc-900">Delete Plan?</h3>
            <p className="mt-2 text-sm text-zinc-600">
              This will permanently delete <span className="font-medium text-zinc-800">{planTitle}</span> and related logs/messages for this plan.
            </p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn btn-muted"
              >
                Cancel
              </button>
              <form action="/api/trainer/plans/delete" method="post">
                <input type="hidden" name="planId" value={planId} />
                <input type="hidden" name="userId" value={userId} />
                <button type="submit" className="btn bg-red-700 text-white hover:bg-red-800">
                  Delete Plan
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
