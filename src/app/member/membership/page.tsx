import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { MembershipView } from "@/components/membership-view";
import { getSession } from "@/lib/auth";

export default async function MemberMembershipPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold">Your membership</h1>
          <p className="text-sm text-muted-foreground">
            Manage your plan and add family members where your plan allows.
          </p>
        </div>
        <MembershipView />
      </main>
    </>
  );
}
