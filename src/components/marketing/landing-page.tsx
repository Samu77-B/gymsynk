import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Code2,
  CreditCard,
  LayoutDashboard,
  Palette,
  Users,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#embed", label: "Embed" },
];

const features = [
  {
    icon: LayoutDashboard,
    title: "Owner dashboard",
    description:
      "Members, revenue, check-ins, and class fill rates in one business overview.",
  },
  {
    icon: Users,
    title: "Members & staff",
    description:
      "Records, plans, rostering, and shift planning — built for gym teams.",
  },
  {
    icon: CreditCard,
    title: "Membership billing",
    description:
      "Stripe-powered plans and trials. Each gym connects their own account.",
  },
  {
    icon: Code2,
    title: "Embed anywhere",
    description:
      "Drop a schedule widget on any site. One timetable, many surfaces.",
  },
];

const highlights = [
  { label: "Multi-gym", detail: "Tenant-ready from day one" },
  { label: "Stripe", detail: "Checkout + webhooks" },
  { label: "Reset", detail: "Live demo gym seeded" },
  { label: "Schedule", detail: "Embeddable class widget" },
];

const plans = [
  {
    name: "GymSynk Standard",
    price: "£49",
    period: "/ month",
    description:
      "For independent gyms and studios getting members online and off paper.",
    features: [
      "Member records & class booking portal",
      "Weekly schedule & staff roster",
      "Embeddable schedule for your website",
      "Your logo and brand colours on every page",
      "Stripe membership billing on your account",
    ],
    cta: "Start with Standard",
    href: "/login",
    popular: false,
  },
  {
    name: "GymSynk Pro",
    price: "£89",
    period: "/ month",
    description:
      "For growing gyms with multiple trainers, locations, or higher member volume.",
    features: [
      "Everything in Standard",
      "Unlimited staff accounts",
      "Advanced reporting (coming soon)",
      "Priority support",
      "Multi-location ready architecture",
    ],
    cta: "Start with Pro",
    href: "/login",
    popular: true,
  },
];

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
      {children}
    </p>
  );
}

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/GymSynk-Logo02-B-Wht.png"
              alt="GymSynk"
              width={148}
              height={32}
              className="h-7 w-auto dark:invert-0 invert"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/join?tenant=reset"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Demo gym
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              render={<Link href="/login" />}
            >
              Sign in
            </Button>
            <Button size="sm" render={<Link href="/login" />}>
              Open dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-neutral-950 text-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(230,0,0,0.12),transparent_55%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-white/55">
            A Paradigm Studio product
          </p>
          <h1 className="max-w-3xl text-4xl font-bold uppercase leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Gym management that fits your brand
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
            Members, classes, staff, and billing — hosted or embedded. Each gym
            runs on their own Stripe credentials. White-label with your logo and
            colours; every page still says Powered by GymSynk.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="bg-brand text-brand-foreground hover:bg-brand/90"
              render={<Link href="/login" />}
            >
              Open dashboard
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              render={<Link href="/join?tenant=reset" />}
            >
              Explore Reset demo
            </Button>
          </div>
        </div>
      </section>

      {/* About / Features */}
      <section id="features" className="scroll-mt-20 border-b border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionEyebrow>About GymSynk</SectionEyebrow>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Run your gym in one place. Show your brand everywhere.
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Built for Paradigm Studio fitness merchants — alongside SmartSynk
            platforms such as{" "}
            <a
              href="https://www.paysynk.com/"
              className="font-medium text-foreground underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              PaySynk
            </a>
            .
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-brand/10">
                    <Icon className="size-5 text-brand" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="border-b border-border bg-muted/40 py-12">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {highlights.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-border/60 bg-background px-4 py-3"
            >
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 border-b border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionEyebrow>Pricing</SectionEyebrow>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple plans. Keep your payouts.
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            No GymSynk fees on member transactions — connect Stripe and get paid
            directly. Pick the tier that matches how you run your gym.
          </p>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={cn(
                  "relative flex flex-col rounded-xl border bg-card p-8 shadow-sm",
                  plan.popular
                    ? "border-brand ring-1 ring-brand/20"
                    : "border-border/60",
                )}
              >
                {plan.popular ? (
                  <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-0.5 text-xs font-semibold text-brand-foreground">
                    Most popular
                  </span>
                ) : null}
                <p className="text-sm font-medium text-muted-foreground">
                  {plan.popular ? "Tier 2" : "Tier 1"}
                </p>
                <h3 className="mt-1 text-xl font-semibold">{plan.name}</h3>
                <p className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {plan.period}
                  </span>
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {plan.description}
                </p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex gap-2 text-sm text-muted-foreground"
                    >
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className={cn(
                    "mt-8 w-full",
                    plan.popular && "bg-brand hover:bg-brand/90",
                  )}
                  variant={plan.popular ? "default" : "outline"}
                  render={<Link href={plan.href} />}
                >
                  {plan.cta}
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Embed */}
      <section id="embed" className="scroll-mt-20 border-b border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionEyebrow>Embed</SectionEyebrow>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Class schedule on any page
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Drop a snippet on WordPress, Webflow, Framer, or any site. One
            timetable from GymSynk — styled to match the gym&apos;s brand.
          </p>

          <div className="mt-10 overflow-hidden rounded-xl border border-border/60 bg-neutral-950 shadow-lg">
            <pre className="overflow-x-auto p-6 text-sm leading-relaxed text-neutral-300">
              <code>{`<!-- Weekly class schedule -->
<iframe
  src="https://gymsynk.net/embed/reset/schedule"
  title="Reset class schedule"
  style="width:100%;min-height:520px;border:0;border-radius:12px;"
  loading="lazy"
></iframe>

<!-- Or link members to join -->
<a href="https://gymsynk.net/join?tenant=reset">Join Reset</a>`}</code>
            </pre>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Live demo:{" "}
            <Link
              href="/embed/reset/schedule"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              /embed/reset/schedule
            </Link>
            {" · "}
            <Link
              href="/join?tenant=reset"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              /join?tenant=reset
            </Link>
          </p>
        </div>
      </section>

      {/* White-label note */}
      <section className="border-b border-border bg-muted/30 py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 sm:flex-row sm:items-center sm:px-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand/10">
            <Palette className="size-6 text-brand" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold tracking-tight">
              Your logo. Your colours. Our platform.
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Every gym gets a branded dashboard and member experience. Upload
              your logo, set your accent colour, and members see your gym — with
              a subtle Powered by GymSynk on every page.
            </p>
          </div>
          <Button variant="outline" render={<Link href="/login" />}>
            See the dashboard
          </Button>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-brand/10">
            <CalendarDays className="size-6 text-brand" />
          </div>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready to run your gym on GymSynk?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Browse the Reset demo gym, join as a member, or sign in to manage
            schedule, staff, and members.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="bg-brand hover:bg-brand/90"
              render={<Link href="/join?tenant=reset" />}
            >
              Explore Reset demo
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<Link href="/login" />}
            >
              Sign in
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/40 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <Image
              src="/GymSynk-Logo02-B-Wht.png"
              alt="GymSynk"
              width={120}
              height={28}
              className="h-6 w-auto invert dark:invert-0"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              SmartSynk · Paradigm Studio · gymsynk.net
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <a
              href="https://www.paysynk.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              PaySynk
            </a>
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
            <Link href="/join?tenant=reset" className="hover:text-foreground">
              Join Reset
            </Link>
            <Link href="/embed/reset/schedule" className="hover:text-foreground">
              Schedule embed
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
