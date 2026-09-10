import type { TenantBrand } from "@/lib/tenant-branding";

export function TenantBrandStyles({ brand }: { brand: TenantBrand }) {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          :root, .dark {
            --brand: ${brand.primaryColor};
            --brand-foreground: #ffffff;
            --brand-highlight: color-mix(in srgb, ${brand.primaryColor} 45%, #ffffff 55%);
            --brand-subtle: color-mix(in srgb, ${brand.primaryColor} 18%, transparent);
            --nav-active-bg: color-mix(in srgb, ${brand.primaryColor} 22%, var(--sidebar) 78%);
            --nav-active-border: color-mix(in srgb, ${brand.primaryColor} 55%, #ffffff 45%);
            --primary: ${brand.primaryColor};
            --primary-foreground: #ffffff;
            --sidebar-primary: ${brand.primaryColor};
            --sidebar-primary-foreground: #ffffff;
            --ring: color-mix(in srgb, ${brand.primaryColor} 40%, transparent);
          }
        `,
      }}
    />
  );
}
