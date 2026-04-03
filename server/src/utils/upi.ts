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
        const trValue = encodeURIComponent(params.transactionRef);
        return `${base}?${encoded}&tr=${trValue}`;
    }

    return `${base}?${encoded}`;
}
