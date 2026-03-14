import "@/styles/globals.css";
import { AvatarIcon } from "@/components/AvatarIcon";
import Link from "next/link";
import { ReactNode } from "react";
import { DEFAULT_AVATAR_ICON_ID } from "@/lib/avatar-icons";
import { getSessionUser } from "@/lib/auth/session";
import { BrandLogo } from "@/components/BrandLogo";
import { getProfileForUser, isProfileOnboardingComplete } from "@/lib/services/profile-onboarding";

export const metadata = {
  title: "Form Bae",
  description: "Workout plans + form coaching"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  const userProfile = user?.role === "user" ? await getProfileForUser(user.userId) : undefined;
  const userOnboarded = user?.role === "user" ? isProfileOnboardingComplete(userProfile) : true;
  const userAvatar = user?.role === "user" ? userProfile?.avatarIcon || DEFAULT_AVATAR_ICON_ID : "";
  const homeHref = user?.role === "admin" ? "/admin/dashboard" : user?.role === "trainer" ? "/trainer/dashboard" : userOnboarded ? "/app/today" : "/app/onboarding";
  const navLinkClass =
    "inline-flex w-full items-center justify-center rounded-lg px-2 py-2 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-white hover:text-emerald-800 sm:w-auto sm:rounded-full sm:px-3 sm:py-1.5 sm:text-sm";

  const navLinks: Array<{ href: string; label: string }> = !user
    ? [{ href: "/login", label: "Login" }]
    : user.role === "admin"
      ? [
          { href: "/admin/dashboard", label: "Admin" },
          { href: "/trainer/exercises", label: "Exercises" }
        ]
      : user.role === "trainer"
        ? [
            { href: "/trainer/dashboard", label: "Dashboard" },
            { href: "/trainer/exercises", label: "Exercises" }
          ]
        : userOnboarded
          ? [
              { href: "/app/today", label: "Today" },
              { href: "/app/plan", label: "Full Plan" },
              { href: "/app/progress", label: "Progress" },
              { href: "/app/profile", label: "Profile" }
            ]
          : [{ href: "/app/onboarding", label: "Onboarding" }];
  const mobileNavColsClass =
    navLinks.length >= 4 ? "grid-cols-4" : navLinks.length === 3 ? "grid-cols-3" : navLinks.length === 2 ? "grid-cols-2" : "grid-cols-1";

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <header className="sticky top-0 z-40 border-b border-emerald-100/80 bg-white/90 backdrop-blur">
          <div className="mx-auto max-w-6xl px-2.5 py-2 sm:px-4 sm:py-3">
            <div className="flex items-center justify-between gap-2.5">
              <BrandLogo href={homeHref} />
              {user && (
                <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/60 p-1 shadow-sm">
                  {user.role === "user" && (
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-white">
                      <AvatarIcon iconId={userAvatar} className="h-4 w-4 text-emerald-700" />
                    </span>
                  )}
                  <form action="/api/auth/logout" method="post">
                    <button className="btn rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-emerald-100" type="submit">
                      Logout
                    </button>
                  </form>
                </div>
              )}
              {!user && (
                <div className="shrink-0">
                  <Link href="/login" className="btn rounded-full border border-emerald-200 bg-white px-4 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-emerald-100">
                    Login
                  </Link>
                </div>
              )}
            </div>

            {user && (
              <nav className="mt-2 sm:mt-2">
                <div
                  className={`grid w-full gap-1 rounded-xl border border-emerald-100 bg-zinc-50 p-1.5 ${mobileNavColsClass} sm:flex sm:w-auto sm:flex-nowrap sm:rounded-full sm:bg-emerald-50/80 sm:p-1`}
                >
                  {navLinks.map((link) => (
                    <Link key={link.href} href={link.href} className={navLinkClass}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </nav>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">{children}</main>
      </body>
    </html>
  );
}
