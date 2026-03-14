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
  const navLinkClass = "inline-flex items-center rounded-full px-3 py-1.5 text-sm text-zinc-700 hover:bg-emerald-50 hover:text-emerald-800";
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <header className="sticky top-0 z-40 border-b border-emerald-100/80 bg-white/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-4">
            <BrandLogo href={homeHref} />
            <nav className="flex w-full flex-wrap items-center justify-start gap-1 text-sm sm:w-auto sm:justify-end sm:gap-2">
              {user?.role === "user" && (
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-lg">
                  <AvatarIcon iconId={userAvatar} className="h-5 w-5 text-emerald-700" />
                </span>
              )}
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
                  {userOnboarded ? (
                    <>
                      <Link href="/app/today" className={navLinkClass}>Today</Link>
                      <Link href="/app/plan" className={navLinkClass}>Full Plan</Link>
                      <Link href="/app/progress" className={navLinkClass}>Progress</Link>
                      <Link href="/app/profile" className={navLinkClass}>Profile</Link>
                    </>
                  ) : (
                    <Link href="/app/onboarding" className={navLinkClass}>Onboarding</Link>
                  )}
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
