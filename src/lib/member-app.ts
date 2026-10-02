import type { BillingModel } from "@/lib/tenant-billing";
import type { TenantFeatures } from "@/lib/tenant-features";

export type MemberAppTab = {
  href:
    | "/member/book"
    | "/member/workouts"
    | "/member/nutrition"
    | "/member/access"
    | "/member/activity"
    | "/member/membership"
    | "/member/credits";
  label:
    | "Bookings"
    | "Workouts"
    | "Nutrition"
    | "Gym pass"
    | "Activity"
    | "Account"
    | "Credits";
};

/** Tabs a joined member sees. Order matches the bar under the gym name. */
export function memberAppTabs(
  features: TenantFeatures,
  billingModel: BillingModel = "membership_only",
): MemberAppTab[] {
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

  if (features.sessionPacks && billingModel !== "membership_only") {
    tabs.push({ href: "/member/credits", label: "Credits" });
  }

  if (features.memberships) {
    tabs.push({ href: "/member/membership", label: "Account" });
  }

  return tabs;
}

export function memberAppHref(
  features: TenantFeatures,
  billingModel: BillingModel = "membership_only",
) {
  return memberAppTabs(features, billingModel)[0]?.href ?? null;
}
