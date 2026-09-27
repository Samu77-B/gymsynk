import { redirect } from "next/navigation";

import { MemberGuideList } from "@/components/member-guide-list";
import { getSession } from "@/lib/auth";

export default async function MemberWorkoutsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workouts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Session ideas from your gym.
        </p>
      </div>
      <MemberGuideList
        tenantId={session.tenantId}
        kind="workout"
        empty="Your gym has not published any workout ideas yet."
      />
    </div>
  );
}
