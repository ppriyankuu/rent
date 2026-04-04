interface GenerateUPILinkParams {
    upiId: string;
    name: string;
    amount: number;
    note: string;
    transactionRef?: string;
}

/**
 * Generate a UPI deep link (upi://pay?...) for payment.
 * Works on mobile (opens UPI app) and as QR code source (desktop).
 *
 * Spec-compliant format:
 *   upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...&tr=...&mode=00
 */
export function generateUPILink(params: GenerateUPILinkParams): string {
    const base = "upi://pay";

    // Build params manually — URLSearchParams encodes spaces as '+',
    // which many UPI apps reject.
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

    // mode=00 → default / normal payment mode
    parts.push("mode=00");

    return `${base}?${parts.join("&")}`;
}

