import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { tenants } from "@/db/schema";

export async function isDoorEntryEnabled(tenantId: string) {
  const tenant = await getDb().query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { featureDoorEntry: true },
  });

  return tenant?.featureDoorEntry ?? false;
}

export function doorEntryDisabledResponse() {
  return NextResponse.json(
    { error: "Door entry is not enabled for this gym." },
    { status: 403 },
  );
}
