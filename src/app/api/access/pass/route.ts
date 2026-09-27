import { NextResponse } from "next/server";

import {
  createAccessQrToken,
  formatAccessQrPayload,
} from "@/lib/access-qr";
import { requireSession, unauthorizedResponse } from "@/lib/auth";
import { isDoorEntryEnabled, doorEntryDisabledResponse } from "@/lib/door-entry-feature";
import { evaluateGymAccess } from "@/lib/gym-access";
import { ensureMemberNumber } from "@/lib/member-number";

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
  const memberNumber = await ensureMemberNumber(
    session.tenantId,
    session.userId,
  );

  return NextResponse.json({
    qrValue: formatAccessQrPayload(token),
    fullName: session.fullName,
    memberNumber,
    accessPreview: access,
  });
}
