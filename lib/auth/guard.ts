import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { Role, SessionUser } from "@/types";
import { getProfileForUser, isProfileOnboardingComplete } from "@/lib/services/profile-onboarding";

export async function requireUser(expectedRole?: Role, options?: { allowIncompleteProfile?: boolean }): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  if (expectedRole && user.role !== expectedRole) {
    redirect(
      user.role === "admin" ? "/admin/dashboard" : user.role === "trainer" ? "/trainer/dashboard" : "/app/today"
    );
  }

  if (
    user.role === "user" &&
    expectedRole === "user" &&
    !options?.allowIncompleteProfile
  ) {
    const profile = await getProfileForUser(user.userId);
    if (!isProfileOnboardingComplete(profile)) {
      redirect("/app/onboarding");
    }
  }

  return user;
}
