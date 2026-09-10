"use client";

import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";

import { AdminClassTypesView } from "@/components/admin-class-types-view";
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

type Schedule = {
  id: string;
  classId: string;
  classTitle: string;
  trainerId: string | null;
  trainerName: string;
  startTime: string;
  endTime: string;
  capacity: number;
  confirmedCount: number;
  fillRate: number;
  status: string;
};

type ClassOption = { id: string; title: string; durationMinutes: number };
type TrainerOption = { id: string; fullName: string };

type EditForm = {
  classId: string;
  trainerId: string;
  startTime: string;
  durationMinutes: number;
  status: "scheduled" | "completed" | "cancelled";
};

function toDatetimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function durationFromTimes(startTime: string, endTime: string) {
  const minutes = Math.round(
    (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60_000,
  );
  return minutes > 0 ? minutes : 45;
}

function statusVariant(status: string) {
  switch (status) {
    case "cancelled":
      return "destructive" as const;
    case "completed":
      return "secondary" as const;
    default:
      return "secondary" as const;
  }
}

export function AdminScheduleView({
  role,
  tenantSlug,
}: {
  role: "owner" | "admin" | "trainer" | "member";
  tenantSlug: string;
}) {
  const canManage = role === "owner" || role === "admin" || role === "trainer";
  const canPublish = role === "owner" || role === "admin";
  const canSetDuration = role === "owner" || role === "admin";
  const canManageClassTypes = role === "owner" || role === "admin";
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [classId, setClassId] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    classId: "",
    trainerId: "",
    startTime: "",
    durationMinutes: 45,
    status: "scheduled",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishInfo, setPublishInfo] = useState<{
    scheduleApi: string;
    embed: string;
    sessionsAdded: number;
    upcomingCount: number;
  } | null>(null);

  async function loadData() {
    const [scheduleRes, classRes, trainerRes] = await Promise.all([
      fetch("/api/schedules"),
      fetch("/api/classes"),
      fetch("/api/users?role=trainer,admin,owner&active=true"),
    ]);

    const scheduleData = await scheduleRes.json();
    const classData = await classRes.json();
    const trainerData = await trainerRes.json();

    setSchedules(scheduleData.schedules ?? []);
    setClasses(classData.classes ?? []);
    setTrainers(trainerData.users ?? []);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const selectedClass = classes.find((item) => item.id === classId);
    if (!selectedClass || !startTime) {
      setError("Choose a class and start time.");
      return;
    }

    if (canSetDuration && (durationMinutes < 5 || durationMinutes > 480)) {
      setError("Duration must be between 5 and 480 minutes.");
      return;
    }

    const sessionDuration = canSetDuration
      ? durationMinutes
      : selectedClass.durationMinutes;

    const start = new Date(startTime);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + sessionDuration);

    const response = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId,
        trainerId: trainerId || null,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Could not create schedule");
      return;
    }

    setMessage("Schedule created.");
    setStartTime("");
    await loadData();
  }

  function startEdit(item: Schedule) {
    setEditId(item.id);
    setEditForm({
      classId: item.classId,
      trainerId: item.trainerId ?? "",
      startTime: toDatetimeLocal(item.startTime),
      durationMinutes: durationFromTimes(item.startTime, item.endTime),
      status: item.status as EditForm["status"],
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

    const selectedClass = classes.find((item) => item.id === editForm.classId);
    if (!selectedClass || !editForm.startTime) {
      setError("Choose a class and start time.");
      return;
    }

    if (
      canSetDuration &&
      (editForm.durationMinutes < 5 || editForm.durationMinutes > 480)
    ) {
      setError("Duration must be between 5 and 480 minutes.");
      return;
    }

    const sessionDuration = canSetDuration
      ? editForm.durationMinutes
      : selectedClass.durationMinutes;

    const start = new Date(editForm.startTime);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + sessionDuration);

    const response = await fetch(`/api/schedules/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: editForm.classId,
        trainerId: editForm.trainerId || null,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        status: editForm.status,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not update schedule");
      return;
    }

    setMessage("Schedule updated.");
    setEditId(null);
    await loadData();
  }

  async function cancelSchedule(item: Schedule) {
    if (
      !window.confirm(
        `Cancel ${item.classTitle} on ${format(parseISO(item.startTime), "EEE d MMM HH:mm")}?`,
      )
    ) {
      return;
    }

    setMessage(null);
    setError(null);

    const response = await fetch(`/api/schedules/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not cancel schedule");
      return;
    }

    setMessage("Class cancelled.");
    if (editId === item.id) {
      setEditId(null);
    }
    await loadData();
  }

  async function publishSchedule() {
    setPublishing(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/schedules/publish", {
      method: "POST",
    });
    const data = await response.json();

    setPublishing(false);

    if (!response.ok) {
      setError(data.error ?? "Could not publish schedule");
      return;
    }

    setPublishInfo({
      scheduleApi: data.urls.scheduleApi,
      embed: data.urls.embed,
      sessionsAdded: data.sessionsAdded,
      upcomingCount: data.upcomingCount,
    });
    setMessage(
      data.sessionsAdded > 0
        ? `Published. Added ${data.sessionsAdded} session(s); ${data.upcomingCount} upcoming in the next 4 weeks.`
        : "Published. Your website feed is up to date.",
    );
    await loadData();
  }

  async function deleteSchedule(item: Schedule) {
    const bookingNote =
      item.confirmedCount > 0
        ? ` This will remove ${item.confirmedCount} booking(s).`
        : "";

    if (
      !window.confirm(
        `Delete ${item.classTitle} on ${format(parseISO(item.startTime), "EEE d MMM HH:mm")}?${bookingNote}`,
      )
    ) {
      return;
    }

    setMessage(null);
    setError(null);

    const response = await fetch(`/api/schedules/${item.id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not delete schedule");
      return;
    }

    setMessage("Schedule deleted.");
    if (editId === item.id) {
      setEditId(null);
    }
    await loadData();
  }

  const grouped = schedules.reduce<Record<string, Schedule[]>>((acc, item) => {
    const day = format(parseISO(item.startTime), "EEEE, d MMM");
    acc[day] = acc[day] ? [...acc[day], item] : [item];
    return acc;
  }, {});

  const selectedClassTitle = classes.find((item) => item.id === classId)?.title;
  const selectedTrainerName = trainers.find((item) => item.id === trainerId)?.fullName;
  const editClassTitle = classes.find((item) => item.id === editForm.classId)?.title;
  const editTrainerName = trainers.find(
    (item) => item.id === editForm.trainerId,
  )?.fullName;

  function handleClassChange(value: string | null) {
    const nextClassId = value ?? "";
    setClassId(nextClassId);

    const selectedClass = classes.find((item) => item.id === nextClassId);
    if (selectedClass) {
      setDurationMinutes(selectedClass.durationMinutes);
    }
  }

  function handleEditClassChange(value: string | null) {
    const nextClassId = value ?? "";
    const selectedClass = classes.find((item) => item.id === nextClassId);

    setEditForm((form) => ({
      ...form,
      classId: nextClassId,
      durationMinutes: selectedClass?.durationMinutes ?? form.durationMinutes,
    }));
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

      {canManageClassTypes ? (
        <AdminClassTypesView onUpdated={loadData} />
      ) : null}

      {canPublish ? (
        <Card>
          <CardHeader>
            <CardTitle>Publish to website</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Push the latest schedule to your public timetable and embed feed for{" "}
              <span className="font-medium text-foreground">{tenantSlug}</span>.
              Edits you make here are included; publish also fills the next 4 weeks
              from your weekly pattern.
            </p>
            <Button
              type="button"
              onClick={() => void publishSchedule()}
              disabled={publishing}
            >
              {publishing ? "Publishing…" : "Publish schedule"}
            </Button>
            {publishInfo ? (
              <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
                <p>
                  <span className="font-medium">Public API:</span>{" "}
                  <a
                    className="break-all underline"
                    href={publishInfo.scheduleApi}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {publishInfo.scheduleApi}
                  </a>
                </p>
                <p>
                  <span className="font-medium">Embed page:</span>{" "}
                  <a
                    className="break-all underline"
                    href={publishInfo.embed}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {publishInfo.embed}
                  </a>
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Add class to schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={createSchedule}>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select
                value={classId}
                onValueChange={handleClassChange}
                items={classes.map((item) => ({
                  value: item.id,
                  label: item.title,
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select class">
                    {selectedClassTitle}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {classes.map((item) => (
                    <SelectItem key={item.id} value={item.id} label={item.title}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Trainer</Label>
              <Select
                value={trainerId}
                onValueChange={(value) => setTrainerId(value ?? "")}
                items={trainers.map((item) => ({
                  value: item.id,
                  label: item.fullName,
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Optional trainer">
                    {selectedTrainerName}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {trainers.map((item) => (
                    <SelectItem
                      key={item.id}
                      value={item.id}
                      label={item.fullName}
                    >
                      {item.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start time</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                required
              />
            </div>
            {canSetDuration ? (
              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duration (minutes)</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  value={durationMinutes}
                  onChange={(event) =>
                    setDurationMinutes(Number(event.target.value))
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Defaults from the class type; change for this session only.
                </p>
              </div>
            ) : null}
            <div className={`flex items-end ${canSetDuration ? "md:col-span-2" : ""}`}>
              <Button type="submit">Create schedule</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {editId ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={saveEdit}>
              <div className="space-y-2">
                <Label>Class</Label>
                <Select
                  value={editForm.classId}
                  onValueChange={handleEditClassChange}
                  items={classes.map((item) => ({
                    value: item.id,
                    label: item.title,
                  }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{editClassTitle}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((item) => (
                      <SelectItem key={item.id} value={item.id} label={item.title}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Trainer</Label>
                <Select
                  value={editForm.trainerId}
                  onValueChange={(value) =>
                    setEditForm((form) => ({ ...form, trainerId: value ?? "" }))
                  }
                  items={trainers.map((item) => ({
                    value: item.id,
                    label: item.fullName,
                  }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Optional trainer">
                      {editTrainerName}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {trainers.map((item) => (
                      <SelectItem
                        key={item.id}
                        value={item.id}
                        label={item.fullName}
                      >
                        {item.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editStartTime">Start time</Label>
                <Input
                  id="editStartTime"
                  type="datetime-local"
                  value={editForm.startTime}
                  onChange={(event) =>
                    setEditForm((form) => ({
                      ...form,
                      startTime: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              {canSetDuration ? (
                <div className="space-y-2">
                  <Label htmlFor="editDurationMinutes">Duration (minutes)</Label>
                  <Input
                    id="editDurationMinutes"
                    type="number"
                    min={5}
                    max={480}
                    step={5}
                    value={editForm.durationMinutes}
                    onChange={(event) =>
                      setEditForm((form) => ({
                        ...form,
                        durationMinutes: Number(event.target.value),
                      }))
                    }
                    required
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) =>
                    setEditForm((form) => ({
                      ...form,
                      status: (value as EditForm["status"]) ?? "scheduled",
                    }))
                  }
                  items={[
                    { value: "scheduled", label: "Scheduled" },
                    { value: "completed", label: "Completed" },
                    { value: "cancelled", label: "Cancelled" },
                  ]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{editForm.status}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled" label="Scheduled">
                      Scheduled
                    </SelectItem>
                    <SelectItem value="completed" label="Completed">
                      Completed
                    </SelectItem>
                    <SelectItem value="cancelled" label="Cancelled">
                      Cancelled
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

      {Object.entries(grouped).map(([day, items]) => (
        <Card key={day}>
          <CardHeader>
            <CardTitle>{day}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Fill rate</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {format(parseISO(item.startTime), "HH:mm")} –{" "}
                      {format(parseISO(item.endTime), "HH:mm")}
                    </TableCell>
                    <TableCell>{item.classTitle}</TableCell>
                    <TableCell>{item.trainerName}</TableCell>
                    <TableCell>
                      {item.confirmedCount}/{item.capacity} ({item.fillRate}%)
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(item.status)}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    {canManage ? (
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(item)}
                          >
                            Edit
                          </Button>
                          {item.status === "scheduled" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void cancelSchedule(item)}
                            >
                              Cancel class
                            </Button>
                          ) : null}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => void deleteSchedule(item)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
