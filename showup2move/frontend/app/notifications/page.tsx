"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorMessage } from "@/components/ui/error-state";
import { LoadingPage } from "@/components/ui/loading-skeleton";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/api";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { NotificationItem } from "@/lib/types";
import { useAuthProfile } from "@/lib/use-auth-profile";

export default function NotificationsPage() {
  const { user, loading, error } = useAuthProfile();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dataError, setDataError] = useState("");

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setDataError("");
    try {
      setNotifications(await getNotifications(user.id));
    } catch (loadError) {
      setDataError(loadError instanceof Error ? loadError.message : "Could not load notifications. Please check if the backend is running.");
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`notifications-page-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (process.env.NODE_ENV === "development") console.log("Realtime notification received", payload);
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications, user]);

  async function markRead(notificationId: string) {
    try {
      const updated = await markNotificationRead(notificationId);
      setNotifications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (readError) {
      setDataError(readError instanceof Error ? readError.message : "Could not mark notification as read.");
    }
  }

  async function markAllRead() {
    if (!user) return;
    try {
      await markAllNotificationsRead(user.id);
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    } catch (readError) {
      setDataError(readError instanceof Error ? readError.message : "Could not mark notifications as read.");
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

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:px-8">
      <PageHeader
        label="REMINDERS"
        title="Notifications"
        action={
          notifications.some((notification) => !notification.read) ? (
            <Button type="button" variant="secondary" onClick={markAllRead}>
              <Check className="h-4 w-4" />
              Mark all as read
            </Button>
          ) : null
        }
      />
      {dataError ? <ErrorMessage message={dataError} className="mb-6" /> : null}
      <div className="grid gap-3">
        {notifications.length ? (
          notifications.map((notification) => (
            <Card key={notification.id} className={notification.read ? "" : "border-primary/40 bg-primary/5"}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="h-4 w-4 text-primary" />
                  {notification.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{notification.message}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
                <div className="flex flex-wrap gap-2">
                  {notification.related_group_id ? (
                    <Link href={`/groups/${notification.related_group_id}/chat`}>
                      <Button size="sm" variant="secondary">Open group chat</Button>
                    </Link>
                  ) : null}
                  {notification.related_event_id ? (
                    <Link href={`/events/${notification.related_event_id}/chat`}>
                      <Button size="sm" variant="secondary">Open event chat</Button>
                    </Link>
                  ) : null}
                  {!notification.read ? (
                    <Button size="sm" variant="outline" onClick={() => markRead(notification.id)}>
                      <Check className="h-4 w-4" />
                      Mark read
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="You'll see updates about groups, events, and matches here."
          />
        )}
      </div>
    </main>
  );
}
