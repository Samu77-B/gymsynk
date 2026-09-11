"use client";

import { useEffect } from "react";

/**
 * Embeds run inside iframes on external sites. The app root uses dark mode and
 * min-height: 100%, which leaves a dark strip when iframe height > content.
 */
export function EmbedFrameShell({
  children,
  background = "#f3efe6",
}: {
  children: React.ReactNode;
  background?: string;
}) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.classList.remove("dark");
    html.style.background = background;
    html.style.minHeight = "100%";
    body.style.background = background;
    body.style.minHeight = "100%";
    body.style.display = "block";

    return () => {
      html.style.background = "";
      html.style.minHeight = "";
      body.style.background = "";
      body.style.minHeight = "";
      body.style.display = "";
    };
  }, [background]);

  return (
    <div className="gymsynk-embed-shell min-h-full" style={{ background }}>
      {children}
    </div>
  );
}
