import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { parseAccessQrPayload, verifyAccessQrToken } from "@/lib/access-qr";
import { jsonError, parseJson } from "@/lib/api";
import {
  forbiddenResponse,
  requireSession,
  unauthorizedResponse,
} from "@/lib/auth";
import { recordCheckIn } from "@/lib/check-ins";
import {
  doorEntryDisabledResponse,
  isDoorEntryEnabled,
} from "@/lib/door-entry-feature";
import { canScanDoorAccess, evaluateGymAccess } from "@/lib/gym-access";
import { normalizeMemberNumber } from "@/lib/member-number";

const verifySchema = z.union([
  z.object({
    payload: z.string().min(10).max(4096),
  }),
  z.object({
    memberNumber: z.string().min(1).max(16),
  }),
]);

export async function POST(request: Request) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canScanDoorAccess(session.role)) {
    return forbiddenResponse();
  }

  if (!(await isDoorEntryEnabled(session.tenantId))) {
    return doorEntryDisabledResponse();
  }

  const parsed = parseJson(verifySchema, await request.json());

  if (!parsed.success) {
    return parsed.response;
  }

  let tokenUserId: string;
  let checkInMethod: "qr" | "member_number" = "qr";

  if ("memberNumber" in parsed.data) {
    const memberNumber = normalizeMemberNumber(parsed.data.memberNumber);

    if (!memberNumber) {
      return jsonError("Enter the 8-digit member number.", 400);
    }

    const matched = await getDb().query.users.findFirst({
      where: and(
        eq(users.tenantId, session.tenantId),
        eq(users.memberNumber, memberNumber),
      ),
      columns: { id: true },
    });

    if (!matched) {
      return jsonError("No one at this gym has that member number.", 404);
    }

    tokenUserId = matched.id;
    checkInMethod = "member_number";
  } else {
    try {
      const token = parseAccessQrPayload(parsed.data.payload);
      const verified = await verifyAccessQrToken(token);

      if (verified.tenantId !== session.tenantId) {
        return jsonError("This pass belongs to a different gym.", 400);
      }

      tokenUserId = verified.userId;
    } catch {
      return jsonError("Invalid or expired QR code.", 400);
    }
  }

  const member = await getDb().query.users.findFirst({
    where: eq(users.id, tokenUserId),
    columns: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  });

  if (!member) {
    return jsonError("Member not found.", 404);
  }

  const decision = await evaluateGymAccess(session.tenantId, tokenUserId);

  const checkIn = await recordCheckIn({
    tenantId: session.tenantId,
    userId: tokenUserId,
    allowed: decision.allowed,
    denialReason: decision.allowed ? undefined : decision.reason,
    scannedByUserId: session.userId,
    method: checkInMethod,
  });

  return NextResponse.json({
    allowed: decision.allowed,
    reason: decision.allowed ? null : decision.reason,
    member: {
      id: member.id,
      fullName: member.fullName,
      email: member.email,
      role: member.role,
    },
    checkInId: checkIn.id,
    scannedAt: checkIn.createdAt,
  });
}
