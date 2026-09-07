"use client";

import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AdminMemberRow = {
  id: string;
  planName: string;
  status: string;
  statusLabel: string;
  primaryName: string;
  primaryEmail: string;
  memberCount: number;
  maxMembers: number;
  trialEndsAt: string | null;
  members: Array<{
    fullName: string;
    email: string;
    isPrimary: boolean;
  }>;
};

export function AdminMembersView({
  memberships,
}: {
  memberships: AdminMemberRow[];
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Active memberships</CardTitle>
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No memberships yet. Share the join link to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Primary member</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Trial ends</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberships.map((membership) => (
                  <TableRow key={membership.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{membership.primaryName}</p>
                        <p className="text-sm text-muted-foreground">
                          {membership.primaryEmail}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{membership.planName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{membership.statusLabel}</Badge>
                    </TableCell>
                    <TableCell>
                      {membership.memberCount}/{membership.maxMembers}
                    </TableCell>
                    <TableCell>
                      {membership.trialEndsAt
                        ? format(new Date(membership.trialEndsAt), "d MMM yyyy")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {memberships.map((membership) => (
        <Card key={`${membership.id}-members`}>
          <CardHeader>
            <CardTitle>
              {membership.primaryName} · {membership.planName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {membership.members.map((member) => (
              <div
                key={member.email}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{member.fullName}</p>
                  <p className="text-muted-foreground">{member.email}</p>
                </div>
                {member.isPrimary ? <Badge>Primary</Badge> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
