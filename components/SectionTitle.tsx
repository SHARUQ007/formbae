export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 sm:mb-5">
      <h1 className="text-[1.7rem] font-semibold leading-tight tracking-tight text-zinc-900 sm:text-[2rem]">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-zinc-600 sm:text-[15px]">{subtitle}</p>}
    </div>
  );
}
