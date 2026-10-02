import { z } from "zod";

import { parseJson, jsonError } from "@/lib/api";
import { completeCheckoutSession } from "@/lib/checkout-complete";

const completeSchema = z.object({
  sessionId: z.string().min(1),
  tenantSlug: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = parseJson(completeSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const result = await completeCheckoutSession(
      parsed.data.sessionId,
      parsed.data.tenantSlug,
    );
    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not complete checkout";
    return jsonError(message, 400);
  }
}
