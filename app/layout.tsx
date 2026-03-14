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
    "inline-flex items-center rounded-full px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-white hover:text-emerald-800 sm:px-3 sm:text-sm";
  const navClass = user
    ? "order-3 w-full sm:order-none sm:w-auto sm:flex-1 sm:justify-end"
    : "flex flex-1 justify-end";

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

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <header className="sticky top-0 z-40 border-b border-emerald-100/80 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2.5 px-2.5 py-2.5 sm:flex-nowrap sm:gap-3 sm:px-4 sm:py-3">
            <div className="shrink-0">
              <BrandLogo href={homeHref} />
            </div>
            <nav className={`flex ${navClass}`}>
              <div className="flex w-full flex-wrap items-center gap-1 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-1 sm:w-auto sm:min-w-max sm:flex-nowrap sm:rounded-full">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} className={navLinkClass}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
            {user && (
              <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-100 bg-white/90 px-1 py-1 shadow-sm sm:gap-2 sm:px-1.5">
                {user.role === "user" && (
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50">
                    <AvatarIcon iconId={userAvatar} className="h-5 w-5 text-emerald-700" />
                  </span>
                )}
                <form action="/api/auth/logout" method="post">
                  <button className="btn rounded-full border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-emerald-50 sm:px-3 sm:text-sm" type="submit">
                    Logout
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">{children}</main>
      </body>
    </html>
  );
}
