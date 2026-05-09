"use client";

import Link from "next/link";
import { Dumbbell, LogOut, MessageCircle, Plus, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/showup", label: "ShowUp" },
  { href: "/groups", label: "Groups" },
  { href: "/events", label: "Events" }
];

export function Navbar() {
  const router = useRouter();

  async function signOut() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
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
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/chat" aria-label="Open chat">
            <Button variant="outline" size="icon" title="Group chat">
              <MessageCircle className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/events" aria-label="Create event">
            <Button variant="accent" size="icon" title="Create event">
              <Plus className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/profile" aria-label="Edit profile">
            <Button variant="secondary" size="icon" title="Profile">
              <UserRound className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" title="Logout" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
