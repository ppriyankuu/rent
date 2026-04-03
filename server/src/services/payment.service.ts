import { eq, and, desc, or, isNull } from "drizzle-orm";
import type { DrizzleDb } from "../db/client";
import { payments, bookings, users, beds } from "../db/schema";
import { nowISO, generateReceiptNumber, verifyRazorpaySignature } from "../utils";
import { generateUPILink } from "../utils/upi";
import { getSetting } from "./settings.service";
import { createRazorpayOrder } from "./razorpay.service";
import type { Payment } from "../db/schema";

// ─── Types ────────────────────────────────────────────────────

export interface InitiatePaymentResult {
    paymentId: number;
    upiLink: string;
    amount: number;
    currency: string;
    tenantName: string;
    tenantEmail: string;
    rentMonth: string;
}

export interface SubmitUTRResult {
    paymentId: number;
    utr: string;
}

// ─── Service Functions ────────────────────────────────────────

/**
 * Step 1: Initiate online rent payment.
 * Creates a pending UPI payment record + generates UPI link.
 * Returns info needed by frontend to show UPI checkout modal.
 */
export async function initiateRentPayment(
    db: DrizzleDb,
    tenantId: number,
    rentMonth: string,
    upiId: string,
    upiPayeeName: string
): Promise<InitiatePaymentResult> {
    // Get active booking for this tenant
    const booking = await db
        .select()
        .from(bookings)
        .where(and(
            eq(bookings.tenantId, tenantId),
            or(eq(bookings.status, "active"), eq(bookings.status, "deposit_paid"))
        ))
        .get();

    if (!booking) throw new Error("No active booking found for this tenant");

    const moveInMonth = booking.moveInDate.slice(0, 7);
    if (rentMonth < moveInMonth) {
        throw new Error(`Cannot pay rent for ${rentMonth}: tenant moved in on ${moveInMonth}`);
    }

    // Get tenant details
    const tenant = await db
        .select()
        .from(users)
        .where(eq(users.id, tenantId))
        .get();

    if (!tenant) throw new Error("Tenant not found");
    if (tenant.isActive === false) throw new Error("Your account has been deactivated. Please contact the administrator.");

    // Check for duplicate payment for same month and booking (completed)
    const existing = await db
        .select()
        .from(payments)
        .where(
            and(
                eq(payments.tenantId, tenantId),
                eq(payments.bookingId, booking.id),
                eq(payments.rentMonth, rentMonth),
                eq(payments.status, "completed")
            )
        )
        .get();

    if (existing) throw new Error(`Rent for ${rentMonth} already paid`);

    // Check for existing pending UPI payment for same month.
    // If found, delete it — the amount may be stale if rent was updated.
    const existingPending = await db
        .select()
        .from(payments)
        .where(
            and(
                eq(payments.tenantId, tenantId),
                eq(payments.bookingId, booking.id),
                eq(payments.rentMonth, rentMonth),
                eq(payments.status, "pending"),
                eq(payments.type, "upi")
            )
        )
        .orderBy(desc(payments.createdAt))
        .get();

    if (existingPending) {
        // Delete stale pending payment so a fresh one with correct amount is created below.
        // If the tenant already submitted a UTR (verificationStatus === "pending"), don't delete — return it.
        if (existingPending.verificationStatus === "pending") {
            const upiLink = generateUPILink({
                upiId,
                name: upiPayeeName,
                amount: existingPending.amount,
                note: `Rent ${rentMonth}`,
                transactionRef: `pay_${existingPending.id}`,
            });

            return {
                paymentId: existingPending.id,
                upiLink,
                amount: existingPending.amount,
                currency: "INR",
                tenantName: tenant.name,
                tenantEmail: tenant.email,
                rentMonth,
            };
        }
        // No UTR submitted yet — delete the stale record
        await db.delete(payments).where(eq(payments.id, existingPending.id));
    }

    // Check if this is the first rent payment for this booking
    const previousPayments = await db
        .select({ id: payments.id })
        .from(payments)
        .where(
            and(
                eq(payments.bookingId, booking.id),
                eq(payments.status, "completed")
            )
        )
        .get();

    // Calculate late fee based on grace period and whether it's the first payment
    const lateFeeRaw = await getSetting(db, "late_fee_amount");
    const rentDueStartDay = parseInt(await getSetting(db, "rent_due_start_day"), 10);
    const rentDueEndDay = parseInt(await getSetting(db, "rent_due_end_day"), 10);
    const windowLength = rentDueEndDay - rentDueStartDay + 1;
    const [rentYear, rentMonthNum] = rentMonth.split("-").map(Number);
    let rentDueDate: Date;

    if (!previousPayments) {
        const moveInDateObj = new Date(booking.moveInDate);
        const moveInDay = moveInDateObj.getUTCDate();
        rentDueDate = new Date(Date.UTC(rentYear, rentMonthNum - 1, moveInDay + windowLength));
    } else {
        rentDueDate = new Date(Date.UTC(rentYear, rentMonthNum - 1, rentDueEndDay));
    }

    const dateNow = new Date();
    const todayUTC = new Date(Date.UTC(dateNow.getUTCFullYear(), dateNow.getUTCMonth(), dateNow.getUTCDate()));
    const isLate = todayUTC > rentDueDate;
    const lateFee = isLate ? Math.round(parseFloat(lateFeeRaw)) : 0;

    let rentToPay = booking.monthlyRent;
    if (!previousPayments) {
        const [miYear, miMonth, miDay] = booking.moveInDate.split("-").map(Number) as [number, number, number];
        if (miYear === rentYear && miMonth === rentMonthNum) {
            const daysInMonth = new Date(Date.UTC(miYear, miMonth, 0)).getDate();
            const daysRemaining = daysInMonth - miDay + 1;
            rentToPay = Math.round((booking.monthlyRent / daysInMonth) * daysRemaining);
        }
    }

    const totalAmount = rentToPay + lateFee;

    // Create pending payment record in DB (type: "upi")
    const now = nowISO();
    const result = await db
        .insert(payments)
        .values({
            tenantId,
            bookingId: booking.id,
            amount: totalAmount,
            type: "upi",
            status: "pending",
            rentMonth,
            lateFee,
            createdAt: now,
        })
        .returning({ id: payments.id })
        .get();

    if (!result) throw new Error("Failed to create payment record");

    // Generate UPI link
    const upiLink = generateUPILink({
        upiId,
        name: upiPayeeName,
        amount: totalAmount,
        note: `Rent ${rentMonth}`,
        transactionRef: `pay_${result.id}`,
    });

    return {
        paymentId: result.id,
        upiLink,
        amount: totalAmount,
        currency: "INR",
        tenantName: tenant.name,
        tenantEmail: tenant.email,
        rentMonth,
    };
}

