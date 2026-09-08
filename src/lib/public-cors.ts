const DEFAULT_ORIGINS = "*";

export function publicCorsHeaders(request: Request) {
  const configured = process.env.PUBLIC_SCHEDULE_CORS_ORIGINS?.trim();
  const requestOrigin = request.headers.get("Origin");

  let allowOrigin = DEFAULT_ORIGINS;

  if (configured && configured !== "*") {
    const allowed = configured.split(",").map((item) => item.trim());
    if (requestOrigin && allowed.includes(requestOrigin)) {
      allowOrigin = requestOrigin;
    } else if (allowed.length === 1) {
      allowOrigin = allowed[0]!;
    }
  } else if (configured === "*" || !configured) {
    allowOrigin = requestOrigin ?? "*";
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  };
}

export function withPublicCors(request: Request, response: Response) {
  const headers = publicCorsHeaders(request);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}
