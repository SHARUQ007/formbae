import Link from "next/link";

export function BrandLogo({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 group">
      <span className="relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 shadow-[0_10px_24px_rgba(16,185,129,0.32)] transition-transform duration-200 group-hover:scale-[1.03]">
        <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
          <path d="M6 24c3-6 8-9 16-12" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="13" cy="9" r="2.2" fill="white" />
          <path d="M13 12.4v5.6l4 2.6M13 18l-3.2 4.2M17 14.5l4-2.5" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20.5 20.5l2.2 2.2 4-4" fill="none" stroke="#dcfce7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-base font-semibold tracking-tight text-zinc-900 sm:text-[1.05rem]">FormBae</span>
        <span className="hidden text-[11px] tracking-wide text-zinc-500 sm:block">Train Better Form</span>
      </span>
    </Link>
  );
}
