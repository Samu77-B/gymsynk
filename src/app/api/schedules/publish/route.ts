import { NextResponse } from "next/server";

import {
  canPublishSchedule,
  forbiddenResponse,
  requireSession,
  unauthorizedResponse,
} from "@/lib/auth";
import { publishTenantSchedule } from "@/lib/schedule-publish";

function appUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}

export async function POST() {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canPublishSchedule(session.role)) {
    return forbiddenResponse();
  }

  const result = await publishTenantSchedule({
    tenantId: session.tenantId,
    tenantSlug: session.tenantSlug,
    appUrl: appUrl(),
  });

  return NextResponse.json({
    ok: true,
    message: "Schedule published to your website feed.",
    ...result,
  });
}
