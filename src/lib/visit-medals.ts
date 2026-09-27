export const VISIT_MEDALS = [1, 2, 5, 10, 25, 50, 75, 100, 150] as const;

export type VisitMedalThreshold = (typeof VISIT_MEDALS)[number];

export function visitMedalStates(visitDays: number) {
  const next = VISIT_MEDALS.find((threshold) => visitDays < threshold) ?? null;

  return {
    visitDays,
    next,
    medals: VISIT_MEDALS.map((threshold) => ({
      threshold,
      earned: visitDays >= threshold,
    })),
  };
}
