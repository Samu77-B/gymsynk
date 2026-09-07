import type Stripe from "stripe";

type SubscriptionLike = Stripe.Subscription & {
  current_period_end?: number | null;
};

type InvoiceLike = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
};

export function getSubscriptionPeriodEnd(
  subscription: Stripe.Subscription,
): Date | null {
  const sub = subscription as SubscriptionLike;
  const itemPeriodEnd = subscription.items?.data?.[0] as
    | { current_period_end?: number | null }
    | undefined;

  const timestamp =
    sub.current_period_end ?? itemPeriodEnd?.current_period_end ?? null;

  return timestamp ? new Date(timestamp * 1000) : null;
}

export function getSubscriptionTrialEnd(
  subscription: Stripe.Subscription,
): Date | null {
  const sub = subscription as Stripe.Subscription & {
    trial_end?: number | null;
  };

  return sub.trial_end ? new Date(sub.trial_end * 1000) : null;
}

export function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const legacy = invoice as InvoiceLike;

  if (typeof legacy.subscription === "string") {
    return legacy.subscription;
  }

  if (legacy.subscription && typeof legacy.subscription === "object") {
    return legacy.subscription.id;
  }

  const parent = invoice.parent as
    | {
        subscription_details?: {
          subscription?: string | { id?: string } | null;
        };
      }
    | null
    | undefined;

  const nested = parent?.subscription_details?.subscription;

  if (typeof nested === "string") {
    return nested;
  }

  if (nested && typeof nested === "object" && nested.id) {
    return nested.id;
  }

  return null;
}
