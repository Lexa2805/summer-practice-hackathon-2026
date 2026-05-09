"use client";

import { useCallback, useEffect, useState } from "react";

import { EventCard } from "@/components/EventCard";
import { EventForm } from "@/components/EventForm";
import { getEvents, getSports } from "@/lib/api";
import type { EventItem, Sport } from "@/lib/types";
import { useAuthProfile } from "@/lib/use-auth-profile";

export default function EventsPage() {
  const { user, loading, error } = useAuthProfile();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [dataError, setDataError] = useState("");

  const loadData = useCallback(async () => {
    setDataError("");
    try {
      const [nextEvents, nextSports] = await Promise.all([getEvents(), getSports()]);
      setEvents(nextEvents);
      setSports(nextSports);
    } catch (loadError) {
      setDataError(loadError instanceof Error ? loadError.message : "Could not load events.");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-8 text-muted-foreground">Loading events...</main>;
  }

  if (error || !user) {
    return <main className="mx-auto max-w-6xl px-4 py-8 text-destructive">{error || "Login required."}</main>;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Manual planning</p>
        <h1 className="mt-2 text-4xl font-black">Events</h1>
      </div>
      {dataError ? (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {dataError}
        </p>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <EventForm sports={sports} userId={user.id} onCreated={loadData} />
        <section>
          <h2 className="mb-3 text-2xl font-black">Open events</h2>
          <div className="grid gap-4">
            {events.length ? (
              events.map((event) => <EventCard key={event.id} event={event} />)
            ) : (
              <p className="rounded-md border bg-card p-5 text-sm text-muted-foreground">No events yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
