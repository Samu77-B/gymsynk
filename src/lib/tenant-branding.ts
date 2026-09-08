import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { tenants } from "@/db/schema";

/** GymSynk platform default — gyms override via tenant settings. */
export const GYMSYNK_PRIMARY = "#E60000";

export type TenantBrand = {
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
};

/** Fallback branding when DB fields are empty (per-slug presets). */
const SLUG_PRESETS: Record<string, Partial<Pick<TenantBrand, "primaryColor">>> = {
  reset: { primaryColor: "#111111" },
};

export async function getTenantBrand(slug: string): Promise<TenantBrand> {
  const tenant = await getDb().query.tenants.findFirst({
    where: eq(tenants.slug, slug),
    columns: {
      name: true,
      slug: true,
      logoUrl: true,
      primaryColor: true,
    },
  });

  if (!tenant) {
    return {
      name: slug,
      slug,
      logoUrl: null,
      primaryColor: SLUG_PRESETS[slug]?.primaryColor ?? GYMSYNK_PRIMARY,
    };
  }

  const preset = SLUG_PRESETS[slug];

  return {
    name: tenant.name,
    slug: tenant.slug,
    logoUrl: tenant.logoUrl,
    primaryColor:
      tenant.primaryColor ??
      preset?.primaryColor ??
      GYMSYNK_PRIMARY,
  };
}
