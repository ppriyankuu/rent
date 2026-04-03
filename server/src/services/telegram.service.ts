import type { Env } from "../types/env";

interface TelegramMessageParams {
    tenantName: string;
    tenantEmail: string;
    roomName?: string;
    bedName?: string;
    amount: number;
    rentMonth: string;
    lateFee: number;
    utr: string;
    paymentId: number;
    submittedAt: string;
}

/**
 * Send a Telegram notification when a tenant submits a UTR.
 * Includes inline buttons for quick verify/reject actions.
 */
export async function sendUTRNotification(env: Env, params: TelegramMessageParams): Promise<void> {
    const token = env.TELEGRAM_BOT_TOKEN ?? "8763018412:AAECDvpOhRPMb_MQOMdbii71btnEhlQ67b4";
    const chatId = env.TELEGRAM_CHAT_ID ?? "5086234408";

    if (!token || !chatId) {
        console.warn("Telegram credentials not configured, skipping notification");
        return;
    }

    const totalAmount = params.amount + params.lateFee;
    const formattedDate = new Date(params.submittedAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    const message = `🏠 New Rent Payment Submitted

👤 Tenant: ${params.tenantName} (${params.tenantEmail})
${params.roomName && params.bedName ? `🛏️ Room: ${params.roomName} - ${params.bedName}` : ""}
💰 Amount: ₹${totalAmount.toLocaleString()}
📅 Month: ${params.rentMonth}
${params.lateFee > 0 ? `⏰ Late Fee: ₹${params.lateFee}` : ""}
🆔 UTR: ${params.utr}
⏱️ Submitted: ${formattedDate}
📋 Payment ID: ${params.paymentId}`;

    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "✅ Confirm",
                                callback_data: `verify_payment:${params.paymentId}`,
                            },
                            {
                                text: "❌ Reject",
                                callback_data: `reject_payment:${params.paymentId}`,
                            },
                        ],
                    ],
                },
            }),
        });

        if (!res.ok) {
            const errorBody = await res.text();
            console.error(`Telegram API error (${res.status}): ${errorBody}`);
        }
    } catch (error) {
        console.error("Failed to send Telegram notification:", error);
    }
}
