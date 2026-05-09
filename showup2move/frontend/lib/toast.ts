export type ToastTone = "success" | "error" | "info";

type ToastPayload = {
    message: string;
    tone?: ToastTone;
};

export function showToast(message: string, tone: ToastTone = "success") {
    if (typeof window === "undefined") return;
    const detail: ToastPayload = { message, tone };
    window.dispatchEvent(new CustomEvent("showup2move:toast", { detail }));
}
