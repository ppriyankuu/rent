/**
 * POST /api/payments/initiate         → tenant: create UPI payment for rent
 * POST /api/payments/submit-utr       → tenant: submit UTR after UPI payment
 * GET  /api/payments/my               → tenant: get payment history
 * GET  /api/payments/my/pending       → tenant: get current pending UPI payment
 * GET  /api/payments/my/:id/receipt   → tenant: get receipt data for a payment
 * POST /api/payments/manual           → admin: record manual (cash/UPI) payment
 * GET  /api/payments                  → admin: list all payments
 * GET  /api/payments/tenant/:tenantId → admin: get payments for a specific tenant
 * POST /api/payments/admin/verify     → admin: verify/reject UPI payment
 * GET  /api/payments/admin/pending    → admin: list pending UPI verifications
 * POST /api/payments/webhooks/telegram → telegram: handle callback queries
 * POST /api/payments/webhook          → razorpay: webhook (for deposits)
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and, desc, count, like, or, isNull, ne } from "drizzle-orm";
import type { Env } from "../types/env";
import type { JwtPayload } from "../types/api";
import { ok, err } from "../types/api";
import { createDb } from "../db/client";
import { payments, bookings, users, beds, rooms } from "../db/schema";
import {
    initiatePaymentSchema,
    submitUtrSchema,
    adminVerifyPaymentSchema,
    manualPaymentSchema,
    paginationSchema,
    type PaginatedResponse,
} from "../validators";
import { requireAuth, requireAdmin } from "../middleware/auth";
import {
    initiateRentPayment,
    verifyAndCompletePayment,
    recordManualPayment,
    getTenantPayments,
    handleWebhookPayment,
    submitUTRForVerification,
    adminVerifyUPIPayment,
    getPendingVerificationPayments,
} from "../services/payment.service";
import { sendUTRNotification } from "../services/telegram.service";
import { nowISO } from "../utils";

type Variables = { user: JwtPayload };

const paymentsRoute = new Hono<{ Bindings: Env; Variables: Variables; ExecutionCtx: ExecutionContext }>();

// ─── POST /api/payments/initiate — TENANT ────────────────────
paymentsRoute.post(
    "/initiate",
    requireAuth(),
    zValidator("json", initiatePaymentSchema),
    async (c) => {
        const { sub: tenantId } = c.get("user");
        const { rentMonth } = c.req.valid("json");

        try {
            const result = await initiateRentPayment(
                createDb(c.env.rent),
                tenantId,
                rentMonth,
                c.env.UPI_ID,
                c.env.UPI_PAYEE_NAME
            );
            return c.json(ok(result), 201);
        } catch (e) {
            const message = e instanceof Error ? e.message : "Payment initiation failed";
            return c.json(err(message), 400);
        }
    }
);

// ─── POST /api/payments/submit-utr — TENANT ──────────────────
paymentsRoute.post(
    "/submit-utr",
    requireAuth(),
    zValidator("json", submitUtrSchema),
    async (c) => {
        const { sub: tenantId } = c.get("user");
        const { utr } = c.req.valid("json");
        const db = createDb(c.env.rent);

        try {
            const result = await submitUTRForVerification(db, tenantId, utr);

            // Get payment details for Telegram notification
            const payment = await db
                .select({
                    id: payments.id,
                    amount: payments.amount,
                    lateFee: payments.lateFee,
                    rentMonth: payments.rentMonth,
                    tenantId: payments.tenantId,
                    bookingId: payments.bookingId,
                })
                .from(payments)
                .where(eq(payments.id, result.paymentId))
                .get();

            if (payment) {
                // Get tenant details
                const tenant = await db
                    .select({ name: users.name, email: users.email })
                    .from(users)
                    .where(eq(users.id, payment.tenantId))
                    .get();

                const booking = await db
                    .select()
                    .from(bookings)
                    .where(eq(bookings.id, payment.bookingId))
                    .get();

                let roomName: string | undefined;
                let bedName: string | undefined;
                if (booking) {
                    const bed = await db.select().from(beds).where(eq(beds.id, booking.bedId)).get();
                    if (bed) {
                        bedName = bed.name;
                        const room = await db.select().from(rooms).where(eq(rooms.id, bed.roomId)).get();
                        if (room) roomName = room.name;
                    }
                }

                // Send Telegram notification (non-blocking, kept alive via waitUntil)
                if (tenant) {
                    c.executionCtx.waitUntil(
                        sendUTRNotification(c.env, {
                            tenantName: tenant.name,
                            tenantEmail: tenant.email,
                            roomName,
                            bedName,
                            amount: payment.amount,
                            rentMonth: payment.rentMonth,
                            lateFee: payment.lateFee,
                            utr: result.utr,
                            paymentId: result.paymentId,
                            submittedAt: nowISO(),
                        })
                    );
                }
            }

            return c.json(ok({ message: "UTR submitted successfully. Awaiting verification.", ...result }), 201);
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to submit UTR";
            return c.json(err(message), 400);
        }
    }
);

// ─── GET /api/payments/my — TENANT ───────────────────────────
paymentsRoute.get("/my", requireAuth(), async (c) => {
    const { sub: tenantId } = c.get("user");
    const db = createDb(c.env.rent);

    const history = await getTenantPayments(db, tenantId);
    return c.json(ok(history));
});

// ─── GET /api/payments/my/pending — TENANT ───────────────────
paymentsRoute.get("/my/pending", requireAuth(), async (c) => {
    const { sub: tenantId } = c.get("user");
    const db = createDb(c.env.rent);

    // Get the single most recent UPI payment for this tenant
    const latestPayment = await db
        .select()
        .from(payments)
        .where(
            and(
                eq(payments.tenantId, tenantId),
                eq(payments.type, "upi")
            )
        )
        .orderBy(desc(payments.createdAt))
        .get();

    if (!latestPayment) {
        return c.json(ok(null));
    }

    // If the latest payment is completed, tenant is all caught up
    if (latestPayment.status === "completed") {
        return c.json(ok(null));
    }

    // Return if it needs tenant attention:
    // - Pending, no UTR yet (needs to pay + submit)
    // - Pending, UTR submitted (awaiting admin)
    // - Rejected (needs to see reason and re-initiate)
    if (
        latestPayment.status === "pending" ||
        latestPayment.verificationStatus === "rejected"
    ) {
        return c.json(ok(latestPayment));
    }

    return c.json(ok(null));
});

// ─── GET /api/payments/my/:id/receipt — TENANT ───────────────
paymentsRoute.get("/my/:id/receipt", requireAuth(), async (c) => {
    const { sub: tenantId } = c.get("user");
    const paymentId = parseInt(c.req.param("id"), 10);

    if (isNaN(paymentId)) return c.json(err("Invalid payment ID"), 400);

    const db = createDb(c.env.rent);

    const payment = await db
        .select()
        .from(payments)
        .where(and(eq(payments.id, paymentId), eq(payments.tenantId, tenantId)))
        .get();

    if (!payment) return c.json(err("Payment not found"), 404);

    const tenant = await db
        .select({ id: users.id, name: users.name, email: users.email, phone: users.phone })
        .from(users)
        .where(eq(users.id, tenantId))
        .get();

    const booking = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, payment.bookingId))
        .get();

    const bed = booking
        ? await db.select().from(beds).where(eq(beds.id, booking.bedId)).get()
        : null;

    const room = bed
        ? await db.select().from(rooms).where(eq(rooms.id, bed.roomId)).get()
        : null;

    return c.json(
        ok({
            receiptNumber: `RCP-${payment.id.toString().padStart(6, "0")}`,
            tenant,
            room: room?.name ?? "N/A",
            bed: bed?.name ?? "N/A",
            rentMonth: payment.rentMonth,
            rentAmount: payment.amount - payment.lateFee,
            lateFee: payment.lateFee,
            totalAmount: payment.amount,
            paymentType: payment.type,
            paidAt: payment.paidAt,
            razorpayPaymentId: payment.razorpayPaymentId,
        })
    );
});

// ─── POST /api/payments/manual — ADMIN ───────────────────────
paymentsRoute.post(
    "/manual",
    requireAdmin(),
    zValidator("json", manualPaymentSchema),
    async (c) => {
        const { sub: adminId } = c.get("user");
        const { tenantId, amount, rentMonth, notes } = c.req.valid("json");

        try {
            const payment = await recordManualPayment(
                createDb(c.env.rent),
                tenantId,
                amount,
                rentMonth,
                adminId,
                notes
            );
            return c.json(ok(payment), 201);
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to record payment";
            return c.json(err(message), 400);
        }
    }
);

// ─── GET /api/payments — ADMIN ────────────────────────────────
paymentsRoute.get("/", requireAdmin(), zValidator("query", paginationSchema), async (c) => {
    const { page, limit, search } = c.req.valid("query");
    const db = createDb(c.env.rent);
    const offset = (page - 1) * limit;

    const totalResult = await db.select({ count: count() }).from(payments).get();
    const total = totalResult?.count ?? 0;

    const paymentList = await db
        .select({
            id: payments.id,
            tenantId: payments.tenantId,
            tenantName: users.name,
            tenantEmail: users.email,
            bookingId: payments.bookingId,
            amount: payments.amount,
            lateFee: payments.lateFee,
            rentMonth: payments.rentMonth,
            type: payments.type,
            status: payments.status,
            utr: payments.utr,
            verificationStatus: payments.verificationStatus,
            razorpayOrderId: payments.razorpayOrderId,
            razorpayPaymentId: payments.razorpayPaymentId,
            notes: payments.notes,
            paidAt: payments.paidAt,
            createdAt: payments.createdAt,
            roomName: rooms.name,
            bedName: beds.name,
        })
        .from(payments)
        .leftJoin(users, eq(payments.tenantId, users.id))
        .leftJoin(bookings, eq(payments.bookingId, bookings.id))
        .leftJoin(beds, eq(bookings.bedId, beds.id))
        .leftJoin(rooms, eq(beds.roomId, rooms.id))
        .orderBy(desc(payments.createdAt))
        .limit(limit)
        .offset(offset)
        .all();

    const totalPages = Math.ceil(total / limit);

    const response: PaginatedResponse<typeof paymentList[0]> = {
        data: paymentList,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };

    return c.json(ok(response));
});

// ─── GET /api/payments/tenant/:tenantId — ADMIN ───────────────
paymentsRoute.get("/tenant/:tenantId", requireAdmin(), async (c) => {
    const tenantId = parseInt(c.req.param("tenantId"), 10);
    if (isNaN(tenantId)) return c.json(err("Invalid tenant ID"), 400);

    const db = createDb(c.env.rent);
    const history = await getTenantPayments(db, tenantId);

    return c.json(ok(history));
});

// ─── POST /api/payments/admin/verify — ADMIN ─────────────────
paymentsRoute.post(
    "/admin/verify",
    requireAdmin(),
    zValidator("json", adminVerifyPaymentSchema),
    async (c) => {
        const { sub: adminId } = c.get("user");
        const body = c.req.valid("json");

        try {
            const payment = await adminVerifyUPIPayment(
                createDb(c.env.rent),
                body.paymentId,
                adminId,
                body.action,
                body.rejectionReason
            );
            return c.json(ok({ message: `Payment ${body.action}ed successfully`, payment }));
        } catch (e) {
            const message = e instanceof Error ? e.message : `Failed to ${body.action} payment`;
            return c.json(err(message), 400);
        }
    }
);

// ─── GET /api/payments/admin/pending — ADMIN ─────────────────
paymentsRoute.get("/admin/pending", requireAdmin(), async (c) => {
    const db = createDb(c.env.rent);
    const pending = await getPendingVerificationPayments(db);

    const enriched = await Promise.all(
        pending.map(async (p) => {
            const tenant = await db
                .select({ name: users.name, email: users.email })
                .from(users)
                .where(eq(users.id, p.tenantId))
                .get();
            const booking = await db
                .select()
                .from(bookings)
                .where(eq(bookings.id, p.bookingId))
                .get();
            let roomName: string | undefined;
            let bedName: string | undefined;
            if (booking) {
                const bed = await db.select().from(beds).where(eq(beds.id, booking.bedId)).get();
                if (bed) {
                    bedName = bed.name;
                    const room = await db.select().from(rooms).where(eq(rooms.id, bed.roomId)).get();
                    if (room) roomName = room.name;
                }
            }
            return { ...p, tenantName: tenant?.name, tenantEmail: tenant?.email, roomName, bedName };
        })
    );

    return c.json(ok(enriched));
});

// ─── POST /api/payments/webhooks/telegram — TELEGRAM ─────────
paymentsRoute.post("/webhooks/telegram", async (c) => {
    try {
        const body = await c.req.json();

        if (body.callback_query) {
            const callbackData = body.callback_query.data;
            const callbackQueryId = body.callback_query.id;
            const chatId = body.callback_query.message.chat.id;
            const messageId = body.callback_query.message.message_id;
            const db = createDb(c.env.rent);
            const botToken = c.env.TELEGRAM_BOT_TOKEN;

            if (callbackData?.startsWith("verify_payment:")) {
                const paymentId = parseInt(callbackData.split(":")[1], 10);
                if (isNaN(paymentId)) {
                    return c.json(err("Invalid payment ID"), 400);
                }

                try {
                    await adminVerifyUPIPayment(db, paymentId, 0, "verify");

                    // Edit message to show result
                    const editRes = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chat_id: chatId,
                            message_id: messageId,
                            text: `✅ Payment #${paymentId} has been confirmed.`,
                        }),
                    });
                    if (!editRes.ok) {
                        console.error(`Telegram editMessageText failed: ${await editRes.text()}`);
                    }
                } catch (error) {
                    console.error(`Error verifying payment #${paymentId}:`, error);
                    const editRes = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chat_id: chatId,
                            message_id: messageId,
                            text: `❌ Error verifying payment #${paymentId}.`,
                        }),
                    });
                    return c.json(err(String(error)), 500);
                }

                // Answer callback to dismiss the loading indicator
                await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ callback_query_id: callbackQueryId }),
                });

                return c.json(ok({ message: "Payment verified via Telegram" }));
            } else if (callbackData?.startsWith("reject_payment:")) {
                const paymentId = parseInt(callbackData.split(":")[1], 10);
                if (isNaN(paymentId)) {
                    return c.json(err("Invalid payment ID"), 400);
                }

                try {
                    await adminVerifyUPIPayment(db, paymentId, 0, "reject", "Rejected via Telegram");

                    const editRes = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chat_id: chatId,
                            message_id: messageId,
                            text: `❌ Payment #${paymentId} has been rejected.`,
                        }),
                    });
                    if (!editRes.ok) {
                        console.error(`Telegram editMessageText failed: ${await editRes.text()}`);
                    }
                } catch (error) {
                    console.error(`Error rejecting payment #${paymentId}:`, error);
                    const editRes = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chat_id: chatId,
                            message_id: messageId,
                            text: `❌ Error rejecting payment #${paymentId}.`,
                        }),
                    });
                    return c.json(err(String(error)), 500);
                }

                await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ callback_query_id: callbackQueryId }),
                });

                return c.json(ok({ message: "Payment rejected via Telegram" }));
            }

            return c.json(ok({ message: "Unknown callback action" }));
        }

        return c.json(ok({ message: "Webhook received" }));
    } catch (e) {
        console.error("Telegram webhook error:", e);
        return c.json(err("Webhook processing error"), 500);
    }
});

// ─── POST /api/payments/webhook — RAZORPAY WEBHOOK ────────────
paymentsRoute.post("/webhook", async (c) => {
    const signature = c.req.header("X-Razorpay-Signature");
    if (!signature) {
        return c.json(err("Missing signature"), 400);
    }

    try {
        const rawBody = await c.req.text();
        const db = createDb(c.env.rent);

        const result = await handleWebhookPayment(
            db,
            rawBody,
            signature,
            c.env.RAZORPAY_KEY_SECRET
        );

        if (result.success) {
            return c.json(ok({ message: "Webhook processed successfully" }));
        } else {
            return c.json(err(result.error || "Webhook processing failed"), 400);
        }
    } catch (e) {
        console.error("Webhook error:", e);
        return c.json(err("Webhook processing error"), 500);
    }
});

export default paymentsRoute;
