"use client";

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

type StaffMember = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  bio: string | null;
  photoUrl1: string | null;
  photoUrl2: string | null;
  photoUrl3: string | null;
};

type StaffForm = {
  fullName: string;
  email: string;
  phone: string;
  role: "trainer" | "admin";
  bio: string;
  photoUrl1: string;
  photoUrl2: string;
  photoUrl3: string;
};

const emptyForm: StaffForm = {
  fullName: "",
  email: "",
  phone: "",
  role: "trainer",
  bio: "",
  photoUrl1: "",
  photoUrl2: "",
  photoUrl3: "",
};

function roleLabel(role: string) {
  switch (role) {
    case "admin":
      return "Manager";
    case "trainer":
      return "Trainer";
    case "owner":
      return "Owner";
    default:
      return role;
  }
}

export function AdminStaffView() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [assignableRoles, setAssignableRoles] = useState<Array<"trainer" | "admin">>(
    [],
  );
  const [addForm, setAddForm] = useState<StaffForm>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<StaffForm>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadStaff() {
    const response = await fetch("/api/staff");
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not load staff");
      return;
    }

    setStaff(data.staff ?? []);
    setAssignableRoles(data.assignableRoles ?? []);
  }

  useEffect(() => {
    void loadStaff();
  }, []);

  async function createStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const response = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not add staff member");
      return;
    }

    setMessage(`${data.staff.fullName} added. They can log in with their email.`);
    setAddForm({ ...emptyForm, role: assignableRoles[0] ?? "trainer" });
    await loadStaff();
  }

  function startEdit(member: StaffMember) {
    if (member.role === "owner") {
      return;
    }

    setEditId(member.id);
    setEditForm({
      fullName: member.fullName,
      email: member.email,
      phone: member.phone ?? "",
      role: member.role as "trainer" | "admin",
      bio: member.bio ?? "",
      photoUrl1: member.photoUrl1 ?? "",
      photoUrl2: member.photoUrl2 ?? "",
      photoUrl3: member.photoUrl3 ?? "",
    });
    setMessage(null);
    setError(null);
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editId) {
      return;
    }

    setMessage(null);
    setError(null);

    const response = await fetch(`/api/staff/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not update staff member");
      return;
    }

    setMessage(`${data.staff.fullName} updated.`);
    setEditId(null);
    await loadStaff();
  }

  async function togglePause(member: StaffMember) {
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !member.isActive }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not update staff status");
      return;
    }

    setMessage(
      `${member.fullName} ${member.isActive ? "paused" : "reactivated"}.`,
    );
    await loadStaff();
  }

  async function deleteStaff(member: StaffMember) {
    if (
      !window.confirm(
        `Delete ${member.fullName}? This removes their account and cannot be undone.`,
      )
    ) {
      return;
    }

    setMessage(null);
    setError(null);

    const response = await fetch(`/api/staff/${member.id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not delete staff member");
      return;
    }

    setMessage(`${member.fullName} deleted.`);
    if (editId === member.id) {
      setEditId(null);
    }
    await loadStaff();
  }

  function canManage(member: StaffMember) {
    if (member.role === "owner") {
      return false;
    }

    if (member.role === "admin") {
      return assignableRoles.includes("admin");
    }

    return assignableRoles.includes("trainer");
  }

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
          <CardTitle>Add staff member</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={createStaff}>
            <div className="space-y-2">
              <Label htmlFor="addName">Full name</Label>
              <Input
                id="addName"
                value={addForm.fullName}
                onChange={(event) =>
                  setAddForm((form) => ({ ...form, fullName: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addEmail">Email</Label>
              <Input
                id="addEmail"
                type="email"
                value={addForm.email}
                onChange={(event) =>
                  setAddForm((form) => ({ ...form, email: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addPhone">Phone</Label>
              <Input
                id="addPhone"
                type="tel"
                value={addForm.phone}
                onChange={(event) =>
                  setAddForm((form) => ({ ...form, phone: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={addForm.role}
                onValueChange={(value) =>
                  setAddForm((form) => ({
                    ...form,
                    role: (value as "trainer" | "admin") ?? "trainer",
                  }))
                }
                items={assignableRoles.map((role) => ({
                  value: role,
                  label: roleLabel(role),
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{roleLabel(addForm.role)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role} value={role} label={roleLabel(role)}>
                      {roleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="addBio">Bio</Label>
              <textarea
                id="addBio"
                className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={addForm.bio}
                onChange={(event) =>
                  setAddForm((form) => ({ ...form, bio: event.target.value }))
                }
                placeholder="Short profile for your website and marketing."
              />
            </div>
            {[1, 2, 3].map((index) => (
              <div key={index} className="space-y-2">
                <Label htmlFor={`addPhoto${index}`}>Photo {index} URL</Label>
                <Input
                  id={`addPhoto${index}`}
                  type="url"
                  value={addForm[`photoUrl${index}` as keyof StaffForm] as string}
                  onChange={(event) =>
                    setAddForm((form) => ({
                      ...form,
                      [`photoUrl${index}`]: event.target.value,
                    }))
                  }
                  placeholder="https://..."
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <Button type="submit">Add staff member</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Marketing</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{member.fullName}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{roleLabel(member.role)}</TableCell>
                  <TableCell>
                    <Badge variant={member.isActive ? "secondary" : "destructive"}>
                      {member.isActive ? "Active" : "Paused"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[member.photoUrl1, member.photoUrl2, member.photoUrl3].filter(Boolean)
                      .length}{" "}
                    / 3 photos
                    {member.bio ? " · bio" : ""}
                  </TableCell>
                  <TableCell>
                    {canManage(member) ? (
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
                          onClick={() => void togglePause(member)}
                        >
                          {member.isActive ? "Pause" : "Activate"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => void deleteStaff(member)}
                        >
                          Delete
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editId ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit staff profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={saveEdit}>
              <div className="space-y-2">
                <Label htmlFor="editName">Full name</Label>
                <Input
                  id="editName"
                  value={editForm.fullName}
                  onChange={(event) =>
                    setEditForm((form) => ({ ...form, fullName: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editForm.email}
                  onChange={(event) =>
                    setEditForm((form) => ({ ...form, email: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPhone">Phone</Label>
                <Input
                  id="editPhone"
                  type="tel"
                  value={editForm.phone}
                  onChange={(event) =>
                    setEditForm((form) => ({ ...form, phone: event.target.value }))
                  }
                />
              </div>
              {assignableRoles.includes("admin") ? (
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(value) =>
                      setEditForm((form) => ({
                        ...form,
                        role: (value as "trainer" | "admin") ?? "trainer",
                      }))
                    }
                    items={assignableRoles.map((role) => ({
                      value: role,
                      label: roleLabel(role),
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>{roleLabel(editForm.role)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {assignableRoles.map((role) => (
                        <SelectItem key={role} value={role} label={roleLabel(role)}>
                          {roleLabel(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="editBio">Bio</Label>
                <textarea
                  id="editBio"
                  className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={editForm.bio}
                  onChange={(event) =>
                    setEditForm((form) => ({ ...form, bio: event.target.value }))
                  }
                  placeholder="Short profile for your website and marketing."
                />
              </div>
              {[1, 2, 3].map((index) => (
                <div key={index} className="space-y-2">
                  <Label htmlFor={`editPhoto${index}`}>Photo {index} URL</Label>
                  <Input
                    id={`editPhoto${index}`}
                    type="url"
                    value={editForm[`photoUrl${index}` as keyof StaffForm] as string}
                    onChange={(event) =>
                      setEditForm((form) => ({
                        ...form,
                        [`photoUrl${index}`]: event.target.value,
                      }))
                    }
                    placeholder="https://..."
                  />
                </div>
              ))}
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button type="submit">Save changes</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditId(null)}
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
