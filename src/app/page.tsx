import Link from "next/link";

import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();

  return (
    <>
      <AppNav />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">GymSynk</h1>
          <p className="text-muted-foreground">
            Multi-tenant gym and class management — MVP foundation.
          </p>
        </div>

        {session ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Weekly class calendar, trainers, and fill rates.
                </p>
                <Button render={<Link href="/admin/schedule" />}>
                  Open schedule
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Staff roster</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Allocate trainer and staff shifts.
                </p>
                <Button render={<Link href="/admin/roster" />}>
                  Manage roster
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Member booking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Mobile-first class booking portal.
                </p>
                <Button render={<Link href="/member/book" />}>
                  Book a class
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Get started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect Neon, run migrations, seed demo data, then log in.
              </p>
              <Button render={<Link href="/login" />}>Log in</Button>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
