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

type Schedule = {
  id: string;
  classTitle: string;
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

export function AdminScheduleView({
  role,
}: {
  role: "owner" | "admin" | "trainer" | "member";
}) {
  const canSetDuration = role === "owner" || role === "admin";
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [classId, setClassId] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    const [scheduleRes, classRes, trainerRes] = await Promise.all([
      fetch("/api/schedules"),
      fetch("/api/classes"),
      fetch("/api/users?role=trainer,admin,owner"),
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

    const selectedClass = classes.find((item) => item.id === classId);
    if (!selectedClass || !startTime) {
      setMessage("Choose a class and start time.");
      return;
    }

    if (
      canSetDuration &&
      (durationMinutes < 5 || durationMinutes > 480)
    ) {
      setMessage("Duration must be between 5 and 480 minutes.");
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
      setMessage(data.error ?? "Could not create schedule");
      return;
    }

    setMessage("Schedule created.");
    setStartTime("");
    await loadData();
  }

  const grouped = schedules.reduce<Record<string, Schedule[]>>((acc, item) => {
    const day = format(parseISO(item.startTime), "EEEE, d MMM");
    acc[day] = acc[day] ? [...acc[day], item] : [item];
    return acc;
  }, {});

  const selectedClassTitle = classes.find((item) => item.id === classId)?.title;
  const selectedTrainerName = trainers.find((item) => item.id === trainerId)?.fullName;

  function handleClassChange(value: string | null) {
    const nextClassId = value ?? "";
    setClassId(nextClassId);

    const selectedClass = classes.find((item) => item.id === nextClassId);
    if (selectedClass) {
      setDurationMinutes(selectedClass.durationMinutes);
    }
  }

  return (
    <div className="space-y-6">
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
          {message ? <p className="mt-3 text-sm">{message}</p> : null}
        </CardContent>
      </Card>

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
                      <Badge variant="secondary">{item.status}</Badge>
                    </TableCell>
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
