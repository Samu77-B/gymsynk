import { NextResponse } from "next/server";

import { getPublicPackages } from "@/lib/public-packages";
import { publicCorsHeaders, withPublicCors } from "@/lib/public-cors";

type RouteContext = {
  params: Promise<{ tenant: string }>;
};

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

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: publicCorsHeaders(request),
  });
}

export async function GET(request: Request, context: RouteContext) {
  const { tenant } = await context.params;

  const payload = await getPublicPackages({
    tenantSlug: tenant,
    appUrl: appUrl(),
  });

  if (!payload) {
    return withPublicCors(
      request,
      NextResponse.json({ error: "Packages not available" }, { status: 404 }),
    );
  }

  return withPublicCors(request, NextResponse.json(payload));
}
