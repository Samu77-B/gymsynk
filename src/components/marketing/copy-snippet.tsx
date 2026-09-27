"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CopySnippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <p className="text-sm font-medium">Schedule iframe</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
        {code}
      </pre>
    </div>
  );
}
