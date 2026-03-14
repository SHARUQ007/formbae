import { SectionTitle } from "@/components/SectionTitle";
import { getSessionUser } from "@/lib/auth/session";
import { getProfileForUser, isProfileOnboardingComplete } from "@/lib/services/profile-onboarding";
import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getSessionUser();
  if (session) {
    if (session.role === "user") {
      const profile = await getProfileForUser(session.userId);
      redirect(isProfileOnboardingComplete(profile) ? "/app/today" : "/app/onboarding");
    }
    redirect(session.role === "admin" ? "/admin/dashboard" : "/trainer/dashboard");
  }

  const params = await searchParams;
  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <SectionTitle title="Login" />
      {params.error === "mobile_required" && (
        <p className="alert-error">Please enter a valid mobile number.</p>
      )}
      <form action="/api/auth/login" method="post" className="surface space-y-3 p-4">
        <label>Mobile Number</label>
        <input name="mobile" placeholder="e.g. 9999999999" required />
        <button className="btn btn-primary w-full" type="submit">
          Continue
        </button>
        <a className="block text-center text-sm text-emerald-700 underline" href="/request-access">
          Request access
        </a>
      </form>
    </div>
  );
}
