import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { classes, trainingPackOptions, trainingTiers } from "@/db/schema";

export type ResetTierSeed = {
  slug: string;
  name: string;
  subtitle?: string;
  pricePerClass: string;
  sortOrder: number;
  classTitles: string[];
  packs: Array<{
    label: string;
    price: string;
    sessionCount?: number;
    isPayAsYouGo?: boolean;
    note?: string;
    sortOrder: number;
  }>;
};

export const RESET_GROUP_TRAINING: ResetTierSeed[] = [
  {
    slug: "tier-1",
    name: "Tier 1",
    pricePerClass: "10.00",
    sortOrder: 1,
    classTitles: [
      "Full Body Strength",
      "Full Body Conditioning",
      "Woman Only Training",
      "Mummy Fit",
    ],
    packs: [
      {
        label: "Pay As You Go",
        price: "15.00",
        isPayAsYouGo: true,
        sortOrder: 1,
      },
      {
        label: "4 Sessions / Month",
        price: "40.00",
        sessionCount: 4,
        note: "Good for 1x a week",
        sortOrder: 2,
      },
      {
        label: "8 Sessions / Month",
        price: "60.00",
        sessionCount: 8,
        note: "Good for 2x a week",
        sortOrder: 3,
      },
      {
        label: "12 Sessions / Month",
        price: "100.00",
        sessionCount: 12,
        note: "Good for 3x a week",
        sortOrder: 4,
      },
      {
        label: "16 Sessions / Month",
        price: "130.00",
        sessionCount: 16,
        note: "Recommended addition for 4x a week classes like Woman Only",
        sortOrder: 5,
      },
    ],
  },
  {
    slug: "tier-2",
    name: "Tier 2",
    pricePerClass: "15.00",
    sortOrder: 2,
    classTitles: [
      "Legs & Glutes",
      "Reset Bootcamp",
      "Mobility and Recovery",
      "Sound Healing",
    ],
    packs: [
      {
        label: "Pay As You Go",
        price: "20.00",
        isPayAsYouGo: true,
        sortOrder: 1,
      },
      {
        label: "4 Sessions / Month",
        price: "60.00",
        sessionCount: 4,
        sortOrder: 2,
      },
      {
        label: "8 Sessions / Month",
        price: "100.00",
        sessionCount: 8,
        sortOrder: 3,
      },
      {
        label: "12 Sessions / Month",
        price: "160.00",
        sessionCount: 12,
        sortOrder: 4,
      },
    ],
  },
  {
    slug: "tier-3",
    name: "Tier 3",
    subtitle: "Hyrox Training",
    pricePerClass: "15.00",
    sortOrder: 3,
    classTitles: ["Hyrox Training"],
    packs: [
      {
        label: "Pay As You Go",
        price: "25.00",
        isPayAsYouGo: true,
        sortOrder: 1,
      },
      {
        label: "4 Sessions / Month",
        price: "80.00",
        sessionCount: 4,
        note: "1x a week",
        sortOrder: 2,
      },
      {
        label: "8 Sessions / Month",
        price: "120.00",
        sessionCount: 8,
        note: "2x a week",
        sortOrder: 3,
      },
      {
        label: "12 Sessions / Month",
        price: "220.00",
        sessionCount: 12,
        note: "3x a week",
        sortOrder: 4,
      },
      {
        label: "16 Sessions / Month",
        price: "280.00",
        sessionCount: 16,
        note: "4x a week — full weekly Hyrox schedule",
        sortOrder: 5,
      },
    ],
  },
];

export async function seedResetGroupTraining(
  tenantId: string,
  classIdByTitle: Map<string, string>,
) {
  const db = getDb();

  const existing = await db.query.trainingTiers.findFirst({
    where: eq(trainingTiers.tenantId, tenantId),
  });

  if (existing) {
    return { skipped: true as const };
  }

  for (const tierSeed of RESET_GROUP_TRAINING) {
    const [tier] = await db
      .insert(trainingTiers)
      .values({
        tenantId,
        slug: tierSeed.slug,
        name: tierSeed.name,
        subtitle: tierSeed.subtitle ?? null,
        pricePerClass: tierSeed.pricePerClass,
        sortOrder: tierSeed.sortOrder,
      })
      .returning();

    await db.insert(trainingPackOptions).values(
      tierSeed.packs.map((pack) => ({
        tenantId,
        tierId: tier.id,
        label: pack.label,
        sessionCount: pack.sessionCount ?? null,
        price: pack.price,
        isPayAsYouGo: pack.isPayAsYouGo ?? false,
        note: pack.note ?? null,
        sortOrder: pack.sortOrder,
      })),
    );

    for (const title of tierSeed.classTitles) {
      const classId = classIdByTitle.get(title);
      if (!classId) {
        continue;
      }

      await db
        .update(classes)
        .set({ trainingTierId: tier.id })
        .where(eq(classes.id, classId));
    }
  }

  return { skipped: false as const };
}
