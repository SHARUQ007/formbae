import "@/styles/globals.css";
import Link from "next/link";
import { ReactNode } from "react";
import { getSessionUser } from "@/lib/auth/session";
import { BrandLogo } from "@/components/BrandLogo";

export const metadata = {
  title: "Form Bae",
  description: "Workout plans + form coaching"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  const homeHref = user?.role === "admin" ? "/admin/dashboard" : user?.role === "trainer" ? "/trainer/dashboard" : "/app/today";
  const navLinkClass = "inline-flex items-center rounded-full px-3 py-1.5 text-sm text-zinc-700 hover:bg-emerald-50 hover:text-emerald-800";
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <header className="sticky top-0 z-40 border-b border-emerald-100/80 bg-white/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-4">
            <BrandLogo href={homeHref} />
            <nav className="flex w-full flex-wrap items-center justify-start gap-1 text-sm sm:w-auto sm:justify-end sm:gap-2">
              {!user && <Link href="/login" className={navLinkClass}>Login</Link>}
              {user?.role === "admin" && (
                <>
                  <Link href="/admin/dashboard" className={navLinkClass}>Admin</Link>
                  <Link href="/trainer/exercises" className={navLinkClass}>Exercises</Link>
                </>
              )}
              {user?.role === "trainer" && (
                <>
                  <Link href="/trainer/dashboard" className={navLinkClass}>Dashboard</Link>
                  <Link href="/trainer/exercises" className={navLinkClass}>Exercises</Link>
                </>
              )}
              {user?.role === "user" && (
                <>
                  <Link href="/app/today" className={navLinkClass}>Today</Link>
                  <Link href="/app/plan" className={navLinkClass}>Full Plan</Link>
                  <Link href="/app/progress" className={navLinkClass}>Progress</Link>
                  <Link href="/app/profile" className={navLinkClass}>Profile</Link>
                </>
              )}
              {user && (
                <form action="/api/auth/logout" method="post">
                  <button className="btn btn-primary rounded-full px-4" type="submit">
                    Logout
                  </button>
                </form>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">{children}</main>
      </body>
    </html>
  );
}
