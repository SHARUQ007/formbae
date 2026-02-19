import { ReactNode } from "react";

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="surface p-3 sm:p-4">
      <h2 className="mb-3 text-base font-semibold tracking-tight text-zinc-900">{title}</h2>
      {children}
    </section>
  );
}
