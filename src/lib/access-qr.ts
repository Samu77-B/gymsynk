import { SignJWT, jwtVerify } from "jose";

const ACCESS_QR_PREFIX = "GYMSYNK:";
const ACCESS_QR_ISSUER = "gymsynk-access";

function getAccessSecret() {
  const secret =
    process.env.ACCESS_QR_SECRET?.trim() ?? process.env.AUTH_SECRET?.trim();

  if (!secret) {
    throw new Error("ACCESS_QR_SECRET or AUTH_SECRET is not set");
  }

  return new TextEncoder().encode(secret);
}

export function formatAccessQrPayload(token: string) {
  return `${ACCESS_QR_PREFIX}${token}`;
}

export function parseAccessQrPayload(raw: string) {
  const trimmed = raw.trim();

  if (trimmed.startsWith(ACCESS_QR_PREFIX)) {
    return trimmed.slice(ACCESS_QR_PREFIX.length);
  }

  return trimmed;
}

export async function createAccessQrToken(userId: string, tenantId: string) {
  return new SignJWT({ userId, tenantId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ACCESS_QR_ISSUER)
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(getAccessSecret());
}

export async function verifyAccessQrToken(token: string) {
  const { payload } = await jwtVerify(token, getAccessSecret(), {
    issuer: ACCESS_QR_ISSUER,
  });

  const userId = payload.userId;
  const tenantId = payload.tenantId;

  if (typeof userId !== "string" || typeof tenantId !== "string") {
    throw new Error("Invalid access QR payload");
  }

  return { userId, tenantId };
}
