import type { TenantFeatures } from "@/lib/tenant-features";

export type MemberAppTab = {
  href: "/member/book" | "/member/access" | "/member/membership";
  label: "Bookings" | "Gym pass" | "Account";
};

/** Tabs a joined member sees. Order matches the phone bar. */
export function memberAppTabs(features: TenantFeatures): MemberAppTab[] {
  const tabs: MemberAppTab[] = [];

  if (features.classBooking) {
    tabs.push({ href: "/member/book", label: "Bookings" });
  }

  if (features.doorEntry) {
    tabs.push({ href: "/member/access", label: "Gym pass" });
  }

  if (features.memberships) {
    tabs.push({ href: "/member/membership", label: "Account" });
  }

  return tabs;
}

export function memberAppHref(features: TenantFeatures) {
  return memberAppTabs(features)[0]?.href ?? null;
}
