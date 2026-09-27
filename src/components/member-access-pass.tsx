"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";

import { Badge } from "@/components/ui/badge";
import { formatMemberNumber } from "@/lib/member-number";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AccessPreview =
  | { allowed: true; kind: "staff" | "membership" }
  | { allowed: false; reason: string };

export function MemberAccessPass() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [memberNumber, setMemberNumber] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [accessPreview, setAccessPreview] = useState<AccessPreview | null>(
    null,
  );

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/access/pass");
      const json = (await response.json()) as {
        error?: string;
        qrValue?: string;
        memberNumber?: string;
        fullName?: string;
        accessPreview?: AccessPreview;
      };

      if (!response.ok) {
        setError(json.error ?? "Could not load your gym pass.");
        setLoading(false);
        return;
      }

      setQrValue(json.qrValue ?? null);
      setMemberNumber(json.memberNumber ?? null);
      setFullName(json.fullName ?? "");
      setAccessPreview(json.accessPreview ?? null);
      setLoading(false);
    }

    void load();
  }, []);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading your gym pass…</p>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!qrValue) {
    return (
      <p className="text-sm text-destructive">
        Your pass could not be generated. Contact reception.
      </p>
    );
  }

  const allowed = accessPreview?.allowed ?? false;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="text-center">
          <CardTitle>{fullName}</CardTitle>
          <CardDescription>
            Show this code at reception or the door reader.
          </CardDescription>
          <div className="flex justify-center pt-2">
            <Badge variant={allowed ? "default" : "destructive"}>
              {allowed && accessPreview?.allowed
                ? accessPreview.kind === "staff"
                  ? "Staff access"
                  : "Membership active"
                : "Access blocked"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 pb-8">
          <div className="rounded-xl bg-white p-4 shadow-inner">
            <QRCode value={qrValue} size={220} />
          </div>
          {memberNumber ? (
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Member number
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.18em]">
                {formatMemberNumber(memberNumber)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use this at the door keypad if the QR will not scan.
              </p>
            </div>
          ) : null}
          {!allowed && accessPreview && !accessPreview.allowed ? (
            <p className="text-center text-sm text-destructive">
              {accessPreview.reason}
            </p>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Brighten your screen if the scanner struggles. Pass renews
              automatically while your account is active.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
