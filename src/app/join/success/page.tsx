import { Suspense } from "react";

import { AuthShell } from "@/components/auth-shell";
import { JoinSuccessClient } from "@/components/join-success-client";
import { getDefaultTenantSlug } from "@/lib/membership-provision";
import { getTenantBrand } from "@/lib/tenant-branding";

export default async function JoinSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  const params = await searchParams;
  const tenantSlug = params.tenant ?? (await getDefaultTenantSlug());
  const brand = await getTenantBrand(tenantSlug);

  return (
    <AuthShell brand={brand}>
      <Suspense
        fallback={
          <p className="text-center text-sm text-muted-foreground">
            Loading...
          </p>
        }
      >
        <JoinSuccessClient />
      </Suspense>
    </AuthShell>
  );
}
