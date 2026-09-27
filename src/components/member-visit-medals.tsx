import { cn } from "@/lib/utils";
import { visitMedalStates } from "@/lib/visit-medals";

function Medal({
  threshold,
  earned,
}: {
  threshold: number;
  earned: boolean;
}) {
  const label = threshold === 1 ? "1 visit" : `${threshold} visits`;

  return (
    <figure className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "relative flex h-24 w-[4.5rem] items-center justify-center",
          earned ? "text-brand" : "text-muted-foreground/45",
        )}
      >
        <svg viewBox="0 0 72 88" className="absolute inset-0 h-full w-full" aria-hidden>
          <path
            d="M6 6h60v42c0 20-30 32-30 32S6 68 6 48V6z"
            fill="currentColor"
            fillOpacity={earned ? 0.16 : 0.08}
            stroke="currentColor"
            strokeWidth="2.5"
          />
        </svg>
        <span className="relative text-xl font-bold tracking-tight">{threshold}</span>
      </div>
      <figcaption className="text-center text-xs text-muted-foreground">{label}</figcaption>
    </figure>
  );
}

export function MemberVisitMedals({ visitDays }: { visitDays: number }) {
  const { next, medals } = visitMedalStates(visitDays);
  const remaining = next === null ? 0 : next - visitDays;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Number of visits</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {visitDays === 0
            ? "Scan in at reception. Your first visit lights the first medal."
            : next === null
              ? `${visitDays} ${visitDays === 1 ? "visit" : "visits"}. You've collected every medal.`
              : `${visitDays} ${visitDays === 1 ? "visit" : "visits"}. ${remaining} more ${remaining === 1 ? "visit" : "visits"} to reach ${next}.`}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-x-2 gap-y-6">
        {medals.map((medal) => (
          <Medal
            key={medal.threshold}
            threshold={medal.threshold}
            earned={medal.earned}
          />
        ))}
      </div>
    </section>
  );
}
