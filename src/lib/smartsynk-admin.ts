import { timingSafeEqual } from "node:crypto";

import { jsonError } from "@/lib/api";

function keysMatch(provided: string, expected: string) {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

/** Shared secret SmartSynk sends when listing or creating gyms. */
export function isSmartSynkRequest(request: Request) {
  const expected = process.env.SMARTSYNK_API_KEY?.trim();
  if (!expected) {
    return false;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
  const headerKey = request.headers.get("x-smartsynk-key")?.trim() ?? "";
  const provided = bearer || headerKey;

  if (!provided) {
    return false;
  }

  return keysMatch(provided, expected);
}

export function smartSynkUnauthorized() {
  if (!process.env.SMARTSYNK_API_KEY?.trim()) {
    return jsonError("GymSynk admin API is not configured", 503);
  }
  return jsonError("Unauthorized", 401);
}

export function gymPublicBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  return configured || "https://gymsynk.net";
}
