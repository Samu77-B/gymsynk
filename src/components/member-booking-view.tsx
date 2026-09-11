"use client";

import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Schedule = {
  id: string;
  classTitle: string;
  trainerName: string;
  startTime: string;
  endTime: string;
  price: string;
  spotsLeft: number;
  status: string;
};

export function MemberBookingView() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function loadSchedules() {
    const response = await fetch("/api/schedules");
    const data = await response.json();
    setSchedules(data.schedules ?? []);
  }

  useEffect(() => {
    void loadSchedules();
  }, []);

  async function bookClass(scheduleId: string) {
    setMessage(null);

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleId }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Booking failed");
      return;
    }

    setMessage(
      data.booking.bookingStatus === "waitlisted"
        ? "Added to waitlist."
        : "Booked successfully.",
    );
    await loadSchedules();
  }

  return (
    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
      {message ? (
        <p className="rounded-md border bg-muted px-3 py-2 text-sm md:col-span-2">
          {message}
        </p>
      ) : null}

      {schedules.map((schedule) => (
        <Card key={schedule.id} className="flex h-full flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-lg">{schedule.classTitle}</CardTitle>
              <Badge variant="secondary">{schedule.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {format(parseISO(schedule.startTime), "EEE d MMM · HH:mm")} –{" "}
              {format(parseISO(schedule.endTime), "HH:mm")}
            </p>
            <p className="text-sm">Trainer: {schedule.trainerName}</p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">
                £{Number(schedule.price).toFixed(2)} · {schedule.spotsLeft} spots left
              </span>
              <Button
                size="sm"
                disabled={schedule.status !== "scheduled" || schedule.spotsLeft === 0}
                onClick={() => void bookClass(schedule.id)}
              >
                Book
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {schedules.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground md:col-span-2">
          No upcoming classes in the next 7 days.
        </p>
      ) : null}
    </div>
  );
}
