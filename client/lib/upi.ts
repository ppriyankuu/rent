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
 *
 * Spec-compliant format:
 *   upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...&tr=...&mode=00
 */
export function generateUPILink(params: GenerateUPILinkParams): string {
    const base = "upi://pay";

    // Build params manually to control encoding precisely.
    // URLSearchParams encodes spaces as '+', which many UPI apps reject.
    const parts: string[] = [
        `pa=${encodeURIComponent(params.upiId)}`,
        `pn=${encodeURIComponent(params.name)}`,
        `am=${params.amount.toFixed(2)}`,
        `cu=INR`,
        `tn=${encodeURIComponent(params.note)}`,
    ];

    if (params.transactionRef) {
        parts.push(`tr=${encodeURIComponent(params.transactionRef)}`);
    }

    // mode=00 → default / normal payment. Required by many UPI apps
    // for the "Pay" button to appear; without it some apps treat
    // the link as informational only.
    parts.push("mode=00");

    return `${base}?${parts.join("&")}`;
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
 *
 * Chrome on Android handles intent:// URIs more reliably
 * than custom upi:// scheme navigations. The intent must include:
 *   - scheme=upi
 *   - action=android.intent.action.VIEW
 *   - category=android.intent.category.BROWSABLE  ← required for web origins
 *   - S.browser_fallback_url  ← prevents Chrome ERR_UNKNOWN_URL_SCHEME
 */
export function toAndroidIntentLink(upiLink: string): string {
    const withoutScheme = upiLink.replace(/^upi:\/\//, "");
    return [
        `intent://${withoutScheme}`,
        "#Intent",
        "scheme=upi",
        "action=android.intent.action.VIEW",
        "category=android.intent.category.BROWSABLE",
        "end",
    ].join(";");
}

/**
 * Open a UPI app on mobile. Uses window.location for maximum
 * compatibility — <a href> doesn't reliably trigger intents on
 * all Android browsers.
 */
export function openUPIApp(upiLink: string): void {
    if (isAndroid()) {
        window.location.href = toAndroidIntentLink(upiLink);
    } else {
        window.location.href = upiLink;
    }
}
