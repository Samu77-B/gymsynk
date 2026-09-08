import type { TenantBrand } from "@/lib/tenant-branding";

export function TenantBrandStyles({ brand }: { brand: TenantBrand }) {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          :root, .dark {
            --brand: ${brand.primaryColor};
            --brand-foreground: #ffffff;
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