/**
 * Step 2: Verify payment after Razorpay checkout completes.
 * Validates the signature, then marks payment as completed.
 *
 * CRITICAL: Always verify signature before trusting any payment.
 */
export async function verifyAndCompletePayment(
    db: DrizzleDb,
    tenantId: number,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    razorpayKeySecret: string
): Promise<Payment> {
    // Verify signature (prevents fake payment claims)
    const isValid = await verifyRazorpaySignature(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        razorpayKeySecret
    );

    if (!isValid) throw new Error("Invalid payment signature — possible fraud attempt");

    // Find the pending payment record
    const payment = await db
        .select()
        .from(payments)
        .where(
            and(
                eq(payments.razorpayOrderId, razorpayOrderId),
                eq(payments.tenantId, tenantId),
                eq(payments.status, "pending")
            )
        )
        .get();

    if (!payment) throw new Error("Payment record not found or already processed");

    // Mark as completed
    const now = nowISO();
    const updated = await db
        .update(payments)
        .set({
            status: "completed",
            razorpayPaymentId,
            razorpaySignature,
            paidAt: now,
        })
        .where(eq(payments.id, payment.id))
        .returning()
        .get();

    if (!updated) throw new Error("Failed to update payment record");

    // Update next rent due date on booking
    const nextMonth = getNextMonth(payment.rentMonth);
    const paymentBooking = await db.select().from(bookings).where(eq(bookings.id, payment.bookingId)).get();
    if (paymentBooking) {
        await db
            .update(bookings)
            .set({ nextRentDueDate: `${nextMonth}-01`, status: "active" })
            .where(eq(bookings.id, payment.bookingId));
        await db
            .update(beds)
            .set({ status: "occupied" })
            .where(eq(beds.id, paymentBooking.bedId));
    }

    return updated;
}

/**
 * Admin records a manual payment (cash / direct UPI outside website).
 */
