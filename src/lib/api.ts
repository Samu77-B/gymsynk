import { NextResponse } from "next/server";
import { z } from "zod";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function parseJson<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
):
  | { success: true; data: z.infer<T> }
  | { success: false; response: NextResponse } {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 },
      ),
    };
  }

  return { success: true, data: result.data };
}
