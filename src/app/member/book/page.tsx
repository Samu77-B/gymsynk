import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { MemberBookingView } from "@/components/member-booking-view";
import { getSession } from "@/lib/auth";

export default async function MemberBookPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Book a class</h1>
          <p className="text-sm text-muted-foreground">
            Upcoming sessions at {session.tenantSlug}
          </p>
        </div>
        <MemberBookingView />
      </main>
    </>
  );
}
