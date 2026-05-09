"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarPlus, MessageCircle } from "lucide-react";

import { ChatBox } from "@/components/ChatBox";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorMessage } from "@/components/ui/error-state";
import { LoadingPage } from "@/components/ui/loading-skeleton";
import { getGroupMessages, sendGroupMessage } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Message } from "@/lib/types";
import { useAuthProfile } from "@/lib/use-auth-profile";

export default function GroupChatPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = params.groupId;
  const { user, loading, error } = useAuthProfile();
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [dataError, setDataError] = useState("");

  useEffect(() => {
    async function loadMessages() {
      if (!groupId) return;
      setDataError("");
      try {
        setMessages(await getGroupMessages(groupId));
      } catch (loadError) {
        setDataError(loadError instanceof Error ? loadError.message : "Chat could not load. Please check if the backend is running.");
      }
    }

    loadMessages();
  }, [groupId]);

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
        href="/groups"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to groups
      </Link>
      <PageHeader
        label="GROUP COORDINATION"
        title="Group chat"
        action={
          <Link href={`/events?group_id=${groupId}`}>
            <Button variant="accent" size="sm">
              <CalendarPlus className="h-4 w-4" />
              {t("createEvent")}
            </Button>
          </Link>
        }
      />
      {dataError ? <ErrorMessage message={dataError} className="mb-6" /> : null}
      <ChatBox
        title="Group chat"
        initialMessages={messages}
        currentUserId={user.id}
        targetId={groupId}
        targetType="group"
        onSend={(content) => sendGroupMessage(groupId, user.id, content)}
      />
    </main>
  );
}
