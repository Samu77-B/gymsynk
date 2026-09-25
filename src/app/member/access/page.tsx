import { redirect } from "next/navigation";

import { MemberAccessPass } from "@/components/member-access-pass";
import { getSession } from "@/lib/auth";
import { getTenantFeatures } from "@/lib/tenant-features";

export default async function MemberAccessPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const features = await getTenantFeatures(session.tenantSlug);

  if (!features?.doorEntry) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gym pass</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your QR code for door entry and reception check-in.
        </p>
      </div>
      <MemberAccessPass />
    </div>
  );
}