export async function recordManualPayment(
    db: DrizzleDb,
    tenantId: number,
    amount: number,
    rentMonth: string,
    adminId: number,
    notes?: string
): Promise<Payment> {
    const booking = await db
        .select()
        .from(bookings)
        .where(and(
            eq(bookings.tenantId, tenantId),
            or(eq(bookings.status, "active"), eq(bookings.status, "deposit_paid"))
        ))
        .get();

    if (!booking) throw new Error("No active booking found for this tenant");

    const moveInMonth = booking.moveInDate.slice(0, 7);
    if (rentMonth < moveInMonth) {
        throw new Error(`Cannot pay rent for ${rentMonth}: tenant moved in on ${moveInMonth}`);
    }

    // Check for duplicate manual payment for same month and booking
    const existingPayment = await db
        .select({ id: payments.id })
        .from(payments)
        .where(
            and(
                eq(payments.tenantId, tenantId),
                eq(payments.bookingId, booking.id),
                eq(payments.rentMonth, rentMonth),
                eq(payments.status, "completed")
            )
        )
        .get();

    if (existingPayment) throw new Error(`Rent for ${rentMonth} already paid`);

    const now = nowISO();
    const result = await db
        .insert(payments)
        .values({
            tenantId,
            bookingId: booking.id,
            amount,
            type: "manual",
            status: "completed",
            rentMonth,
            lateFee: 0,
            notes: notes ?? `Manually recorded by admin ${adminId}`,
            paidAt: now,
            createdAt: now,
        })
        .returning()
        .get();

    if (!result) throw new Error("Failed to record manual payment");

    // Update next rent due date
    const nextMonth = getNextMonth(rentMonth);
    await db
        .update(bookings)
        .set({ nextRentDueDate: `${nextMonth}-01`, status: "active" })
        .where(eq(bookings.id, booking.id));

    await db
        .update(beds)
        .set({ status: "occupied" })
        .where(eq(beds.id, booking.bedId));

    return result;
}

/**
 * Get payment history for a tenant.
 * @param limit - Maximum number of payments to return (default: no limit)
 */
export async function getTenantPayments(
    db: DrizzleDb,
    tenantId: number,
    limit?: number
): Promise<Payment[]> {
    let query = db
        .select()
        .from(payments)
        .where(
            and(
                eq(payments.tenantId, tenantId),
                eq(payments.status, "completed")
            )
        )
        .orderBy(desc(payments.paidAt));

    if (limit) {
        query = query.limit(limit) as typeof query;
    }

    return query.all();
}

/**
 * Tenant submits UTR after making UPI payment.
 * Validates UTR uniqueness and marks payment as pending verification.
 */
export async function submitUTRForVerification(
    db: DrizzleDb,
    tenantId: number,
    utr: string
): Promise<SubmitUTRResult> {
    const normalizedUtr = utr.toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (normalizedUtr.length !== 12) {
        throw new Error("UTR must be exactly 12 alphanumeric characters");
    }

    // Find the tenant's most recent pending UPI payment without a UTR
    const payment = await db
        .select()
        .from(payments)
        .where(
            and(
                eq(payments.tenantId, tenantId),
                eq(payments.status, "pending"),
                eq(payments.type, "upi"),
                isNull(payments.utr)
            )
        )
        .orderBy(desc(payments.createdAt))
        .get();

    if (!payment) {
        throw new Error("No pending UPI payment found for your account");
    }

    // Check UTR uniqueness
    const existingUtr = await db
        .select({ id: payments.id })
        .from(payments)
        .where(eq(payments.utr, normalizedUtr))
        .get();

    if (existingUtr) {
        throw new Error("This Transaction ID has already been used. Please check and try again.");
    }

    // Update payment with UTR
    const now = nowISO();
    const updated = await db
        .update(payments)
        .set({
            utr: normalizedUtr,
            verificationStatus: "pending",
            utrSubmittedAt: now,
        })
        .where(eq(payments.id, payment.id))
        .returning()
        .get();

    if (!updated) throw new Error("Failed to submit UTR");

    return { paymentId: payment.id, utr: normalizedUtr };
}

/**
 * Admin confirms or rejects a UPI payment.
 * If verified: marks payment as completed, updates booking.
 * If rejected: marks as failed, sets rejection reason.
 */
export async function adminVerifyUPIPayment(
    db: DrizzleDb,
    paymentId: number,
    adminId: number,
    action: "verify" | "reject",
    rejectionReason?: string
): Promise<Payment> {
    const payment = await db
        .select()
        .from(payments)
        .where(
            and(
                eq(payments.id, paymentId),
                eq(payments.type, "upi"),
                eq(payments.verificationStatus, "pending")
            )
        )
        .get();

    if (!payment) {
        throw new Error("Payment not found or not pending verification");
    }

    const now = nowISO();

    if (action === "verify") {
        const updated = await db
            .update(payments)
            .set({
                status: "completed",
                verificationStatus: "verified",
                verifiedBy: adminId,
                verifiedAt: now,
                paidAt: now,
            })
            .where(eq(payments.id, paymentId))
            .returning()
            .get();

        if (!updated) throw new Error("Failed to verify payment");

        // Update booking
        const paymentBooking = await db
            .select()
            .from(bookings)
            .where(eq(bookings.id, payment.bookingId))
            .get();

        if (paymentBooking) {
            const nextMonth = getNextMonth(payment.rentMonth);
            await db
                .update(bookings)
                .set({ nextRentDueDate: `${nextMonth}-01`, status: "active" })
                .where(eq(bookings.id, payment.bookingId));

            await db
                .update(beds)
                .set({ status: "occupied" })
                .where(eq(beds.id, paymentBooking.bedId));
        }

        return updated;
    } else {
        const updated = await db
            .update(payments)
            .set({
                status: "failed",
                verificationStatus: "rejected",
                verifiedBy: adminId,
                verifiedAt: now,
                rejectionReason: rejectionReason || "Payment could not be verified",
            })
            .where(eq(payments.id, paymentId))
            .returning()
            .get();

        if (!updated) throw new Error("Failed to reject payment");
        return updated;
    }
}

