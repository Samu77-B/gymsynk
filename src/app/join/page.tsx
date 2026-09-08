import { Suspense } from "react";

import { AuthShell } from "@/components/auth-shell";
import { JoinForm } from "@/components/join-form";
import { getDefaultTenantSlug } from "@/lib/membership-provision";
import { getTenantBrand } from "@/lib/tenant-branding";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string; cancelled?: string }>;
}) {
  const params = await searchParams;
  const tenantSlug = params.tenant ?? (await getDefaultTenantSlug());
  const brand = await getTenantBrand(tenantSlug);

  return (
    <AuthShell brand={brand}>
      <JoinForm
        tenantSlug={tenantSlug}
        cancelled={params.cancelled === "1"}
      />
    </AuthShell>
  );
}
