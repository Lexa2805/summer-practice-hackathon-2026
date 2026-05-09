"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MessageCircle, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorMessage } from "@/components/ui/error-state";
import { LoadingPage } from "@/components/ui/loading-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { getDirectConversations } from "@/lib/api";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import type { DirectConversation } from "@/lib/types";
import { useAuthProfile } from "@/lib/use-auth-profile";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function MessagesPage() {
  const { user, loading, error } = useAuthProfile();
  const { t } = useI18n();
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [dataError, setDataError] = useState("");

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setDataError("");
    try {
      setConversations(await getDirectConversations(user.id));
    } catch (loadError) {
      setDataError(loadError instanceof Error ? loadError.message : t("messagesPage.backendUnavailable"));
    }
  }, [t, user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`direct-conversations-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, () => {
        loadConversations();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_conversations" }, () => {
        loadConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConversations, user]);

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
        <ErrorMessage message={error || t("errors.loginRequired")} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:px-8">
      <PageHeader
        label={t("messagesPage.label")}
        title={t("messagesPage.title")}
        subtitle={t("messagesPage.subtitle")}
      />
      {dataError ? <ErrorMessage message={dataError || t("messagesPage.couldNotLoad")} className="mb-6" /> : null}
      <div className="grid gap-3">
        {conversations.length ? (
          conversations.map((conversation) => {
            const otherUser = conversation.other_user;
            const displayName = otherUser.full_name || otherUser.username || t("common.player");
            return (
              <Link key={conversation.id} href={`/messages/${conversation.id}`}>
                <Card className="transition-colors hover:border-primary/40 hover:bg-primary/5">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                      {otherUser.avatar_url ? (
                        <img src={otherUser.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        initials(displayName)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate font-bold">{displayName}</p>
                        {conversation.unread_count ? (
                          <Badge className="bg-primary text-primary-foreground">
                            {conversation.unread_count > 9 ? "9+" : conversation.unread_count}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {conversation.last_message || t("messagesPage.noMessages")}
                      </p>
                      {conversation.last_message_at ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(conversation.last_message_at).toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        ) : (
          <EmptyState
            icon={user ? MessageCircle : UserRound}
            title={t("messagesPage.noDirectMessages")}
            description={t("messagesPage.noDirectDescription")}
          />
        )}
      </div>
    </main>
  );
}
