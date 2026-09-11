import type { TenantFeatures } from "@/lib/tenant-features";

export type TenantWebsiteSettings = {
  websiteUrl: string | null;
  externalBookUrl: string | null;
};

export type TenantEmbedUrls = {
  scheduleApi: string;
  embedPage: string;
  iframeSnippet: string;
  scriptSnippet: string;
  packagesApi: string;
  packagesEmbedPage: string;
  packagesIframeSnippet: string;
};

function normalizeUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function resolvePublicBookUrl(options: {
  appUrl: string;
  tenantSlug: string;
  features: TenantFeatures;
  externalBookUrl?: string | null;
}) {
  const external = normalizeUrl(options.externalBookUrl);
  if (external) {
    return external;
  }

  const base = options.appUrl.replace(/\/$/, "");

  if (options.features.memberships) {
    return `${base}/join?tenant=${encodeURIComponent(options.tenantSlug)}`;
  }

  if (options.features.classBooking) {
    const redirect = encodeURIComponent("/member/book");
    return `${base}/login?tenant=${encodeURIComponent(options.tenantSlug)}&redirect=${redirect}`;
  }

  return null;
}

export function buildTenantEmbedUrls(
  appUrl: string,
  tenantSlug: string,
  options?: { theme?: string; mountId?: string },
) {
  const base = appUrl.replace(/\/$/, "");
  const theme = options?.theme ?? "reset";
  const mountId = options?.mountId ?? `${tenantSlug}-schedule`;
  const embedPage = `${base}/embed/${tenantSlug}/schedule?theme=${theme}`;
  const scheduleApi = `${base}/api/public/${tenantSlug}/schedule`;
  const packagesEmbedPage = `${base}/embed/${tenantSlug}/packages?theme=${theme}`;
  const packagesApi = `${base}/api/public/${tenantSlug}/packages`;

  const iframeSnippet = `<iframe
  src="${embedPage}"
  title="${tenantSlug} class schedule"
  width="100%"
  height="720"
  style="border:0;background:transparent;"
  loading="lazy"
></iframe>`;

  const scriptSnippet = `<div id="${mountId}"></div>
<script
  src="${base}/embed/schedule.js"
  data-tenant="${tenantSlug}"
  data-theme="${theme}"
  data-target="${mountId}"
  data-api-base="${base}"
></script>`;

  const packagesIframeSnippet = `<iframe
  src="${packagesEmbedPage}"
  title="${tenantSlug} group training packages"
  width="100%"
  height="900"
  style="border:0;background:transparent;"
  loading="lazy"
></iframe>`;

  return {
    scheduleApi,
    embedPage,
    iframeSnippet,
    scriptSnippet,
    packagesApi,
    packagesEmbedPage,
    packagesIframeSnippet,
  } satisfies TenantEmbedUrls;
}

export function contrastTextColor(hexColor: string) {
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6) {
    return "#ffffff";
  }

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.55 ? "#111111" : "#ffffff";
}
