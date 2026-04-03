interface GenerateUPILinkParams {
    upiId: string;
    name: string;
    amount: number;
    note: string;
    transactionRef?: string;
}

/**
 * Generate a UPI deep link. Same logic as server-side version,
 * kept on client for convenience (no sensitive data involved).
 */
export function generateUPILink(params: GenerateUPILinkParams): string {
    const base = "upi://pay";
    const searchParams = new URLSearchParams({
        pa: params.upiId,
        pn: params.name,
        am: params.amount.toFixed(2),
        cu: "INR",
        tn: params.note,
    });

    if (params.transactionRef) {
        searchParams.set("tr", params.transactionRef);
    }

    return `${base}?${searchParams.toString()}`;
}

/**
 * Check if the current device supports UPI deep links.
 * Returns true on mobile browsers (Android/iOS).
 */
export function supportsUPIIntent(): boolean {
    if (typeof window === "undefined") return false;
    const ua = navigator.userAgent;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}
