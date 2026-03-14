import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getProfileForUser, isProfileOnboardingComplete } from "@/lib/services/profile-onboarding";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "user") {
    const profile = await getProfileForUser(user.userId);
    redirect(isProfileOnboardingComplete(profile) ? "/app/today" : "/app/onboarding");
  }
  redirect(user.role === "admin" ? "/admin/dashboard" : "/trainer/dashboard");
}
