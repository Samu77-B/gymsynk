import { Suspense } from "react";

import { AppNav } from "@/components/app-nav";
import { JoinSuccessClient } from "@/components/join-success-client";

export default function JoinSuccessPage() {
  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <Suspense
          fallback={
            <p className="text-center text-sm text-muted-foreground">
              Loading...
            </p>
          }
        >
          <JoinSuccessClient />
        </Suspense>
      </main>
    </>
  );
}
