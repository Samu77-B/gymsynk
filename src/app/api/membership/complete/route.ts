import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { tenants, users } from "@/db/schema";
import { parseJson, jsonError } from "@/lib/api";
import { createSession } from "@/lib/auth";
import { provisionMembershipFromCheckout } from "@/lib/membership-provision";
import { getStripe } from "@/lib/stripe";

const completeSchema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = parseJson(completeSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(
    parsed.data.sessionId,
    { expand: ["subscription"] },
  );

  if (session.status !== "complete") {
    return jsonError("Checkout is not complete yet", 400);
  }

  if (session.mode !== "subscription") {
    return jsonError("Invalid checkout session", 400);
  }

  await provisionMembershipFromCheckout(session);

  const tenantId = session.metadata?.tenantId;
  const email =
    session.customer_details?.email ??
    session.customer_email ??
    session.metadata?.email;

  if (!tenantId || !email) {
    return jsonError("Could not resolve member account", 400);
  }

  const db = getDb();

  const user = await db.query.users.findFirst({
    where: and(eq(users.tenantId, tenantId), eq(users.email, email)),
  });

  if (!user) {
    return jsonError("Member account not found", 404);
  }

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  if (!tenant) {
    return jsonError("Gym not found", 404);
  }

  await createSession({
    userId: user.id,
    tenantId: tenant.id,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
    tenantSlug: tenant.slug,
  });

  return Response.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      tenantSlug: tenant.slug,
    },
  });
}
