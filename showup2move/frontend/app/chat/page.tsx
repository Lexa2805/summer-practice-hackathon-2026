"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGroups } from "@/lib/api";
import type { Group } from "@/lib/types";
import { useAuthProfile } from "@/lib/use-auth-profile";

export default function ChatPage() {
  const { user, loading, error } = useAuthProfile();
  const [groups, setGroups] = useState<Group[]>([]);
  const [dataError, setDataError] = useState("");

  const loadGroups = useCallback(async () => {
    if (!user) return;
    setDataError("");
    try {
      setGroups(await getGroups(user.id));
    } catch (loadError) {
      setDataError(loadError instanceof Error ? loadError.message : "Could not load chats.");
    }
  }, [user]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  if (loading) {
    return <main className="mx-auto max-w-4xl px-4 py-8 text-muted-foreground">Loading chats...</main>;
  }

  if (error || !user) {
    return <main className="mx-auto max-w-4xl px-4 py-8 text-destructive">{error || "Login required."}</main>;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Coordination</p>
        <h1 className="mt-2 text-4xl font-black">Chats</h1>
      </div>
      {dataError ? (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {dataError}
        </p>
      ) : null}
      <div className="grid gap-4">
        {groups.length ? (
          groups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <CardTitle>{group.sport_name || "Matched group"}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {group.member_count || group.members?.length || 0} members
                </p>
                <Link href={`/groups/${group.id}/chat`}>
                  <Button>
                    <MessageCircle className="h-4 w-4" />
                    Open chat
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="rounded-md border bg-card p-5 text-sm text-muted-foreground">
            Chats appear once you are matched into a group.
          </p>
        )}
      </div>
    </main>
  );
}
