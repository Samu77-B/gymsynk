"use client";

import { format } from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ScanResult = {
  allowed: boolean;
  reason: string | null;
  member: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  scannedAt: string;
};

type CheckInRow = {
  id: string;
  result: "granted" | "denied";
  denialReason: string | null;
  createdAtLabel: string | null;
  member: { fullName: string; role: string } | null;
};

export function AdminAccessScanner() {
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualPayload, setManualPayload] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [checkIns, setCheckIns] = useState<CheckInRow[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const lastScanRef = useRef<string>("");
  const lastScanAtRef = useRef(0);
  const submitPayloadRef = useRef<(payload: string) => Promise<void>>(async () => {});

  const refreshCheckIns = useCallback(async () => {
    const response = await fetch("/api/access/check-ins");
    const json = (await response.json()) as {
      error?: string;
      checkIns?: CheckInRow[];
    };

    if (!response.ok) {
      setListError(json.error ?? "Could not load check-ins.");
      return;
    }

    setListError(null);
    setCheckIns(json.checkIns ?? []);
  }, []);

  const submitPayload = useCallback(
    async (payload: string) => {
      const trimmed = payload.trim();

      if (!trimmed || busy) {
        return;
      }

      const now = Date.now();
      if (
        trimmed === lastScanRef.current &&
        now - lastScanAtRef.current < 4000
      ) {
        return;
      }

      lastScanRef.current = trimmed;
      lastScanAtRef.current = now;
      setBusy(true);

      try {
        const response = await fetch("/api/access/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload: trimmed }),
        });

        const json = (await response.json()) as ScanResult & { error?: string };

        if (!response.ok) {
          setLastResult(null);
          setCameraError(json.error ?? "Scan failed.");
          return;
        }

        setCameraError(null);
        setLastResult(json);
        void refreshCheckIns();
      } finally {
        setBusy(false);
      }
    },
    [busy, refreshCheckIns],
  );

  submitPayloadRef.current = submitPayload;

  useEffect(() => {
    void refreshCheckIns();
  }, [refreshCheckIns]);

  useEffect(() => {
    let cancelled = false;
    const elementId = "gymsynk-access-scanner";

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 260, height: 260 } },
          (decoded) => {
            void submitPayloadRef.current(decoded);
          },
          () => {},
        );

        if (!cancelled) {
          setCameraReady(true);
        }
      } catch {
        if (!cancelled) {
          setCameraError(
            "Camera unavailable. Use manual entry below or check browser permissions.",
          );
        }
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      void scannerRef.current?.stop().catch(() => {});
      scannerRef.current = null;
    };
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Scan member pass</CardTitle>
            <CardDescription>
              Point the camera at a member&apos;s QR code. Staff passes work
              too.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              id="gymsynk-access-scanner"
              className="overflow-hidden rounded-lg border border-border/60 bg-black/5 [&_video]:w-full"
            />
            {!cameraReady && !cameraError ? (
              <p className="text-sm text-muted-foreground">Starting camera…</p>
            ) : null}
            {cameraError ? (
              <p className="text-sm text-destructive">{cameraError}</p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="manualPayload">Manual code paste</Label>
              <div className="flex gap-2">
                <Input
                  id="manualPayload"
                  value={manualPayload}
                  onChange={(event) => setManualPayload(event.target.value)}
                  placeholder="GYMSYNK:…"
                />
                <Button
                  type="button"
                  disabled={busy || !manualPayload.trim()}
                  onClick={() => void submitPayload(manualPayload)}
                >
                  Verify
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {lastResult ? (
          <Card
            className={
              lastResult.allowed
                ? "border-brand/40 bg-brand/5 shadow-sm"
                : "border-destructive/40 bg-destructive/5 shadow-sm"
            }
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                {lastResult.member.fullName}
                <Badge variant={lastResult.allowed ? "default" : "destructive"}>
                  {lastResult.allowed ? "Granted" : "Denied"}
                </Badge>
              </CardTitle>
              <CardDescription>
                {lastResult.member.role} ·{" "}
                {format(new Date(lastResult.scannedAt), "HH:mm:ss")}
              </CardDescription>
            </CardHeader>
            {!lastResult.allowed && lastResult.reason ? (
              <CardContent>
                <p className="text-sm text-destructive">{lastResult.reason}</p>
              </CardContent>
            ) : null}
          </Card>
        ) : null}
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Recent check-ins</CardTitle>
          <CardDescription>Latest scans at this gym.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {listError ? (
            <p className="text-sm text-destructive">{listError}</p>
          ) : null}
          {checkIns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No check-ins yet.</p>
          ) : (
            <ul className="space-y-2">
              {checkIns.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {row.member?.fullName ?? "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.createdAtLabel}
                    </p>
                  </div>
                  <Badge
                    variant={row.result === "granted" ? "default" : "destructive"}
                  >
                    {row.result === "granted" ? "In" : "Denied"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
