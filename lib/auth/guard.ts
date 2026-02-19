import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { Role, SessionUser } from "@/types";

export async function requireUser(expectedRole?: Role): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  if (expectedRole && user.role !== expectedRole) {
    redirect(
      user.role === "admin" ? "/admin/dashboard" : user.role === "trainer" ? "/trainer/dashboard" : "/app/today"
    );
  }

  return user;
}
