"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarClock, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { acceptInvite, getInvite } from "@/lib/api";
import { getCurrentSession } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { showToast } from "@/lib/toast";
import type { InviteDetails } from "@/lib/types";

export default function InvitePage() {
    const params = useParams<{ token: string }>();
    const token = params.token;
    const router = useRouter();
    const { t } = useI18n();

    const [invite, setInvite] = useState<InviteDetails | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [checkingSession, setCheckingSession] = useState(true);
    const [error, setError] = useState("");
    const [accepting, setAccepting] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        let active = true;
        async function loadInvite() {
            setError("");
            try {
                const data = await getInvite(token);
                if (active) setInvite(data);
            } catch (loadError) {
                if (active) setError(loadError instanceof Error ? loadError.message : "Invite not found.");
            }
        }

        if (token) loadInvite();
        return () => {
            active = false;
        };
    }, [token]);

    useEffect(() => {
        let active = true;
        async function loadSession() {
            try {
                const session = await getCurrentSession();
                if (active) setUserId(session?.user.id || null);
            } catch {
                if (active) setUserId(null);
            } finally {
                if (active) setCheckingSession(false);
            }
        }

        loadSession();
        return () => {
            active = false;
        };
    }, []);

    async function accept() {
        if (!userId) {
            router.push(`/login?next=/invite/${token}`);
            return;
        }
        setAccepting(true);
        setError("");
        setMessage("");
        try {
            await acceptInvite(token, userId);
            setMessage("Invite accepted. See you at the event!");
            showToast("Invite accepted.", "success");
        } catch (acceptError) {
            setError(acceptError instanceof Error ? acceptError.message : "Failed to accept invite.");
        } finally {
            setAccepting(false);
        }
    }

    function copyLink() {
        const link = window.location.href;
        navigator.clipboard.writeText(link).then(
            () => showToast("Link copied.", "success"),
            () => window.prompt("Copy invite link", link)
        );
    }

    if (checkingSession) {
        return <main className="mx-auto max-w-4xl px-4 py-10 text-muted-foreground">Loading invite...</main>;
    }

    if (error) {
        return <main className="mx-auto max-w-4xl px-4 py-10 text-destructive">{error}</main>;
    }

    if (!invite) {
        return <main className="mx-auto max-w-4xl px-4 py-10 text-muted-foreground">Invite not ready.</main>;
    }

    return (
        <main className="mx-auto max-w-4xl px-4 py-10">
            <div className="mb-6">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Event invite</p>
                <h1 className="mt-2 text-4xl font-black">You are invited</h1>
                <p className="mt-2 text-muted-foreground">
                    {invite.event?.title || "Event"} {invite.status ? `(${invite.status})` : ""}
                </p>
            </div>

            <div className="rounded-md border bg-card p-5 text-sm">
                <p className="text-lg font-semibold">{invite.event?.title || "ShowUp2Move event"}</p>
                <div className="mt-3 space-y-2 text-muted-foreground">
                    <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        {invite.event?.location_name || "Location pending"}
                    </p>
                    <p className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-primary" />
                        {invite.event?.event_time ? new Date(invite.event.event_time).toLocaleString() : "Time pending"}
                    </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={accept} disabled={accepting}>
                        {accepting ? "Accepting..." : t("acceptInvite")}
                    </Button>
                    <Button variant="outline" onClick={copyLink}>
                        {t("copyLink")}
                    </Button>
                    <Link href="/events">
                        <Button variant="ghost">Back to events</Button>
                    </Link>
                </div>
                {message ? <p className="mt-3 text-sm font-medium text-primary">{message}</p> : null}
                {error ? <p className="mt-3 text-sm font-medium text-destructive">{error}</p> : null}
            </div>
        </main>
    );
}
