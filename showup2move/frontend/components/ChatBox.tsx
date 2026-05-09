"use client";

import { FormEvent, useEffect, useState } from "react";
import { SendHorizonal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Message } from "@/lib/types";

export function ChatBox({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [content, setContent] = useState("");

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim()) return;
    setMessages((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        group_id: "demo-running-group",
        sender_name: "You",
        content: content.trim(),
        created_at: new Date().toISOString()
      }
    ]);
    setContent("");
  }

  return (
    <Card className="min-h-[560px]">
      <CardHeader>
        <CardTitle>Running group chat</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-[470px] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div
              key={message.id}
              className="max-w-[82%] rounded-lg bg-muted px-3 py-2 data-[me=true]:ml-auto data-[me=true]:bg-primary data-[me=true]:text-primary-foreground"
              data-me={message.sender_name === "You"}
            >
              <p className="text-xs font-semibold opacity-80">{message.sender_name}</p>
              <p className="mt-1 text-sm">{message.content}</p>
            </div>
          ))}
        </div>
        <form onSubmit={sendMessage} className="mt-4 flex gap-2">
          <Input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Message the group"
          />
          <Button type="submit" size="icon" title="Send">
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
