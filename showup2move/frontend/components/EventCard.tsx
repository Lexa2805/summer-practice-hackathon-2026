import { CalendarClock, MapPin, WalletCards } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EventItem } from "@/lib/types";

export function EventCard({ event }: { event: EventItem }) {
  const when = event.event_time ? new Date(event.event_time).toLocaleString() : "Time pending";
  const isPast = event.event_time ? new Date(event.event_time) < new Date() : false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle>{event.title}</CardTitle>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge className="border-accent/30 bg-accent/10 text-foreground">
              {event.sport_name || "Sport"}
            </Badge>
            {event.event_time ? (
              <Badge className="bg-muted text-foreground">{isPast ? "Past" : "Upcoming"}</Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          {event.location_name || "Location pending"}
        </p>
        <p className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          {when}
        </p>
        <p className="flex items-center gap-2">
          <WalletCards className="h-4 w-4 text-primary" />
          {event.price_estimate ? `${event.price_estimate} RON estimate` : "Free or split later"}
        </p>
      </CardContent>
    </Card>
  );
}
