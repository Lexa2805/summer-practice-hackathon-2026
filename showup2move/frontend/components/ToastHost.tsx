"use client";

import { useEffect, useState } from "react";

type ToastTone = "success" | "error" | "info";

type ToastState = {
    message: string;
    tone: ToastTone;
};

const toneStyles: Record<ToastTone, string> = {
    success: "bg-primary text-primary-foreground",
    error: "bg-destructive text-destructive-foreground",
    info: "bg-muted text-foreground"
};

export function ToastHost() {
    const [toast, setToast] = useState<ToastState | null>(null);

    useEffect(() => {
        function handleToast(event: Event) {
            const detail = (event as CustomEvent<ToastState>).detail;
            if (!detail?.message) return;
            setToast({ message: detail.message, tone: detail.tone || "info" });
        }

        window.addEventListener("showup2move:toast", handleToast);
        return () => window.removeEventListener("showup2move:toast", handleToast);
    }, []);

    useEffect(() => {
        if (!toast) return undefined;
        const timer = window.setTimeout(() => setToast(null), 3200);
        return () => window.clearTimeout(timer);
    }, [toast]);

    if (!toast) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 max-w-xs rounded-lg px-4 py-3 text-sm font-semibold shadow-lg">
            <div className={`rounded-md px-3 py-2 ${toneStyles[toast.tone]}`}>{toast.message}</div>
        </div>
    );
}
