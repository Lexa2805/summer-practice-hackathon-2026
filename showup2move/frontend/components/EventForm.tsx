"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEvent } from "@/lib/api";
import type { Sport } from "@/lib/types";

export function EventForm({ sports, userId, onCreated }: { sports: Sport[]; userId: string; onCreated?: () => void }) {
  const [title, setTitle] = useState("Pickup game");
  const [sportId, setSportId] = useState(sports[0]?.id || "running");
  const [location, setLocation] = useState("Local sports court");
  const [time, setTime] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!sportId && sports[0]?.id) setSportId(sports[0].id);
  }, [sportId, sports]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sport = sports.find((item) => item.id === sportId);
    await createEvent({
      title,
      sport_id: sportId,
      sport_name: sport?.name,
      created_by: userId,
      location_name: location,
      event_time: time ? new Date(time).toISOString() : null,
      price_estimate: 0
    });
    setSaved(true);
    onCreated?.();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create manual event</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sport">Sport</Label>
            <select
              id="sport"
              value={sportId}
              onChange={(event) => setSportId(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {sports.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={location} onChange={(event) => setLocation(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Event time</Label>
            <Input id="time" type="datetime-local" value={time} onChange={(event) => setTime(event.target.value)} />
          </div>
          <Button type="submit">
            <Plus className="h-4 w-4" />
            Create event
          </Button>
          {saved ? <p className="text-sm font-medium text-primary">Event created.</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
