"use client";

import { useEffect, useState } from "react";

import { ChatBox } from "@/components/ChatBox";
import { GroupCard } from "@/components/GroupCard";
import { getGroups, getMessages } from "@/lib/api";
import type { Group, Message } from "@/lib/types";
import { useAuthProfile } from "@/lib/use-auth-profile";

export default function ChatPage() {
  const { user, loading, error } = useAuthProfile();
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const nextGroups = await getGroups(user.id);
      setGroups(nextGroups);
      setMessages(await getMessages(nextGroups[0]?.id));
    }

    loadData();
  }, [user]);

  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-8 text-muted-foreground">Loading chat...</main>;
  }

  if (error || !user) {
    return <main className="mx-auto max-w-6xl px-4 py-8 text-destructive">{error || "Login required."}</main>;
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[0.7fr_1.3fr]">
      <aside>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Coordination</p>
        <h1 className="mt-2 text-4xl font-black">Group chat</h1>
        <div className="mt-6 space-y-4">
          {groups.length ? (
            groups.slice(0, 2).map((group) => <GroupCard key={group.id} group={group} currentUserId={user.id} />)
          ) : (
            <p className="rounded-md border bg-card p-5 text-sm text-muted-foreground">
              Chat is ready once you have a group.
            </p>
          )}
        </div>
      </aside>
      <ChatBox initialMessages={messages} />
    </main>
  );
}
