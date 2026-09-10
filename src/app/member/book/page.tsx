import { redirect } from "next/navigation";

import { MemberBookingView } from "@/components/member-booking-view";
import { getSession } from "@/lib/auth";
import { getTenantFeatures } from "@/lib/tenant-features";

export default async function MemberBookPage() {
  const session = await getSession();
  const features = await getTenantFeatures(session!.tenantSlug);

  if (!features?.classBooking) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Book a class</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upcoming sessions at {session!.tenantSlug}
        </p>
      </div>
      <MemberBookingView />
    </div>
  );
}
