export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="surface p-3">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
    </div>
  );
}
