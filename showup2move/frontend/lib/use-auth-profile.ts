"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { getProfile } from "@/lib/api";
import { getCurrentSession } from "@/lib/auth";
import type { Profile } from "@/lib/types";

export function useAuthProfile({ requireProfile = true }: { requireProfile?: boolean } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const session = await getCurrentSession();
        if (!active) return;

        if (!session?.user) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }

        setUser(session.user);
        try {
          const currentProfile = await getProfile(session.user.id);
          if (!active) return;
          setProfile(currentProfile);
        } catch {
          if (!active) return;
          if (requireProfile) {
            router.replace("/profile");
            return;
          }
          setProfile(null);
        }
      } catch (authError) {
        if (!active) return;
        setError(authError instanceof Error ? authError.message : "Could not check login status.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [pathname, requireProfile, router]);

  return { user, profile, loading, error };
}
