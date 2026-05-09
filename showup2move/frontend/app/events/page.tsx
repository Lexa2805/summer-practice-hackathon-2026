"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { EventCard } from "@/components/EventCard";
import { EventForm } from "@/components/EventForm";
import { EventsCalendar } from "@/components/EventsCalendar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorMessage, SuccessMessage } from "@/components/ui/error-state";
import { LoadingPage } from "@/components/ui/loading-skeleton";
import { SectionCard } from "@/components/ui/section-card";
import { deleteEvent, getEvents, getGroups, getSports } from "@/lib/api";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { EventItem, Group, Sport } from "@/lib/types";
import { useAuthProfile } from "@/lib/use-auth-profile";
import { useI18n } from "@/lib/i18n";

function EventsContent() {
  const { user, profile, loading, error } = useAuthProfile();
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const preselectedGroupId = searchParams.get("group_id") ?? "";

  const [events, setEvents] = useState<EventItem[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [dataError, setDataError] = useState("");
  const [message, setMessage] = useState("");
  const [deletingEventId, setDeletingEventId] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  const loadData = useCallback(async () => {
    if (!user) return;
    setDataError("");
    try {
      const [nextEvents, nextSports, nextGroups] = await Promise.all([
        getEvents(user.id),
        getSports(),
        getGroups(user.id)
      ]);
      setEvents(nextEvents);
      setSports(nextSports);
      setGroups(nextGroups);
    } catch (loadError) {
      setDataError(loadError instanceof Error ? loadError.message : "Could not load events. Please check if the backend is running.");
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    const eventsChannel = supabase
      .channel(`events-page-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, (payload) => {
        if (process.env.NODE_ENV === "development") console.log("Realtime event change received", payload);
        loadData();
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") setDataError("Realtime event updates are unavailable.");
      });

    const notificationsChannel = supabase
      .channel(`event-notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (process.env.NODE_ENV === "development") console.log("Realtime notification received", payload);
          const notification = payload.new as { type?: string; title?: string };
          if (notification.type === "event_created" || notification.type === "event_deleted") {
            setMessage(notification.title || "Event update received.");
            loadData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [loadData, user]);

  async function removeEvent(event: EventItem) {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    setDeletingEventId(event.id);
    setDataError("");
    setMessage("");
    try {
      await deleteEvent(event.id, user!.id);
      setEvents((current) => current.filter((item) => item.id !== event.id));
      setMessage("Event deleted successfully.");
    } catch (deleteError) {
      setDataError(deleteError instanceof Error ? deleteError.message : "Failed to delete event. Try again.");
    } finally {
      setDeletingEventId("");
    }
  }

  if (loading) {
    return <LoadingPage />;
  }

  if (error || !user) {
    return <ErrorMessage message={error || "Login required."} />;
  }

  return (
    <>
      {dataError ? <ErrorMessage message={dataError} className="mb-6" /> : null}
      {message ? <SuccessMessage message={message} className="mb-6" /> : null}
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <EventForm
          sports={sports}
          groups={groups}
          userId={user.id}
          city={profile?.city}
          preselectedGroupId={preselectedGroupId}
          onCreated={loadData}
        />
        <SectionCard
          title={t("openEvents")}
          action={
            <div className="flex gap-2">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                {t("list")}
              </Button>
              <Button
                variant={viewMode === "calendar" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("calendar")}
              >
                {t("calendar")}
              </Button>
            </div>
          }
        >
          {viewMode === "calendar" ? (
            <EventsCalendar
              events={events}
              currentUserId={user.id}
              onEventClick={(event) => {
                const eventCard = document.getElementById(`event-${event.id}`);
                if (eventCard) {
                  setViewMode("list");
                  setTimeout(() => eventCard.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
                }
              }}
            />
          ) : (
            <div className="grid gap-4">
              {events.length ? (
                events.map((event) => (
                  <div key={event.id} id={`event-${event.id}`}>
                    <EventCard
                      event={event}
                      currentUserId={user.id}
                      city={profile?.city}
                      showWeather
                      canDelete={event.created_by === user.id || event.group_captain_id === user.id}
                      deleting={deletingEventId === event.id}
                      onDelete={removeEvent}
                    />
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={CalendarDays}
                  title={t("noEvents")}
                  description="Create your first event using the form on the left."
                />
              )}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}

export default function EventsPage() {
  const { t } = useI18n();
  
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <PageHeader
        label="MANUAL PLANNING"
        title={t("events")}
        subtitle="Create events for your groups, invite friends, and coordinate activities."
      />
      <Suspense fallback={<LoadingPage />}>
        <EventsContent />
      </Suspense>
    </main>
  );
}
