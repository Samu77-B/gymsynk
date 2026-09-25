import { format } from "date-fns";
import { NextResponse } from "next/server";

import {
  forbiddenResponse,
  requireSession,
  unauthorizedResponse,
} from "@/lib/auth";
import { listRecentCheckIns } from "@/lib/check-ins";
import {
  doorEntryDisabledResponse,
  isDoorEntryEnabled,
} from "@/lib/door-entry-feature";
import { canScanDoorAccess } from "@/lib/gym-access";

export async function GET() {
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

  const rows = await listRecentCheckIns(session.tenantId);

  return NextResponse.json({
    checkIns: rows.map((row) => ({
      id: row.id,
      result: row.result,
      denialReason: row.denialReason,
      createdAt: row.createdAt,
      createdAtLabel: row.createdAt
        ? format(row.createdAt, "d MMM yyyy, HH:mm")
        : null,
      member: row.user
        ? {
            id: row.user.id,
            fullName: row.user.fullName,
            email: row.user.email,
            role: row.user.role,
          }
        : null,
      scannedBy: row.scannedBy
        ? { id: row.scannedBy.id, fullName: row.scannedBy.fullName }
        : null,
    })),
  });
}
