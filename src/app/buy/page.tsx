import { Suspense } from "react";

import { AuthShell } from "@/components/auth-shell";
import { BuyForm } from "@/components/buy-form";
import { getDefaultTenantSlug } from "@/lib/membership-provision";
import { getTenantBrand } from "@/lib/tenant-branding";

export default async function BuyPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string; cancelled?: string }>;
}) {
  const params = await searchParams;
  const tenantSlug = params.tenant ?? (await getDefaultTenantSlug());
  const brand = await getTenantBrand(tenantSlug);

  return (
    <AuthShell brand={brand}>
      <Suspense
        fallback={
          <p className="text-center text-sm text-muted-foreground">
            Loading…
          </p>
        }
      >
        <BuyForm
          tenantSlug={tenantSlug}
          cancelled={params.cancelled === "1"}
        />
      </Suspense>
    </AuthShell>
  );
}
