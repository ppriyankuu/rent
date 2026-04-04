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

    // URLSearchParams encodes spaces as '+', which many UPI apps reject.
    // Replace '+' with '%20' for proper encoding.
    const encoded = searchParams.toString().replace(/\+/g, "%20");

    if (params.transactionRef) {
        // Need to re-encode tr separately since replace above handles the full string
        const trValue = encodeURIComponent(params.transactionRef);
        return `${base}?${encoded}&tr=${trValue}`;
    }

    return `${base}?${encoded}`;
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

/**
 * Check if the device is Android.
 */
export function isAndroid(): boolean {
    if (typeof window === "undefined") return false;
    return /Android/i.test(navigator.userAgent);
}

/**
 * Convert a upi:// link to an Android intent:// URI.
 * Chrome on Android handles intent:// URIs more reliably
 * than custom upi:// scheme navigations.
 */
export function toAndroidIntentLink(upiLink: string): string {
    const withoutScheme = upiLink.replace(/^upi:\/\//, "");
    return `intent://${withoutScheme}#Intent;scheme=upi;action=android.intent.action.VIEW;end`;
}
