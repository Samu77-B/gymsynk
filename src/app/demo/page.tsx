import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  Code2,
  LayoutDashboard,
  ScanLine,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

import { CopySnippet } from "@/components/marketing/copy-snippet";
import {
  MarketingFooter,
  MarketingHeader,
} from "@/components/marketing/site-chrome";
import { Button } from "@/components/ui/button";
import { demoShots, loadDemoMedia } from "@/lib/demo-media";
import { buildTenantEmbedUrls } from "@/lib/tenant-website";

export const metadata: Metadata = {
  title: "Demo gym — GymSynk",
  description:
    "See the GymSynk dashboard, then how the same timetable embeds on a gym’s existing website.",
};

const shotIcons: Record<(typeof demoShots)[number]["stem"], LucideIcon> = {
  dashboard: LayoutDashboard,
  members: Users,
  schedule: CalendarDays,
  roster: ClipboardList,
  "door-entry": ScanLine,
  settings: Settings,
};

const steps = [
  {
    title: "Keep the gym’s website",
    detail:
      "GymSynk does not replace the public site. The gym keeps its pages, and GymSynk supplies the live timetable.",
  },
  {
    title: "Build it in the dashboard",
    detail:
      "Staff publish classes, packs, and branding in GymSynk. That is the source the website reads.",
  },
  {
    title: "Paste one snippet",
    detail:
      "Settings → Website integration gives an iframe. Drop it into Squarespace, WordPress, or any page builder.",
  },
];

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
      {children}
    </p>
  );
}

function Shot({
  title,
  caption,
  src,
  icon: Icon,
}: {
  title: string;
  caption: string;
  src: string | null;
  icon: LucideIcon;
}) {
  return (
    <figure className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
        <span className="size-2 rounded-full bg-brand" />
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
      </div>
      {src ? (
        <Image
          src={src}
          alt={title}
          width={1600}
          height={1000}
          unoptimized={src.toLowerCase().endsWith(".gif")}
          className="h-auto w-full"
          sizes="(min-width: 1024px) 540px, 100vw"
        />
      ) : (
        <div className="flex aspect-[16/10] flex-col items-center justify-center gap-3 bg-muted/20 px-6 text-center">
          <Icon className="size-8 text-brand" />
          <p className="text-sm font-medium">{title}</p>
        </div>
      )}
      <figcaption className="px-4 py-3 text-sm leading-relaxed text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}

export default function DemoPage() {
  const media = loadDemoMedia();
  const embed = buildTenantEmbedUrls(
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://gymsynk.net",
    "reset",
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <MarketingHeader current="demo" />

      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionEyebrow>Demo gym</SectionEyebrow>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold uppercase leading-[1.05] tracking-tight sm:text-5xl">
            The dashboard, then the same system on a gym’s own site
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Reset is the live GymSynk demo. Owners run members, classes, and the
            door from the dashboard. Visitors still use the gym’s website — the
            timetable is embedded on that page.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              nativeButton={false}
              size="lg"
              className="bg-brand text-brand-foreground hover:bg-brand/90"
              render={<a href="#walkthrough" />}
            >
              Watch the walkthrough
            </Button>
            <Button
              nativeButton={false}
              size="lg"
              variant="outline"
              render={<Link href="/embed/reset/schedule" />}
            >
              Open the live schedule
            </Button>
          </div>
        </div>
      </section>

      <section
        id="walkthrough"
        className="scroll-mt-20 border-b border-border py-16 sm:py-20"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionEyebrow>Walkthrough</SectionEyebrow>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            A pass through the demo gym
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            From the owner dashboard to the timetable sitting on an existing
            website.
          </p>

          <div className="mt-10 overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg">
            {media.walkthrough && media.walkthroughIsVideo ? (
              <video
                className="aspect-video w-full bg-black"
                src={media.walkthrough}
                controls
                playsInline
                muted
                loop
                preload="metadata"
              >
                Your browser cannot play this video.
              </video>
            ) : media.walkthrough ? (
              // GIF walkthroughs need a plain image so the animation is preserved.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={media.walkthrough}
                alt="Walkthrough of the GymSynk demo gym"
                className="h-auto w-full"
              />
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-muted/20 px-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-lg font-semibold text-brand">
                  ▶
                </span>
                <p className="max-w-md text-sm text-muted-foreground">
                  A short film of the owner dashboard and the timetable on the
                  gym’s website.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionEyebrow>Dashboard</SectionEyebrow>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            What the gym team sees
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            One menu for the people who run the gym. Some items only appear
            when that feature is switched on in Settings.
          </p>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {media.shots.map((shot) => (
              <Shot
                key={shot.stem}
                title={shot.title}
                caption={shot.caption}
                src={shot.src}
                icon={shotIcons[shot.stem]}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionEyebrow>Existing website</SectionEyebrow>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            The timetable stays on their site
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            The gym’s page keeps its own layout. GymSynk fills one region with
            the live schedule, styled to that gym, with a book button that goes
            to join or to the gym’s own booking link.
          </p>

          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-xl border border-border/60 bg-card p-6 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                  Step {index + 1}
                </p>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.detail}
                </p>
              </li>
            ))}
          </ol>

          <figure className="mt-10 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
            <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
              <span className="size-2 rounded-full bg-brand" />
              <span className="text-xs font-medium text-muted-foreground">
                On the gym’s website
              </span>
            </div>
            {media.website ? (
              <Image
                src={media.website}
                alt="GymSynk schedule embedded on an existing gym website"
                width={1600}
                height={1000}
                className="h-auto w-full"
                sizes="(min-width: 1024px) 1100px, 100vw"
              />
            ) : (
              <div className="flex aspect-[16/8] flex-col items-center justify-center gap-3 bg-muted/20 px-6 text-center">
                <Code2 className="size-8 text-brand" />
                <p className="max-w-md text-sm font-medium">On the gym’s website</p>
              </div>
            )}
            <figcaption className="px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              Same classes as the dashboard. The surrounding page belongs to
              the gym.
            </figcaption>
          </figure>

          <div className="mt-10 overflow-hidden rounded-xl border border-border/60 bg-background shadow-lg">
            <iframe
              src="/embed/reset/schedule"
              title="Reset class schedule embedded the way a gym website would show it"
              className="h-[520px] w-full border-0"
              loading="lazy"
            />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            This frame is the live Reset timetable — the same widget a gym
            pastes into their page.
          </p>

          <div className="mt-8">
            <CopySnippet code={embed.iframeSnippet} />
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Try the Reset demo
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Join as a member, or sign in to the dashboard and open Settings to
            copy the embed for a gym site.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              nativeButton={false}
              size="lg"
              className="bg-brand hover:bg-brand/90"
              render={<Link href="/join?tenant=reset" />}
            >
              Join Reset
            </Button>
            <Button
              nativeButton={false}
              size="lg"
              variant="outline"
              render={<Link href="/login" />}
            >
              Sign in
            </Button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
