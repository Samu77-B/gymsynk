import type { TenantFeatures } from "@/lib/tenant-features";

export type MemberAppTab = {
  href:
    | "/member/book"
    | "/member/workouts"
    | "/member/nutrition"
    | "/member/access"
    | "/member/activity"
    | "/member/membership";
  label:
    | "Bookings"
    | "Workouts"
    | "Nutrition"
    | "Gym pass"
    | "Activity"
    | "Account";
};

/** Tabs a joined member sees. Order matches the bar under the gym name. */
export function memberAppTabs(features: TenantFeatures): MemberAppTab[] {
  const tabs: MemberAppTab[] = [];

  if (features.classBooking) {
    tabs.push({ href: "/member/book", label: "Bookings" });
  }

  tabs.push({ href: "/member/workouts", label: "Workouts" });
  tabs.push({ href: "/member/nutrition", label: "Nutrition" });

  if (features.doorEntry) {
    tabs.push({ href: "/member/access", label: "Gym pass" });
    tabs.push({ href: "/member/activity", label: "Activity" });
  }

  if (features.memberships) {
    tabs.push({ href: "/member/membership", label: "Account" });
  }

  return tabs;
}

export function memberAppHref(features: TenantFeatures) {
  return memberAppTabs(features)[0]?.href ?? null;
}
