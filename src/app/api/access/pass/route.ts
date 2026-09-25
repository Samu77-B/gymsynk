import { NextResponse } from "next/server";

import {
  createAccessQrToken,
  formatAccessQrPayload,
} from "@/lib/access-qr";
import { requireSession, unauthorizedResponse } from "@/lib/auth";
import { isDoorEntryEnabled, doorEntryDisabledResponse } from "@/lib/door-entry-feature";
import { evaluateGymAccess } from "@/lib/gym-access";

export async function GET() {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!(await isDoorEntryEnabled(session.tenantId))) {
    return doorEntryDisabledResponse();
  }

  const access = await evaluateGymAccess(session.tenantId, session.userId);
  const token = await createAccessQrToken(session.userId, session.tenantId);

  return NextResponse.json({
    qrValue: formatAccessQrPayload(token),
    fullName: session.fullName,
    accessPreview: access,
  });
}
