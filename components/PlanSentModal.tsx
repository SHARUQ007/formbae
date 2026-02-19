"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function PlanSentModal({ initialOpen }: { initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!open) return null;

  function closeModal() {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("sent");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-emerald-200 bg-white p-5 text-center shadow-xl">
        <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl">
          🎉
        </div>
        <h3 className="text-lg font-semibold text-zinc-900">Plan Sent Successfully</h3>
        <p className="mt-1 text-sm text-zinc-600">The workout plan has been assigned to the user.</p>
        <button type="button" onClick={closeModal} className="btn btn-primary mt-4 w-full">
          Awesome
        </button>
      </div>
    </div>
  );
}
