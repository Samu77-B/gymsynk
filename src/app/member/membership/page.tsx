import { MembershipView } from "@/components/membership-view";

export default function MemberMembershipPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Your membership
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your plan and add family members where your plan allows.
        </p>
      </div>
      <MembershipView />
    </div>
  );
}
