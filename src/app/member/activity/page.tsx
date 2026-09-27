import { redirect } from "next/navigation";

import { MemberVisitMedals } from "@/components/member-visit-medals";
import { getSession } from "@/lib/auth";
import { countMemberVisitDays } from "@/lib/check-ins";
import { getTenantFeatures } from "@/lib/tenant-features";

export default async function MemberActivityPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const features = await getTenantFeatures(session.tenantSlug);

  if (!features?.doorEntry) {
    redirect("/");
  }

  const visitDays = await countMemberVisitDays(session.tenantId, session.userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Medals for days you were let in. A second scan on the same day does
          not add another visit.
        </p>
      </div>
      <MemberVisitMedals visitDays={visitDays} />
    </div>
  );
}
