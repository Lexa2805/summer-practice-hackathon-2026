"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { EventItem } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

type EventsCalendarProps = {
  events: EventItem[];
  currentUserId: string;
  onEventClick?: (event: EventItem) => void;
};

export function EventsCalendar({ events, currentUserId, onEventClick }: EventsCalendarProps) {
  const { t } = useI18n();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const monthNames = [
    t("january"), t("february"), t("march"), t("april"), t("may"), t("june"),
    t("july"), t("august"), t("september"), t("october"), t("november"), t("december")
  ];

  const dayNames = [t("sun"), t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat")];

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((event) => {
      if (!event.event_time) return false;
      const eventDate = new Date(event.event_time);
      const eventDateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, "0")}-${String(eventDate.getDate()).padStart(2, "0")}`;
      return eventDateStr === dateStr;
    });
  };

  const isUserAttending = (event: EventItem) => {
    // Check if user is in participants list with "attending" status
    if (event.participants && event.participants.length > 0) {
      return event.participants.some(
        (p) => p.user_id === currentUserId && p.status === "attending"
      );
    }
    // Fallback: creator is always attending
    return event.created_by === currentUserId;
  };

  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="min-h-[80px] border border-border/50 bg-muted/20" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = getEventsForDay(day);
    const isToday =
      day === new Date().getDate() &&
      month === new Date().getMonth() &&
      year === new Date().getFullYear();

    calendarDays.push(
      <div
        key={day}
        className={`min-h-[80px] border border-border/50 bg-card p-1 ${
          isToday ? "ring-2 ring-primary" : ""
        }`}
      >
        <div className={`text-xs font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>
          {day}
        </div>
        <div className="mt-1 space-y-1">
          {dayEvents.map((event) => {
            const attending = isUserAttending(event);
            return (
              <button
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className={`w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium transition-colors hover:opacity-80 ${
                  attending
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
                title={`${event.title}${attending ? " (You're attending)" : ""}`}
              >
                {event.title}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">
          {monthNames[month]} {year}
        </h3>
        <div className="flex gap-2">
          <Button onClick={previousMonth} variant="outline" size="sm">
            ←
          </Button>
          <Button
            onClick={() => setCurrentDate(new Date())}
            variant="outline"
            size="sm"
          >
            {t("today")}
          </Button>
          <Button onClick={nextMonth} variant="outline" size="sm">
            →
          </Button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-px">
        {dayNames.map((dayName) => (
          <div
            key={dayName}
            className="py-2 text-center text-xs font-semibold text-muted-foreground"
          >
            {dayName}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px rounded-md border border-border bg-border">
        {calendarDays}
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-primary" />
          <span className="text-muted-foreground">{t("eventsYouAttending")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-muted" />
          <span className="text-muted-foreground">{t("otherEvents")}</span>
        </div>
      </div>
    </Card>
  );
}
