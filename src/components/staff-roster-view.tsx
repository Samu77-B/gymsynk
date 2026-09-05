"use client";

import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";

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

type Shift = {
  id: string;
  staffName: string;
  staffRole: string;
  shiftStart: string;
  shiftEnd: string;
  roleAssigned: string | null;
  notes: string | null;
};

type StaffOption = { id: string; fullName: string; role: string };

export function StaffRosterView() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [staffId, setStaffId] = useState("");
  const [shiftStart, setShiftStart] = useState("");
  const [shiftEnd, setShiftEnd] = useState("");
  const [roleAssigned, setRoleAssigned] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    const [shiftRes, staffRes] = await Promise.all([
      fetch("/api/shifts"),
      fetch("/api/users?role=trainer,admin,owner"),
    ]);

    setShifts((await shiftRes.json()).shifts ?? []);
    setStaff((await staffRes.json()).users ?? []);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createShift(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const response = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staffId,
        shiftStart: new Date(shiftStart).toISOString(),
        shiftEnd: new Date(shiftEnd).toISOString(),
        roleAssigned: roleAssigned || null,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      setMessage(data.error ?? "Could not create shift");
      return;
    }

    setMessage("Shift added.");
    setShiftStart("");
    setShiftEnd("");
    setRoleAssigned("");
    await loadData();
  }

  async function deleteShift(id: string) {
    await fetch(`/api/shifts/${id}`, { method: "DELETE" });
    await loadData();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add staff shift</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={createShift}>
            <div className="space-y-2">
              <Label>Staff member</Label>
              <Select value={staffId} onValueChange={(value) => setStaffId(value ?? "")} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.fullName} ({item.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleAssigned">Role on shift</Label>
              <Input
                id="roleAssigned"
                value={roleAssigned}
                onChange={(event) => setRoleAssigned(event.target.value)}
                placeholder="Front desk, PT floor..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shiftStart">Shift start</Label>
              <Input
                id="shiftStart"
                type="datetime-local"
                value={shiftStart}
                onChange={(event) => setShiftStart(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shiftEnd">Shift end</Label>
              <Input
                id="shiftEnd"
                type="datetime-local"
                value={shiftEnd}
                onChange={(event) => setShiftEnd(event.target.value)}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Save shift</Button>
            </div>
          </form>
          {message ? <p className="mt-3 text-sm">{message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming shifts</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Assigned role</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell>
                    {shift.staffName}
                    <span className="block text-xs text-muted-foreground">
                      {shift.staffRole}
                    </span>
                  </TableCell>
                  <TableCell>
                    {format(parseISO(shift.shiftStart), "EEE d MMM HH:mm")} –{" "}
                    {format(parseISO(shift.shiftEnd), "HH:mm")}
                  </TableCell>
                  <TableCell>{shift.roleAssigned ?? "—"}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void deleteShift(shift.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
