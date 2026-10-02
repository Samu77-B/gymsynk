"use client";

import Link from "next/link";
import { addDays, format, parseISO } from "date-fns";
import { useCallback, useEffect, useState } from "react";

import {
  formatScheduleWeekLabel,
  scheduleWeekQueryParams,
  startOfScheduleWeek,
} from "@/lib/schedule-range";

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
  const [weekStart, setWeekStart] = useState(() => startOfScheduleWeek());
  const [weekInitialized, setWeekInitialized] = useState(false);

  const load = useCallback(async () => {
    if (!weekInitialized) {
      return;
    }
    const { start, end } = scheduleWeekQueryParams(weekStart);
    const scheduleQuery = new URLSearchParams({ start, end });

    const [scheduleResponse, bookingResponse, packResponse] = await Promise.all([
      fetch(`/api/schedules?${scheduleQuery.toString()}`),
      fetch("/api/bookings"),
      fetch("/api/member-packs"),
    ]);

    const scheduleData = await scheduleResponse.json();
    const bookingData = await bookingResponse.json();
    const packData = await packResponse.json();

    setSchedules(scheduleData.schedules ?? []);
    setBookings(bookingData.bookings ?? []);
    setPacks(packData.packs ?? []);
  }, [weekStart, weekInitialized]);

  useEffect(() => {
    async function bootstrapWeek() {
      const response = await fetch("/api/schedules");
      const json = await response.json();

      if (response.ok && json.suggestedWeekStart) {
        setWeekStart(startOfScheduleWeek(parseISO(json.suggestedWeekStart)));
      }

      setWeekInitialized(true);
    }

    void bootstrapWeek();
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
        if (response.status === 402 && data.buyCredits) {
          setMessage(
            `${data.error ?? "You need credits to book."} Visit Credits to buy a package.`,
          );
        } else {
          setMessage(data.error ?? "Booking failed");
        }
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
  const creditsLeft = activePacks.reduce((sum, pack) => {
    if (pack.unlimited) {
      return sum;
    }

    return sum + Math.max(pack.remaining ?? 0, 0);
  }, 0);
  const lowCredits =
    activePacks.length > 0 &&
    !activePacks.some((pack) => pack.unlimited) &&
    creditsLeft <= 2;

  return (
    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Classes this week</p>
            <p className="text-sm text-muted-foreground">
              {formatScheduleWeekLabel(weekStart)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setWeekStart((current) => addDays(current, -7))
              }
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWeekStart(startOfScheduleWeek())}
            >
              This week
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWeekStart((current) => addDays(current, 7))}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      {lowCredits ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 md:col-span-2">
          {creditsLeft === 0
            ? "You have no class credits left."
            : `Only ${creditsLeft} credit${creditsLeft === 1 ? "" : "s"} left.`}{" "}
          <Link className="font-medium underline" href="/member/credits">
            Buy more credits
          </Link>
        </p>
      ) : null}
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
          No classes this week. Try Next week if you are booking ahead (e.g.
          opening week).
        </p>
      ) : null}
    </div>
  );
}
