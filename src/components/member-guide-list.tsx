import { and, desc, eq } from "drizzle-orm";

import { GuideMedia } from "@/components/guide-media";
import { getDb } from "@/db";
import { gymGuides } from "@/db/schema";

export async function MemberGuideList({
  tenantId,
  kind,
  empty,
}: {
  tenantId: string;
  kind: "workout" | "nutrition";
  empty: string;
}) {
  const guides = await getDb().query.gymGuides.findMany({
    where: and(eq(gymGuides.tenantId, tenantId), eq(gymGuides.kind, kind)),
    orderBy: [desc(gymGuides.createdAt)],
    columns: {
      id: true,
      title: true,
      body: true,
      mediaUrl: true,
      mediaType: true,
    },
  });

  if (guides.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <ul className="space-y-4">
      {guides.map((guide) => (
        <li key={guide.id} className="rounded-xl border border-border/60 p-4">
          <h2 className="font-semibold">{guide.title}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {guide.body}
          </p>
          <GuideMedia
            url={guide.mediaUrl}
            type={guide.mediaType}
            title={guide.title}
          />
        </li>
      ))}
    </ul>
  );
}
