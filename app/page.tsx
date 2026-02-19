import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  redirect(user.role === "admin" ? "/admin/dashboard" : user.role === "trainer" ? "/trainer/dashboard" : "/app/today");
}
