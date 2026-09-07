"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MembershipMember = {
  id: string;
  fullName: string;
  email: string;
  isPrimary: boolean;
};

type MembershipInfo = {
  id: string;
  status: string;
  statusLabel: string;
  planName: string;
  maxMembers: number;
  memberCount: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  isPrimary: boolean;
  members: MembershipMember[];
};

export function MembershipView() {
  const [membership, setMembership] = useState<MembershipInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  async function loadMembership() {
    const response = await fetch("/api/membership/status");
    const data = await response.json();
    setMembership(data.membership ?? null);
    setLoading(false);
  }

  useEffect(() => {
    void loadMembership();
  }, []);

  async function inviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setInviting(true);

    const response = await fetch("/api/membership/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email }),
    });

    const data = await response.json();
    setInviting(false);

    if (!response.ok) {
      setError(data.error ?? "Could not add member");
      return;
    }

    setMessage(`${data.member.fullName} can now log in and book classes.`);
    setFullName("");
    setEmail("");
    await loadMembership();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading membership...</p>;
  }

  if (!membership) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No membership yet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Join to unlock class booking and member benefits.
          </p>
          <Button render={<Link href="/join" />}>View membership plans</Button>
        </CardContent>
      </Card>
    );
  }

  const slotsLeft = membership.maxMembers - membership.memberCount;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{membership.planName}</CardTitle>
            <Badge variant="secondary">{membership.statusLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {membership.trialEndsAt ? (
            <p>
              Free trial ends{" "}
              {format(new Date(membership.trialEndsAt), "d MMM yyyy")}
            </p>
          ) : null}
          {membership.currentPeriodEnd ? (
            <p>
              Current period ends{" "}
              {format(new Date(membership.currentPeriodEnd), "d MMM yyyy")}
            </p>
          ) : null}
          <p className="text-muted-foreground">
            {membership.memberCount} of {membership.maxMembers} member slots
            used
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>People on this membership</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {membership.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
            >
              <div>
                <p className="font-medium">{member.fullName}</p>
                <p className="text-sm text-muted-foreground">{member.email}</p>
              </div>
              {member.isPrimary ? <Badge>Primary</Badge> : null}
            </div>
          ))}
        </CardContent>
      </Card>

      {membership.isPrimary && slotsLeft > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Add partner or family member</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={inviteMember}>
              <div className="space-y-2">
                <Label htmlFor="inviteName">Full name</Label>
                <Input
                  id="inviteName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Email</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {slotsLeft} slot{slotsLeft === 1 ? "" : "s"} remaining on your
                plan. They log in with this email to book classes.
              </p>
              {message ? (
                <p className="text-sm text-emerald-700">{message}</p>
              ) : null}
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <Button type="submit" disabled={inviting}>
                {inviting ? "Adding..." : "Add member"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
