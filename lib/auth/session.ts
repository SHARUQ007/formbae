import crypto from "crypto";
import { cookies } from "next/headers";
import { SessionUser } from "@/types";

const SESSION_COOKIE = "form_bae_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    throw new Error("SESSION_SECRET missing");
  }
  return s;
}

type SignedPayload = {
  data: SessionUser;
  exp: number;
  sig: string;
};

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

function encode(user: SessionUser): string {
  const payload = { data: user, exp: Date.now() + SESSION_TTL_MS };
  const serialized = JSON.stringify(payload);
  const sig = sign(serialized);
  const full: SignedPayload = { ...payload, sig };
  return Buffer.from(JSON.stringify(full)).toString("base64url");
}

function decode(token: string): SessionUser | null {
  try {
    const parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as SignedPayload;
    const { sig, ...rest } = parsed;
    const expected = sign(JSON.stringify(rest));
    if (expected !== sig || rest.exp < Date.now()) {
      return null;
    }
    return rest.data;
  } catch {
    return null;
  }
}

export async function setSession(user: SessionUser): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, encode(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decode(token);
}
