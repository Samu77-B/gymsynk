import { NextResponse } from "next/server";

import {
  isSmartSynkRequest,
  smartSynkUnauthorized,
} from "@/lib/smartsynk-admin";

export async function GET(request: Request) {
  if (!isSmartSynkRequest(request)) {
    return smartSynkUnauthorized();
  }

  return NextResponse.json({ ok: true, service: "gymsynk" });
}
