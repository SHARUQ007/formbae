import { NextResponse } from "next/server";
import { repo } from "@/lib/repo/sheets-repo";
import { uid } from "@/lib/sheets/base";
import { normalizeMobile } from "@/lib/utils/mobile";

export async function POST() {
  const users = await repo.readUsers();
  const hasAdmin = users.some((u) => normalizeMobile(u.mobile) === "10000000000");
  const hasTrainer = users.some((u) => normalizeMobile(u.mobile) === "10000000001");

  const admin = {
    userId: uid("usr"),
    role: "admin" as const,
    name: "System Admin",
    mobile: "10000000000",
    createdAt: new Date().toISOString(),
    trainerId: "",
    allowlistFlag: "enabled"
  };

  const trainer = {
    userId: uid("usr"),
    role: "trainer" as const,
    name: "Head Trainer",
    mobile: "10000000001",
    createdAt: new Date().toISOString(),
    trainerId: "",
    allowlistFlag: "enabled"
  };

  if (!hasAdmin) await repo.append("users", admin);
  if (!hasTrainer) await repo.append("users", trainer);

  return NextResponse.json({ ok: true, adminMobile: admin.mobile, trainerMobile: trainer.mobile });
}
