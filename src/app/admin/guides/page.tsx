import { redirect } from "next/navigation";

import { AdminGuidesEditor } from "@/components/admin-guides-editor";
import { canManageStaff, getSession } from "@/lib/auth";

export default async function AdminGuidesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!canManageStaff(session.role)) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Member guides</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Workout and meal ideas for people who have joined. They show on the
          Workouts and Nutrition tabs in the member app.
        </p>
      </div>
      <AdminGuidesEditor />
    </div>
  );
}
