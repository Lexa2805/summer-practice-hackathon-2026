"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ChatBox } from "@/components/ChatBox";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorMessage } from "@/components/ui/error-state";
import { LoadingPage } from "@/components/ui/loading-skeleton";
import { getEvent, getEventMessages, sendEventMessage } from "@/lib/api";
import type { EventItem, Message } from "@/lib/types";
import { useAuthProfile } from "@/lib/use-auth-profile";

export default function EventChatPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const { user, loading, error } = useAuthProfile();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [dataError, setDataError] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!eventId) return;
      setDataError("");
      try {
        const [loadedEvent, loadedMessages] = await Promise.all([
          getEvent(eventId),
          getEventMessages(eventId),
        ]);
        setEvent(loadedEvent);
        setMessages(loadedMessages);
      } catch (loadError) {
        setDataError(loadError instanceof Error ? loadError.message : "Event chat could not load. Please check if the backend is running.");
      }
    }

    loadData();
  }, [eventId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 md:px-8">
        <LoadingPage />
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 md:px-8">
        <ErrorMessage message={error || "Login required."} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:px-8">
      <Link
        href="/events"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to events
      </Link>
      <PageHeader
        label="EVENT COORDINATION"
        title={event?.title ? `Event chat: ${event.title}` : "Event chat"}
        subtitle={event?.location_name}
      />
      {event?.group_id ? (
        <Link
          href={`/groups/${event.group_id}/chat`}
          className="mb-6 inline-block text-sm font-medium text-primary hover:underline"
        >
          Open group chat →
        </Link>
      ) : null}
      {dataError ? <ErrorMessage message={dataError} className="mb-6" /> : null}
      <ChatBox
        title={event?.title ? `Event chat: ${event.title}` : "Event chat"}
        initialMessages={messages}
        currentUserId={user.id}
        targetId={eventId}
        targetType="event"
        onSend={(content) => sendEventMessage(eventId, user.id, content)}
      />
    </main>
  );
}
