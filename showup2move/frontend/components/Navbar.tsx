"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Dumbbell, LogOut, Plus, UserRound, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { getNotifications, getProfile } from "@/lib/api";
import { getCurrentSession, logout } from "@/lib/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

const navItems = [
  { href: "/dashboard", labelKey: "dashboard" },
  { href: "/showup", labelKey: "showup" },
  { href: "/groups", labelKey: "groups" },
  { href: "/events", labelKey: "events" }
];

export function Navbar() {
  const router = useRouter();
  const { language, setLanguage, t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let channel: RealtimeChannel | null = null;

    async function refreshProfileAvatar(nextUserId: string) {
      try {
        const profile = await getProfile(nextUserId);
        if (active) setProfileAvatarUrl(profile.avatar_url || null);
      } catch {
        if (active) setProfileAvatarUrl(null);
      }
    }

    async function loadNotifications() {
      try {
        const session = await getCurrentSession();
        if (!active || !session?.user) return;
        setUserId(session.user.id);
        await refreshProfileAvatar(session.user.id);
        const notifications = await getNotifications(session.user.id);
        if (!active) return;
        setUnreadCount(notifications.filter((notification) => !notification.read).length);

        const supabase = getSupabaseBrowserClient();
        channel = supabase
          .channel(`notifications-${session.user.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${session.user.id}`,
            },
            (payload) => {
              if (process.env.NODE_ENV === "development") console.log("Realtime notification received", payload);
              setUnreadCount((value) => value + 1);
            }
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${session.user.id}`,
            },
            async () => {
              const nextNotifications = await getNotifications(session.user.id);
              if (active) setUnreadCount(nextNotifications.filter((notification) => !notification.read).length);
            }
          )
          .subscribe((status) => {
            if (process.env.NODE_ENV === "development" && status === "SUBSCRIBED") {
              console.log(`Subscribed to notifications for user ${session.user.id}`);
            }
          });
      } catch {
        setUnreadCount(0);
      }
    }

    loadNotifications();

    function refreshFromProfileChange() {
      getCurrentSession().then((session) => {
        if (active && session?.user) refreshProfileAvatar(session.user.id);
      });
    }

    window.addEventListener("showup2move:profile-photo-updated", refreshFromProfileChange);
    window.addEventListener("focus", refreshFromProfileChange);

    return () => {
      active = false;
      window.removeEventListener("showup2move:profile-photo-updated", refreshFromProfileChange);
      window.removeEventListener("focus", refreshFromProfileChange);
      if (channel) getSupabaseBrowserClient().removeChannel(channel);
    };
  }, []);

  async function signOut() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Dumbbell className="h-5 w-5" aria-hidden />
          </span>
          <span>ShowUp2Move</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            title={theme === "dark" ? t("lightMode") : t("darkMode")}
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <div className="flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={language === "en" ? "text-foreground" : "text-muted-foreground"}
            >
              EN
            </button>
            <span className="text-muted-foreground">/</span>
            <button
              type="button"
              onClick={() => setLanguage("ro")}
              className={language === "ro" ? "text-foreground" : "text-muted-foreground"}
            >
              RO
            </button>
          </div>
          <Link href="/notifications" aria-label="Open notifications">
            <Button variant="outline" size="icon" title="Notifications">
              <span className="relative">
                <Bell className="h-4 w-4" />
                {userId && unreadCount > 0 ? (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </span>
            </Button>
          </Link>
          <Link href="/events" aria-label="Create event">
            <Button variant="accent" size="icon" title="Create event">
              <Plus className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/profile" aria-label="Edit profile">
            <Button variant="secondary" size="icon" title="Profile" className="overflow-hidden border border-border">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-5 w-5" />
              )}
            </Button>
          </Link>
          <Button variant="ghost" size="icon" title={t("logout")} onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