/**
 * Get all UPI payments awaiting admin verification.
 * Used by admin dashboard.
 */
export async function getPendingVerificationPayments(
    db: DrizzleDb
): Promise<Payment[]> {
    return db
        .select()
        .from(payments)
        .where(
            and(
                eq(payments.type, "upi"),
                eq(payments.verificationStatus, "pending")
            )
        )
        .orderBy(desc(payments.utrSubmittedAt))
        .all();
}

// ─── Helpers ──────────────────────────────────────────────────

/** Get next month in YYYY-MM format (e.g. "2025-06" → "2025-07") */
function getNextMonth(rentMonth: string): string {
    const [year, month] = rentMonth.split("-").map(Number) as [number, number];
    const date = new Date(year, month - 1 + 1, 1); // add 1 month
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
}

// ─── Webhook Handler ─────────────────────────────────────────

interface WebhookResult {
    success: boolean;
    error?: string;
}

/**
 * Handle Razorpay webhook events.
 * This is a backup verification in case client-side verification fails.
 * Razorpay sends events like "payment.captured" to this endpoint.
 */
export async function handleWebhookPayment(
    db: DrizzleDb,
    rawBody: string,
    signature: string,
    webhookSecret: string
): Promise<WebhookResult> {
    // Verify webhook signature using HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(webhookSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const expectedSigBuffer = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(rawBody)
    );

    const expectedSig = Array.from(new Uint8Array(expectedSigBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    // Constant-time comparison to prevent timing attacks
    if (signature.length !== expectedSig.length) {
        return { success: false, error: "Invalid signature" };
    }

    let mismatch = 0;
    for (let i = 0; i < signature.length; i++) {
        mismatch |= signature.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }

    if (mismatch !== 0) {
        return { success: false, error: "Invalid signature" };
    }

    // Parse the webhook payload
    let event: {
        event: string;
        payload: {
            payment?: {
                entity: {
                    id: string;
                    order_id: string;
                    status: string;
                    amount: number;
                };
            };
        };
    };

    try {
        event = JSON.parse(rawBody);
    } catch {
        return { success: false, error: "Invalid JSON payload" };
    }

    // Handle payment.captured event
    if (event.event === "payment.captured") {
        const paymentEntity = event.payload.payment?.entity;
        if (!paymentEntity) {
            return { success: false, error: "Missing payment entity" };
        }

        const { id: razorpayPaymentId, order_id: razorpayOrderId } = paymentEntity;

        // Find the pending payment by order ID
        const payment = await db
            .select()
            .from(payments)
            .where(
                and(
                    eq(payments.razorpayOrderId, razorpayOrderId),
                    eq(payments.status, "pending")
                )
            )
            .get();

        if (!payment) {
            // Payment already processed or doesn't exist - that's okay
            return { success: true };
        }

        // Mark as completed
        const now = nowISO();
        await db
            .update(payments)
            .set({
                status: "completed",
                razorpayPaymentId,
                paidAt: now,
            })
            .where(eq(payments.id, payment.id));

        // Update next rent due date on booking
        const nextMonth = getNextMonth(payment.rentMonth);
        const webhookBooking = await db.select().from(bookings).where(eq(bookings.id, payment.bookingId)).get();
        if (webhookBooking) {
            await db
                .update(bookings)
                .set({ nextRentDueDate: `${nextMonth}-01`, status: "active" })
                .where(eq(bookings.id, payment.bookingId));

            await db
                .update(beds)
                .set({ status: "occupied" })
                .where(eq(beds.id, webhookBooking.bedId));
        }

        return { success: true };
    }

    // Handle payment.failed event
    if (event.event === "payment.failed") {
        const paymentEntity = event.payload.payment?.entity;
        if (!paymentEntity) {
            return { success: false, error: "Missing payment entity" };
        }

        const { order_id: razorpayOrderId } = paymentEntity;

        // Mark payment as failed
        await db
            .update(payments)
            .set({ status: "failed" })
            .where(
                and(
                    eq(payments.razorpayOrderId, razorpayOrderId),
                    eq(payments.status, "pending")
                )
            );

        return { success: true };
    }

    // Unknown event type - acknowledge receipt
    return { success: true };
}