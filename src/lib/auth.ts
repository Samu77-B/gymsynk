import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export type SessionUser = {
  userId: string;
  tenantId: string;
  role: "owner" | "admin" | "trainer" | "member";
  email: string;
  fullName: string;
  tenantSlug: string;
};

const SESSION_COOKIE = "gymsynk_session";

function getSecret() {
  const secret = process.env.AUTH_SECRET?.trim();

  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }

  return new TextEncoder().encode(secret);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as SessionUser;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  return session;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function canManageStaff(role: SessionUser["role"]) {
  return role === "owner" || role === "admin";
}

export function canManageSchedules(role: SessionUser["role"]) {
  return role === "owner" || role === "admin" || role === "trainer";
}

export function canPublishSchedule(role: SessionUser["role"]) {
  return role === "owner" || role === "admin";
}
