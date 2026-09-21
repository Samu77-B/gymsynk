"use client";

import { format, parseISO } from "date-fns";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MemberPack = {
  id: string;
  label: string;
  status: "active" | "paused" | "cancelled" | "expired";
  source: string;
  sessionsPerPeriod: number | null;
  price: string | null;
  unlimited: boolean;
  remaining: number | null;
  used: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  notes: string | null;
  tier: { id: string; name: string } | null;
  member: { id: string; fullName: string; email: string } | null;
};

type Member = {
  id: string;
  fullName: string;
  email: string;
};

type PackOption = {
  id: string;
  label: string;
  sessionCount: number | null;
  price: string;
  isPayAsYouGo: boolean;
};

type Tier = {
  id: string;
  name: string;
  packs: PackOption[];
};

function formatDate(value: string) {
  return format(parseISO(value), "d MMM yyyy");
}

function remainingLabel(pack: MemberPack) {
  if (pack.unlimited) {
    return "Unlimited";
  }

  return `${pack.remaining ?? 0} of ${pack.sessionsPerPeriod ?? 0}`;
}

export function AdminMemberPacksView() {
  const [packs, setPacks] = useState<MemberPack[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [memberId, setMemberId] = useState("");
  const [packOptionId, setPackOptionId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [packRes, memberRes, tierRes] = await Promise.all([
      fetch("/api/member-packs"),
      fetch("/api/members"),
      fetch("/api/training-tiers"),
    ]);

    const packData = await packRes.json();
    const memberData = await memberRes.json();
    const tierData = await tierRes.json();

    if (!packRes.ok) {
      setError(packData.error ?? "Could not load packs");
      return;
    }

    setPacks(packData.packs ?? []);
    setMembers(memberData.members ?? []);
    setTiers(tierData.tiers ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Pay-as-you-go rows are a price point, not a drawable balance, so they are
  // not grantable as packs.
  const grantableOptions = tiers.flatMap((tier) =>
    tier.packs
      .filter((pack) => !pack.isPayAsYouGo && pack.sessionCount)
      .map((pack) => ({
        ...pack,
        tierName: tier.name,
        optionLabel: `${tier.name} · ${pack.label} · £${pack.price}`,
      })),
  );

  const selectedMemberName = members.find(
    (member) => member.id === memberId,
  )?.fullName;
  const selectedOptionLabel = grantableOptions.find(
    (option) => option.id === packOptionId,
  )?.optionLabel;

  async function grantPack() {
    if (!memberId || !packOptionId) {
      setError("Choose a member and a pack");
      return;
    }

    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/member-packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: memberId, packOptionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not grant pack");
        return;
      }

      setMessage("Pack granted.");
      setPackOptionId("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function updatePack(id: string, body: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/member-packs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not update pack");
        return;
      }

      await load();
    } finally {
      setBusy(false);
    }
  }

  async function cancelPack(id: string) {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/member-packs/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not cancel pack");
        return;
      }

      setMessage("Pack cancelled.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {message ? (
        <p className="rounded-md border bg-muted px-3 py-2 text-sm">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Grant a pack</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label>Member</Label>
            <Select
              value={memberId}
              onValueChange={(value) => setMemberId(value ?? "")}
              items={members.map((member) => ({
                value: member.id,
                label: member.fullName,
              }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a member">
                  {selectedMemberName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem
                    key={member.id}
                    value={member.id}
                    label={member.fullName}
                  >
                    {member.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Pack</Label>
            <Select
              value={packOptionId}
              onValueChange={(value) => setPackOptionId(value ?? "")}
              items={grantableOptions.map((option) => ({
                value: option.id,
                label: option.optionLabel,
              }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a pack">
                  {selectedOptionLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {grantableOptions.map((option) => (
                  <SelectItem
                    key={option.id}
                    value={option.id}
                    label={option.optionLabel}
                  >
                    {option.optionLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button disabled={busy} onClick={() => void grantPack()}>
            Grant
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Member packs</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Pack</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Period ends</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packs.map((pack) => (
                <TableRow key={pack.id}>
                  <TableCell className="font-medium">
                    {pack.member?.fullName ?? "—"}
                  </TableCell>
                  <TableCell>{pack.label}</TableCell>
                  <TableCell>{pack.tier?.name ?? "Any class"}</TableCell>
                  <TableCell>{remainingLabel(pack)}</TableCell>
                  <TableCell>{formatDate(pack.currentPeriodEnd)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        pack.status === "active" ? "default" : "secondary"
                      }
                    >
                      {pack.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy || pack.status !== "active"}
                        onClick={() =>
                          void updatePack(pack.id, { adjustCredits: 1 })
                        }
                      >
                        +1
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy || pack.status !== "active"}
                        onClick={() =>
                          void updatePack(pack.id, {
                            status: pack.status === "paused" ? "active" : "paused",
                          })
                        }
                      >
                        {pack.status === "paused" ? "Resume" : "Pause"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy || pack.status === "cancelled"}
                        onClick={() => void cancelPack(pack.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {packs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No packs granted yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
