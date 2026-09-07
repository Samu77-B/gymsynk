"use client";

import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";

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
import { emptyProfileDefaults, parqStatusOptions } from "@/lib/member-profile";

type MemberProfile = ReturnType<typeof emptyProfileDefaults>;

type MemberRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  profileComplete: number;
  statusLabel: string;
  profile: MemberProfile;
  membership: {
    id: string;
    planName: string;
    status: string;
    isPrimary: boolean;
    startDate: string | null;
    contractEndDate: string | null;
    trialEndsAt: string | null;
  } | null;
  stripeCustomerId?: string | null;
};

type EditState = {
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  profile: MemberProfile;
  membershipStartDate: string;
  membershipContractEndDate: string;
};

function toDatetimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h3 className="font-medium">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

export function AdminMembersView({ tenantSlug }: { tenantSlug: string }) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadMembers() {
    const response = await fetch("/api/members");
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not load members");
      return;
    }

    setMembers(data.members ?? []);
  }

  useEffect(() => {
    void loadMembers();
  }, []);

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const response = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: addName,
        email: addEmail,
        phone: addPhone || null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not add member");
      return;
    }

    const savedName = addName;
    setMessage(`${savedName} added. Complete their profile below.`);
    setAddName("");
    setAddEmail("");
    setAddPhone("");
    await loadMembers();
    startEdit(data.member as MemberRow);
  }

  function startEdit(member: MemberRow) {
    setEditId(member.id);
    setEditState({
      fullName: member.fullName,
      email: member.email,
      phone: member.phone ?? "",
      isActive: member.isActive,
      profile: { ...member.profile },
      membershipStartDate: toDatetimeLocal(member.membership?.startDate ?? null),
      membershipContractEndDate: toDatetimeLocal(
        member.membership?.contractEndDate ?? null,
      ),
    });
    setMessage(null);
    setError(null);
  }

  async function saveMember(event: React.FormEvent) {
    event.preventDefault();
    if (!editId || !editState) {
      return;
    }

    setMessage(null);
    setError(null);

    const response = await fetch(`/api/members/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: editState.fullName,
        email: editState.email,
        phone: editState.phone || null,
        isActive: editState.isActive,
        profile: editState.profile,
        membership: {
          startDate: fromDatetimeLocal(editState.membershipStartDate),
          contractEndDate: fromDatetimeLocal(
            editState.membershipContractEndDate,
          ),
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not save member");
      return;
    }

    setMessage(`${editState.fullName} saved.`);
    await loadMembers();
  }

  async function pauseMember(member: MemberRow) {
    const response = await fetch(`/api/members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !member.isActive }),
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Could not update member status");
      return;
    }

    setMessage(
      `${member.fullName} ${member.isActive ? "paused" : "reactivated"}.`,
    );
    await loadMembers();
  }

  async function deleteMember(member: MemberRow) {
    if (
      !window.confirm(
        `Delete ${member.fullName}? This removes their account and profile.`,
      )
    ) {
      return;
    }

    const response = await fetch(`/api/members/${member.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Could not delete member");
      return;
    }

    setMessage(`${member.fullName} deleted.`);
    if (editId === member.id) {
      setEditId(null);
      setEditState(null);
    }
    await loadMembers();
  }

  const editingMember = members.find((member) => member.id === editId);

  return (
    <div className="space-y-6">
      {message ? (
        <p className="rounded-md border bg-muted px-3 py-2 text-sm">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Add member (front desk)</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-4 md:items-end"
            onSubmit={addMember}
          >
            <div className="space-y-2">
              <Label htmlFor="addName">Full name</Label>
              <Input
                id="addName"
                value={addName}
                onChange={(event) => setAddName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addEmail">Email</Label>
              <Input
                id="addEmail"
                type="email"
                value={addEmail}
                onChange={(event) => setAddEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addPhone">Mobile</Label>
              <Input
                id="addPhone"
                type="tel"
                value={addPhone}
                onChange={(event) => setAddPhone(event.target.value)}
              />
            </div>
            <Button type="submit">Add member</Button>
          </form>
          <p className="mt-3 text-sm text-muted-foreground">
            Online signup link: <code>/join?tenant={tenantSlug}</code>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All members</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No members yet. Add someone at the desk or share the join link.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{member.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.membership?.planName ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          member.isActive ? "secondary" : "destructive"
                        }
                      >
                        {member.isActive
                          ? member.statusLabel
                          : "Paused account"}
                      </Badge>
                    </TableCell>
                    <TableCell>{member.profileComplete}% complete</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(member)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void pauseMember(member)}
                        >
                          {member.isActive ? "Pause" : "Activate"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => void deleteMember(member)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editId && editState ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit member · {editState.fullName}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={saveMember}>
              <Section title="1. Personal details">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Preferred / display name</Label>
                  <Input
                    id="fullName"
                    value={editState.fullName}
                    onChange={(event) =>
                      setEditState({ ...editState, fullName: event.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legalName">Full legal name</Label>
                  <Input
                    id="legalName"
                    value={editState.profile.legalName}
                    onChange={(event) =>
                      setEditState({
                        ...editState,
                        profile: {
                          ...editState.profile,
                          legalName: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={editState.profile.dateOfBirth ?? ""}
                    onChange={(event) =>
                      setEditState({
                        ...editState,
                        profile: {
                          ...editState.profile,
                          dateOfBirth: event.target.value || null,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editState.email}
                    onChange={(event) =>
                      setEditState({ ...editState, email: event.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile (SMS)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={editState.phone}
                    onChange={(event) =>
                      setEditState({ ...editState, phone: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="addressLine1">Address line 1</Label>
                  <Input
                    id="addressLine1"
                    value={editState.profile.addressLine1}
                    onChange={(event) =>
                      setEditState({
                        ...editState,
                        profile: {
                          ...editState.profile,
                          addressLine1: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="addressLine2">Address line 2</Label>
                  <Input
                    id="addressLine2"
                    value={editState.profile.addressLine2}
                    onChange={(event) =>
                      setEditState({
                        ...editState,
                        profile: {
                          ...editState.profile,
                          addressLine2: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City / town</Label>
                  <Input
                    id="city"
                    value={editState.profile.city}
                    onChange={(event) =>
                      setEditState({
                        ...editState,
                        profile: { ...editState.profile, city: event.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="county">County</Label>
                  <Input
                    id="county"
                    value={editState.profile.county}
                    onChange={(event) =>
                      setEditState({
                        ...editState,
                        profile: {
                          ...editState.profile,
                          county: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input
                    id="postcode"
                    value={editState.profile.postcode}
                    onChange={(event) =>
                      setEditState({
                        ...editState,
                        profile: {
                          ...editState.profile,
                          postcode: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={editState.profile.country}
                    onChange={(event) =>
                      setEditState({
                        ...editState,
                        profile: {
                          ...editState.profile,
                          country: event.target.value,
                        },
                      })
                    }
                  />
                </div>
              </Section>

              <Section title="2. Emergency contact & health">
                <div className="space-y-2">
                  <Label htmlFor="emergencyName">Emergency contact name</Label>
                  <Input
                    id="emergencyName"
                    value={editState.profile.emergencyContactName}
                    onChange={(event) =>
                      setEditState({
                        ...editState,
                        profile: {
                          ...editState.profile,
                          emergencyContactName: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyRelationship">Relationship</Label>
                  <Input
                    id="emergencyRelationship"
                    value={editState.profile.emergencyContactRelationship}
                    onChange={(event) =>
                      setEditState({
                        ...editState,
                        profile: {
                          ...editState.profile,
                          emergencyContactRelationship: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">Emergency phone</Label>
                  <Input
                    id="emergencyPhone"
                    type="tel"
                    value={editState.profile.emergencyContactPhone}
                    onChange={(event) =>
                      setEditState({
                        ...editState,
                        profile: {
                          ...editState.profile,
                          emergencyContactPhone: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>PAR-Q status</Label>
                  <Select
                    value={editState.profile.parqStatus}
                    onValueChange={(value) =>
                      setEditState({
                        ...editState,
                        profile: {
                          ...editState.profile,
                          parqStatus:
                            (value as MemberProfile["parqStatus"]) ??
                            "not_started",
                        },
                      })
                    }
                    items={parqStatusOptions.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {
                          parqStatusOptions.find(
                            (option) =>
                              option.value === editState.profile.parqStatus,
                          )?.label
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {parqStatusOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          label={option.label}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="medicalNotes">
                    Medical conditions / limitations (confidential)
                  </Label>
                  <textarea
                    id="medicalNotes"
                    className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={editState.profile.medicalNotes}
                    onChange={(event) =>
                      setEditState({
                        ...editState,
                        profile: {
                          ...editState.profile,
                          medicalNotes: event.target.value,
                        },
                      })
                    }
                  />
                </div>
              </Section>

              <Section title="3. Membership & access">
                <div className="space-y-2 md:col-span-2">
                  <p className="text-sm text-muted-foreground">
                    Plan:{" "}
                    <strong>
                      {editingMember?.membership?.planName ?? "No membership"}
                    </strong>
                    {editingMember?.membership?.trialEndsAt
                      ? ` · Trial ends ${format(parseISO(editingMember.membership.trialEndsAt), "d MMM yyyy")}`
                      : ""}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="membershipStart">Membership start</Label>
                  <Input
                    id="membershipStart"
                    type="datetime-local"
                    value={editState.membershipStartDate}
                    onChange={(event) =>
                      setEditState({
                        ...editState,
                        membershipStartDate: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contractEnd">Contract / commitment end</Label>
                  <Input
                    id="contractEnd"
                    type="datetime-local"
                    value={editState.membershipContractEndDate}
                    onChange={(event) =>
                      setEditState({
                        ...editState,
                        membershipContractEndDate: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accessCardId">Key fob / RFID / barcode ID</Label>
                  <Input
                    id="accessCardId"
                    value={editState.profile.accessCardId}
                    onChange={(event) =>
                      setEditState({
                        ...editState,
                        profile: {
                          ...editState.profile,
                          accessCardId: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="memberPhotoUrl">Member photo URL (check-in ID)</Label>
                  <Input
                    id="memberPhotoUrl"
                    type="url"
                    value={editState.profile.memberPhotoUrl}
                    onChange={(event) =>
                      setEditState({
                        ...editState,
                        profile: {
                          ...editState.profile,
                          memberPhotoUrl: event.target.value,
                        },
                      })
                    }
                    placeholder="https://..."
                  />
                </div>
              </Section>

              <Section title="4. Billing & legal">
                <div className="space-y-2 md:col-span-2">
                  <p className="text-sm text-muted-foreground">
                    Card and direct debit details are stored securely in Stripe
                    — never enter full bank or card numbers here. Use the note
                    field for how this member pays.
                  </p>
                  {editingMember?.stripeCustomerId ? (
                    <p className="text-sm">
                      Stripe customer:{" "}
                      <code>{editingMember.stripeCustomerId}</code>
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="paymentMethodNote">Payment method note</Label>
                  <Input
                    id="paymentMethodNote"
                    value={editState.profile.paymentMethodNote}
                    onChange={(event) =>
                      setEditState({
                        ...editState,
                        profile: {
                          ...editState.profile,
                          paymentMethodNote: event.target.value,
                        },
                      })
                    }
                    placeholder="e.g. Stripe subscription, DD via gym, paid cash"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editState.profile.billingSameAsHome}
                      onChange={(event) =>
                        setEditState({
                          ...editState,
                          profile: {
                            ...editState.profile,
                            billingSameAsHome: event.target.checked,
                          },
                        })
                      }
                    />
                    Billing address same as home address
                  </label>
                </div>
                {!editState.profile.billingSameAsHome ? (
                  <>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="billingAddressLine1">Billing address line 1</Label>
                      <Input
                        id="billingAddressLine1"
                        value={editState.profile.billingAddressLine1}
                        onChange={(event) =>
                          setEditState({
                            ...editState,
                            profile: {
                              ...editState.profile,
                              billingAddressLine1: event.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billingCity">Billing city</Label>
                      <Input
                        id="billingCity"
                        value={editState.profile.billingCity}
                        onChange={(event) =>
                          setEditState({
                            ...editState,
                            profile: {
                              ...editState.profile,
                              billingCity: event.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billingPostcode">Billing postcode</Label>
                      <Input
                        id="billingPostcode"
                        value={editState.profile.billingPostcode}
                        onChange={(event) =>
                          setEditState({
                            ...editState,
                            profile: {
                              ...editState.profile,
                              billingPostcode: event.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="joiningFeeAmount">Joining fee (£)</Label>
                  <Input
                    id="joiningFeeAmount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={editState.profile.joiningFeeAmount}
                    onChange={(event) =>
                      setEditState({
                        ...editState,
                        profile: {
                          ...editState.profile,
                          joiningFeeAmount: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex h-8 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editState.profile.joiningFeePaid}
                      onChange={(event) =>
                        setEditState({
                          ...editState,
                          profile: {
                            ...editState.profile,
                            joiningFeePaid: event.target.checked,
                            joiningFeePaidAt: event.target.checked
                              ? new Date().toISOString()
                              : null,
                          },
                        })
                      }
                    />
                    Joining fee paid
                  </label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waiverSignedAt">Waiver signed</Label>
                  <Input
                    id="waiverSignedAt"
                    type="datetime-local"
                    value={toDatetimeLocal(editState.profile.waiverSignedAt)}
                    onChange={(event) =>
                      setEditState({
                        ...editState,
                        profile: {
                          ...editState.profile,
                          waiverSignedAt: fromDatetimeLocal(event.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="termsAcceptedAt">Terms accepted</Label>
                  <Input
                    id="termsAcceptedAt"
                    type="datetime-local"
                    value={toDatetimeLocal(editState.profile.termsAcceptedAt)}
                    onChange={(event) =>
                      setEditState({
                        ...editState,
                        profile: {
                          ...editState.profile,
                          termsAcceptedAt: fromDatetimeLocal(event.target.value),
                        },
                      })
                    }
                  />
                </div>
              </Section>

              <div className="flex flex-wrap gap-2">
                <Button type="submit">Save member profile</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditId(null);
                    setEditState(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
