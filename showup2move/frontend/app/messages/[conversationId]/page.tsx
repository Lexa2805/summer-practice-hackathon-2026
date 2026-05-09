"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, SendHorizonal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorMessage } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { LoadingPage } from "@/components/ui/loading-skeleton";
import {
  getDirectConversations,
  getDirectMessages,
  markDirectMessagesRead,
  sendDirectMessage,
} from "@/lib/api";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { DirectConversation, DirectMessage, DirectUser } from "@/lib/types";
import { useAuthProfile } from "@/lib/use-auth-profile";

function initials(name?: string) {
  return (name || "Player")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function DirectChatPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const { user, profile, loading, error } = useAuthProfile();
  const [conversation, setConversation] = useState<DirectConversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [dataError, setDataError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!conversationId || !user) return;
      setDataError("");
      try {
        const [loadedConversations, loadedMessages] = await Promise.all([
          getDirectConversations(user.id),
          getDirectMessages(conversationId, user.id),
        ]);
        setConversation(loadedConversations.find((item) => item.id === conversationId) || null);
        setMessages(loadedMessages);
        await markDirectMessagesRead(conversationId, user.id);
      } catch (loadError) {
        setDataError(loadError instanceof Error ? loadError.message : "Could not load messages.");
      }
    }

    loadData();
  }, [conversationId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    if (!conversationId || !user) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`direct-chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const incoming = payload.new as DirectMessage;
          setMessages((current) => [
            ...current.filter((message) => message.id !== incoming.id),
            incoming,
          ]);
          if (incoming.sender_id !== user.id) {
            try {
              await markDirectMessagesRead(conversationId, user.id);
            } catch {
              setDataError("Realtime message arrived, but read status could not update.");
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") setDataError("Realtime is unavailable. Messages still save normally.");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim() || !user) return;
    setSending(true);
    setDataError("");
    try {
      const saved = await sendDirectMessage(conversationId, user.id, content.trim());
      setMessages((current) => [...current.filter((message) => message.id !== saved.id), saved]);
      setContent("");
    } catch (sendError) {
      setDataError(sendError instanceof Error ? sendError.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

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

  const otherUser = conversation?.other_user;
  const title = otherUser?.full_name || otherUser?.username || "Direct message";
  const subtitle = otherUser?.city ? `From ${otherUser.city}` : "Private conversation";

  function senderFor(message: DirectMessage): DirectUser | undefined {
    if (message.sender_id === user.id) {
      return profile
        ? {
            id: profile.id,
            full_name: profile.full_name,
            username: profile.username,
            avatar_url: profile.avatar_url,
            city: profile.city,
          }
        : undefined;
    }
    return otherUser;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:px-8">
      <Link
        href="/messages"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to messages
      </Link>

      <Card className="min-h-[640px]">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
              {otherUser?.avatar_url ? (
                <img src={otherUser.avatar_url} alt={title} className="h-full w-full object-cover" />
              ) : (
                initials(title)
              )}
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate">{title}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-[540px] flex-col p-5">
          {dataError ? <ErrorMessage message={dataError} className="mb-4" /> : null}
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.map((message) => {
              const mine = message.sender_id === user.id;
              const sender = message.sender || senderFor(message);
              const senderName = mine ? "You" : sender?.full_name || sender?.username || title;
              return (
                <div
                  key={message.id}
                  className="flex max-w-[86%] gap-2 rounded-lg bg-muted px-3 py-2 data-[me=true]:ml-auto data-[me=true]:bg-primary data-[me=true]:text-primary-foreground"
                  data-me={mine}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background/80 text-xs font-bold text-foreground">
                    {sender?.avatar_url ? (
                      <img src={sender.avatar_url} alt={senderName} className="h-full w-full object-cover" />
                    ) : (
                      initials(senderName)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold opacity-80">{senderName}</p>
                    <p className="mt-1 break-words text-sm">{message.content}</p>
                    <p className="mt-1 text-[11px] opacity-70">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              );
            })}
            {!messages.length ? (
              <p className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
                No messages yet. Say hello and plan the next move.
              </p>
            ) : null}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={handleSend} className="mt-4 flex gap-2">
            <Input
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Message this teammate"
            />
            <Button type="submit" size="icon" title="Send" disabled={sending}>
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
