"use client";

import { FormEvent, useEffect, useState } from "react";
import { SendHorizonal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { checkAchievements, getEventMessages, getGroupMessages } from "@/lib/api";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { Message } from "@/lib/types";
import { showToast } from "@/lib/toast";

export function ChatBox({
  title,
  initialMessages,
  currentUserId,
  targetId,
  targetType,
  onSend
}: {
  title: string;
  initialMessages: Message[];
  currentUserId: string;
  targetId: string;
  targetType: "group" | "event";
  onSend: (content: string) => Promise<Message>;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  function initials(name?: string) {
    return (name || "Player")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowserClient();
    // Group chat: filter on group_id. Supabase Realtime only supports one column filter,
    // so this may fire when event messages (which also carry group_id) are inserted.
    // That is safe: the handler re-fetches via getGroupMessages which filters event_id IS NULL server-side.
    // Event chat: filter on event_id — only event-specific messages trigger here.
    const filter = targetType === "group" ? `group_id=eq.${targetId}` : `event_id=eq.${targetId}`;
    const channel = supabase
      .channel(`${targetType}-chat-${targetId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter },
        async () => {
          try {
            const nextMessages =
              targetType === "group" ? await getGroupMessages(targetId) : await getEventMessages(targetId);
            if (active) setMessages(nextMessages);
          } catch {
            if (active) setError("Realtime update arrived, but messages could not refresh.");
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") setError("Realtime is unavailable. Messages still save normally.");
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [targetId, targetType]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    setError("");
    try {
      const saved = await onSend(content.trim());
      setMessages((current) => [...current.filter((message) => message.id !== saved.id), saved]);
      setContent("");
      const achievementResult = await checkAchievements(currentUserId);
      achievementResult.unlocked_now?.forEach((item) =>
        showToast(`Achievement unlocked: ${item.title}`, "success")
      );
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="min-h-[560px]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-[470px] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div
              key={message.id}
              className="flex max-w-[86%] gap-2 rounded-lg bg-muted px-3 py-2 data-[me=true]:ml-auto data-[me=true]:bg-primary data-[me=true]:text-primary-foreground"
              data-me={message.sender_id === currentUserId || message.sender?.id === currentUserId}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background/80 text-xs font-bold text-foreground">
                {message.sender?.avatar_url ? (
                  <img
                    src={message.sender.avatar_url}
                    alt={message.sender.full_name || "Sender avatar"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials(message.sender?.full_name || message.sender?.username || message.sender_name)
                )}
              </div>
              <div>
                <p className="text-xs font-semibold opacity-80">
                  {message.sender_id === currentUserId || message.sender?.id === currentUserId
                    ? "You"
                    : message.sender?.full_name || message.sender?.username || message.sender_name || "Player"}
                </p>
                <p className="mt-1 text-sm">{message.content}</p>
                <p className="mt-1 text-[11px] opacity-70">{new Date(message.created_at).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
          {!messages.length ? (
            <p className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
              No messages yet. Start the coordination.
            </p>
          ) : null}
        </div>
        <form onSubmit={sendMessage} className="mt-4 flex gap-2">
          <Input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={targetType === "group" ? "Message the group" : "Message about this event"}
          />
          <Button type="submit" size="icon" title="Send" disabled={sending}>
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </form>
        {error ? <p className="mt-3 text-sm font-medium text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
