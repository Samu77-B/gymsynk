"use client";

import { format, parseISO } from "date-fns";
import { useCallback, useEffect, useState } from "react";

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
  waitlistCount: number;
  status: string;
};

type Booking = {
  id: string;
  scheduleId: string;
  bookingStatus: "confirmed" | "waitlisted" | "cancelled";
  waitlistPosition: number | null;
};

type Pack = {
  id: string;
  label: string;
  status: string;
  unlimited: boolean;
  remaining: number | null;
  sessionsPerPeriod: number | null;
  currentPeriodEnd: string;
  tier: { id: string; name: string } | null;
};

export function MemberBookingView() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [scheduleResponse, bookingResponse, packResponse] = await Promise.all([
      fetch("/api/schedules"),
      fetch("/api/bookings"),
      fetch("/api/member-packs"),
    ]);

    const scheduleData = await scheduleResponse.json();
    const bookingData = await bookingResponse.json();
    const packData = await packResponse.json();

    setSchedules(scheduleData.schedules ?? []);
    setBookings(bookingData.bookings ?? []);
    setPacks(packData.packs ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function bookClass(scheduleId: string) {
    setMessage(null);
    setPendingId(scheduleId);

    try {
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

      if (data.booking.bookingStatus === "waitlisted") {
        setMessage(
          "Added to the waitlist. We'll move you up automatically if a spot frees up.",
        );
      } else {
        setMessage(
          data.packUsed
            ? `Booked using 1 session from your ${data.packUsed.label} pack.`
            : "Booked successfully. Payment is due at the gym.",
        );
      }
      await load();
    } finally {
      setPendingId(null);
    }
  }

  async function cancelBooking(booking: Booking) {
    setMessage(null);
    setPendingId(booking.scheduleId);

    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Cancellation failed");
        return;
      }

      setMessage(
        booking.bookingStatus === "waitlisted"
          ? "Removed from the waitlist."
          : "Booking cancelled.",
      );
      await load();
    } finally {
      setPendingId(null);
    }
  }

  const activePacks = packs.filter((pack) => pack.status === "active");

  return (
    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
      {activePacks.length > 0 ? (
        <div className="flex flex-wrap gap-2 md:col-span-2">
          {activePacks.map((pack) => (
            <span
              key={pack.id}
              className="rounded-md border bg-muted px-3 py-2 text-sm"
            >
              <span className="font-medium">
                {pack.tier?.name ?? "All classes"}
              </span>{" "}
              ·{" "}
              {pack.unlimited
                ? "Unlimited sessions"
                : `${pack.remaining ?? 0} of ${pack.sessionsPerPeriod ?? 0} sessions left`}{" "}
              <span className="text-muted-foreground">
                until {format(parseISO(pack.currentPeriodEnd), "d MMM")}
              </span>
            </span>
          ))}
        </div>
      ) : null}

      {message ? (
        <p className="rounded-md border bg-muted px-3 py-2 text-sm md:col-span-2">
          {message}
        </p>
      ) : null}

      {schedules.map((schedule) => {
        const booking = bookings.find(
          (row) => row.scheduleId === schedule.id,
        );
        const isFull = schedule.spotsLeft === 0;
        const isPending = pendingId === schedule.id;
        const isOpen = schedule.status === "scheduled";

        return (
          <Card key={schedule.id} className="flex h-full flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-lg">{schedule.classTitle}</CardTitle>
                {booking ? (
                  <Badge
                    variant={
                      booking.bookingStatus === "confirmed"
                        ? "default"
                        : "outline"
                    }
                  >
                    {booking.bookingStatus === "confirmed"
                      ? "Booked"
                      : `Waitlist #${booking.waitlistPosition ?? "—"}`}
                  </Badge>
                ) : (
                  <Badge variant="secondary">{schedule.status}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between space-y-3">
              <p className="text-sm text-muted-foreground">
                {format(parseISO(schedule.startTime), "EEE d MMM · HH:mm")} –{" "}
                {format(parseISO(schedule.endTime), "HH:mm")}
              </p>
              <p className="text-sm">Trainer: {schedule.trainerName}</p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">
                  £{Number(schedule.price).toFixed(2)} ·{" "}
                  {isFull
                    ? `Full${
                        schedule.waitlistCount > 0
                          ? ` · ${schedule.waitlistCount} waiting`
                          : ""
                      }`
                    : `${schedule.spotsLeft} spots left`}
                </span>
                {booking ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => void cancelBooking(booking)}
                  >
                    {booking.bookingStatus === "waitlisted"
                      ? "Leave waitlist"
                      : "Cancel"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant={isFull ? "secondary" : "default"}
                    disabled={!isOpen || isPending}
                    onClick={() => void bookClass(schedule.id)}
                  >
                    {isFull ? "Join waitlist" : "Book"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {schedules.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground md:col-span-2">
          No upcoming classes in the next 7 days.
        </p>
      ) : null}
    </div>
  );
}
