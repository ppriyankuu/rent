/**
 * POST /api/bookings                → tenant: initiate booking (creates deposit order)
 * POST /api/bookings/deposit/verify → tenant: verify deposit payment → activates booking
 * GET  /api/bookings/my             → tenant: get their active booking details
 * GET  /api/bookings                → admin: list all bookings
 * GET  /api/bookings/:id            → admin: get booking details
 * POST /api/bookings/:id/end        → admin: end booking (tenant moves out)
 *
 * BOOKING LIFECYCLE:
 *   1. Tenant selects a bed and submits createBookingSchema
 *   2. We create a Razorpay ORDER for the deposit amount
 *   3. Tenant pays deposit via Razorpay checkout (frontend)
 *   4. Tenant POSTs to /deposit/verify with Razorpay payment details
 *   5. We verify signature → mark deposit as paid → set bed to "occupied"
 *   6. Booking becomes "active"
 *   7. Admin ends booking when tenant leaves → bed becomes "available" again
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and, desc, or, inArray } from "drizzle-orm";
import { z } from "zod";
import type { Env } from "../types/env";
import type { JwtPayload } from "../types/api";
import { ok, err } from "../types/api";
import { createDb } from "../db/client";
import { bookings, beds, deposits, users, payments, rooms, depositDeductions } from "../db/schema";
import {
    createBookingSchema,
    endBookingSchema,
    verifyDepositSchema,
} from "../validators";
import { getAllSettings } from "../services/settings.service";
import { createRazorpayOrder } from "../services/razorpay.service";
import { getTenantDeductions, getDepositBalance } from "../services/deposit.service";
import { verifyRazorpaySignature, nowISO, getNextRentDueDate, toDateString, generateReceiptNumber } from "../utils";
import { requireAdmin, requireAuth } from "../middleware/auth";

type Variables = { user: JwtPayload };

const bookingsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── POST /api/bookings — TENANT: initiate booking + deposit order ───
bookingsRoute.post(
    "/",
    requireAuth(),
    zValidator("json", createBookingSchema),
    async (c) => {
        const { sub: tenantId } = c.get("user");
        const { bedId, moveInDate } = c.req.valid("json");
        const db = createDb(c.env.rent);

        // Check tenant doesn't already have an active or pending_deposit booking
        const existingBooking = await db
            .select({ id: bookings.id })
            .from(bookings)
            .where(and(
                eq(bookings.tenantId, tenantId),
                or(eq(bookings.status, "active"), eq(bookings.status, "pending_deposit"))
            ))
            .get();

        if (existingBooking) {
            // Check if it's a pending_deposit booking and provide helpful message
            const existingBookingFull = await db
                .select({ status: bookings.status })
                .from(bookings)
                .where(eq(bookings.id, existingBooking.id))
                .get();

            if (existingBookingFull?.status === "pending_deposit") {
                return c.json(err("You have a pending deposit payment. Please complete the payment or cancel your booking from the dashboard before booking another bed."), 409);
            }
            return c.json(err("You already have an active booking"), 409);
        }

        // Get bed info first
        const bed = await db.select().from(beds).where(eq(beds.id, bedId)).get();
        if (!bed) return c.json(err("Bed not found"), 404);

        // Check if bed is available (without reserving it yet)
        // Bed will only be reserved after successful deposit payment
        if (bed.status !== "available") {
            return c.json(err(`Bed is currently ${bed.status}`), 409);
        }

        // Get tenant info
        const tenant = await db.select().from(users).where(eq(users.id, tenantId)).get();
        if (!tenant) {
            return c.json(err("Tenant not found"), 404);
        }
        if (tenant.isActive === false) {
            return c.json(err("Your account has been deactivated. Please contact the administrator."), 403);
        }

        const now = nowISO();
        const today = new Date();

        // Create booking record (status = "pending_deposit" — becomes "active" after deposit verified)
        // NOTE: Bed is NOT reserved yet. It will be reserved only after deposit payment is verified.
        let booking;
        try {
            booking = await db
                .insert(bookings)
                .values({
                    tenantId,
                    bedId,
                    status: "pending_deposit",
                    monthlyRent: bed.monthlyRent,
                    moveInDate,
                    nextRentDueDate: getNextRentDueDate(today),
                    createdAt: now,
                })
                .returning()
                .get();
        } catch (bookingError) {
            console.error("Failed to create booking:", bookingError);
            return c.json(err("Failed to create booking. Please try again."), 500);
        }

        if (!booking) {
            return c.json(err("Failed to create booking"), 500);
        }

        // CRITICAL: Re-check bed availability before creating payment order
        // This prevents a race condition where another user booked the bed
        // between our initial check and now
        const bedRecheck = await db.select().from(beds).where(eq(beds.id, bedId)).get();
        if (!bedRecheck || bedRecheck.status !== "available") {
            // Bed was taken by another user - cancel this booking
            await db.delete(bookings).where(eq(bookings.id, booking.id));
            return c.json(err("This bed was just booked by someone else. Please try another bed."), 409);
        }

        // Fetch official deposit amount from global settings
        const settings = await getAllSettings(db);
        const officialDepositAmount = parseInt(settings.deposit_amount);

        // Create Razorpay order for deposit
        const receipt = generateReceiptNumber();
        let order;
        try {
            order = await createRazorpayOrder(
                c.env.RAZORPAY_KEY_ID,
                c.env.RAZORPAY_KEY_SECRET,
                {
                    amount: officialDepositAmount,
                    receipt,
                    notes: { tenantName: tenant.name, type: "deposit" },
                }
            );
        } catch (razorpayError) {
            // Rollback: delete booking (no bed reservation to release)
            await db.delete(bookings).where(eq(bookings.id, booking.id));
            console.error("Razorpay order creation failed:", razorpayError);
            return c.json(err("Payment gateway error. Please try again."), 500);
        }

        // Create deposit record
        try {
            await db.insert(deposits).values({
                bookingId: booking.id,
                tenantId,
                amount: officialDepositAmount,
                status: "held",
                razorpayOrderId: order.id,
                createdAt: now,
            });
        } catch (dbError) {
            // Rollback: delete booking (no bed reservation to release)
            await db.delete(bookings).where(eq(bookings.id, booking.id));
            console.error("Database error during deposit creation:", dbError);
            return c.json(err("Failed to finalize booking. Please try again."), 500);
        }

        return c.json(
            ok({
                bookingId: booking.id,
                razorpayOrderId: order.id,
                razorpayKeyId: c.env.RAZORPAY_KEY_ID,
                amount: officialDepositAmount,
                currency: "INR",
            }),
            201
        );
    }
);

// ─── POST /api/bookings/deposit/verify — TENANT ───────────────
// Called after tenant completes deposit payment in Razorpay checkout
bookingsRoute.post(
    "/deposit/verify",
    requireAuth(),
    zValidator("json", verifyDepositSchema),
    async (c) => {
        const { sub: tenantId } = c.get("user");
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } =
            c.req.valid("json");
        const db = createDb(c.env.rent);

        // Verify Razorpay signature
        const isValid = await verifyRazorpaySignature(
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            c.env.RAZORPAY_KEY_SECRET
        );

        if (!isValid) {
            return c.json(err("Payment verification failed — invalid signature"), 400);
        }

        // Find deposit record
        const deposit = await db
            .select()
            .from(deposits)
            .where(
                and(
                    eq(deposits.tenantId, tenantId),
                    eq(deposits.razorpayOrderId, razorpayOrderId)
                )
            )
            .get();

        if (!deposit) return c.json(err("Deposit record not found"), 404);

        // Replay attack protection: check if deposit is already paid
        if (deposit.paidAt) {
            return c.json(err("Deposit has already been verified"), 409);
        }

        // Get the booking to check bed availability
        // Bed might have been booked by someone else while payment was pending
        const booking = await db
            .select()
            .from(bookings)
            .where(eq(bookings.id, deposit.bookingId))
            .get();

        if (!booking) {
            return c.json(err("Booking not found"), 404);
        }

        // Check if bed is still available (race condition protection)
        const bed = await db
            .select()
            .from(beds)
            .where(eq(beds.id, booking.bedId))
            .get();

        if (!bed) {
            return c.json(err("Bed not found"), 404);
        }

        if (bed.status !== "available") {
            // Bed was taken by someone else - cancel this booking
            await db
                .update(bookings)
                .set({ status: "cancelled" })
                .where(eq(bookings.id, booking.id));
            return c.json(err("This bed is no longer available. Your booking has been cancelled. Please try booking another bed."), 409);
        }

        const now = nowISO();

        // Atomically reserve the bed (only if still available)
        const reserveResult = await db
            .update(beds)
            .set({ status: "reserved" })
            .where(and(eq(beds.id, booking.bedId), eq(beds.status, "available")))
            .returning({ id: beds.id });

        if (reserveResult.length === 0) {
            // Bed was taken between our check and update
            await db
                .update(bookings)
                .set({ status: "cancelled" })
                .where(eq(bookings.id, booking.id));
            return c.json(err("This bed was just booked by someone else. Please try another bed."), 409);
        }

        // Bed successfully reserved - now mark deposit as paid
        await db
            .update(deposits)
            .set({ razorpayPaymentId, paidAt: now })
            .where(eq(deposits.id, deposit.id));

        // Transition booking from pending_deposit → deposit_paid
        await db
            .update(bookings)
            .set({ status: "deposit_paid" })
            .where(eq(bookings.id, booking.id));

        return c.json(ok({ message: "Deposit verified. Booking confirmed!" }));
    }
);

// ─── GET /api/bookings/my — TENANT ───────────────────────────
bookingsRoute.get("/my", requireAuth(), async (c) => {
    const { sub: tenantId } = c.get("user");
    const db = createDb(c.env.rent);

    const booking = await db
        .select()
        .from(bookings)
        .where(and(
            eq(bookings.tenantId, tenantId),
            or(eq(bookings.status, "active"), eq(bookings.status, "pending_deposit"), eq(bookings.status, "deposit_paid"))
        ))
        .get();

    if (!booking) return c.json(err("No active booking found"), 404);

    // Get bed and room info
    const bed = await db.select().from(beds).where(eq(beds.id, booking.bedId)).get();
    const room = bed ? await db.select().from(rooms).where(eq(rooms.id, bed.roomId)).get() : null;
    const deposit = await db
        .select({
            id: deposits.id,
            amount: deposits.amount,
            status: deposits.status,
            paidAt: deposits.paidAt,
            razorpayOrderId: deposits.razorpayOrderId,
        })
        .from(deposits)
        .where(eq(deposits.bookingId, booking.id))
        .get();

    const rentMonth = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`;
    const currentMonthPayment = await db
        .select()
        .from(payments)
        .where(and(
            eq(payments.bookingId, booking.id),
            eq(payments.rentMonth, rentMonth),
            eq(payments.status, "completed")
        ))
        .get();

    let amountDue = booking.monthlyRent;
    if (!currentMonthPayment) {
        // Calculate prorated rent if this is the first payment
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

        if (!previousPayments) {
            // Parse as UTC components to avoid timezone-related off-by-one errors
            const [miYear, miMonth, miDay] = booking.moveInDate.split("-").map(Number) as [number, number, number];
            const [rmYear, rmMonth] = rentMonth.split("-").map(Number) as [number, number];

            // Ensure the payment is for the moveInDate's month
            if (miYear === rmYear && miMonth === rmMonth) {
                const daysInMonth = new Date(Date.UTC(miYear, miMonth, 0)).getDate();
                const daysRemaining = daysInMonth - miDay + 1;
                amountDue = Math.round((booking.monthlyRent / daysInMonth) * daysRemaining);
            }
        }
    }

    const settings = await getAllSettings(db);

    // Check for pending UPI verification (UTR submitted, awaiting admin decision)
    const pendingUPI = await db
        .select({
            id: payments.id,
            amount: payments.amount,
            rentMonth: payments.rentMonth,
            utr: payments.utr,
        })
        .from(payments)
        .where(and(
            eq(payments.bookingId, booking.id),
            eq(payments.type, "upi"),
            eq(payments.verificationStatus, "pending")
        ))
        .get();

    return c.json(ok({
        booking: {
            ...booking,
            expectedMoveOutDate: booking.expectedMoveOutDate,
        },
        bed,
        room,
        deposit,
        amountDue,
        isRentPaid: !!currentMonthPayment,
        razorpayKeyId: c.env.RAZORPAY_KEY_ID,
        settings: {
            rent_due_start_day: settings.rent_due_start_day,
            rent_due_end_day: settings.rent_due_end_day,
            late_fee_amount: settings.late_fee_amount,
        },
        pendingUPIVerification: pendingUPI || null,
    }));
});

// ─── PUT /api/bookings/my/move-in-date — TENANT ──────────────
bookingsRoute.put(
    "/my/move-in-date",
    requireAuth(),
    zValidator("json", z.object({ moveInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })),
    async (c) => {
        const { sub: tenantId } = c.get("user");
        const { moveInDate } = c.req.valid("json");
        const db = createDb(c.env.rent);

        const booking = await db
            .select()
            .from(bookings)
            .where(and(
                eq(bookings.tenantId, tenantId),
                inArray(bookings.status, ["active", "pending_deposit", "deposit_paid", "cancelled"])
            ))
            .get();

        if (!booking) return c.json(err("Booking not found"), 404);

        // Don't allow modifying cancelled bookings
        if (booking.status === "cancelled") {
            return c.json(err("This booking has been cancelled"), 409);
        }

        const bed = await db.select().from(beds).where(eq(beds.id, booking.bedId)).get();
        if (bed?.status === "occupied") {
            return c.json(err("Cannot change move-in date after taking occupancy"), 403);
        }

        await db
            .update(bookings)
            .set({ moveInDate })
            .where(eq(bookings.id, booking.id));

        return c.json(ok({ message: "Move-in date updated successfully" }));
    }
);

// ─── PUT /api/bookings/my/expected-move-out-date — TENANT ────
// Tenant can set/update their expected move-out date (for bed availability planning)
// This is informational only - no automatic actions are taken on this date
bookingsRoute.put(
    "/my/expected-move-out-date",
    requireAuth(),
    zValidator("json", z.object({ expectedMoveOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })),
    async (c) => {
        const { sub: tenantId } = c.get("user");
        const { expectedMoveOutDate } = c.req.valid("json");
        const db = createDb(c.env.rent);

        const booking = await db
            .select()
            .from(bookings)
            .where(and(
                eq(bookings.tenantId, tenantId),
                inArray(bookings.status, ["active", "deposit_paid"])
            ))
            .get();

        if (!booking) return c.json(err("Booking not found"), 404);

        // Don't allow setting move-out date before move-in date
        if (expectedMoveOutDate < booking.moveInDate) {
            return c.json(err("Expected move-out date cannot be before move-in date"), 400);
        }

        await db
            .update(bookings)
            .set({ expectedMoveOutDate })
            .where(eq(bookings.id, booking.id));

        return c.json(ok({ message: "Expected move-out date updated successfully" }));
    }
);

// ─── POST /api/bookings/my/cancel — TENANT ───────────────────
// Cancel a pending deposit booking (allows user to book a different bed)
bookingsRoute.post(
    "/my/cancel",
    requireAuth(),
    async (c) => {
        const { sub: tenantId } = c.get("user");
        const db = createDb(c.env.rent);

        // Find pending_deposit booking
        const booking = await db
            .select()
            .from(bookings)
            .where(and(
                eq(bookings.tenantId, tenantId),
                eq(bookings.status, "pending_deposit")
            ))
            .get();

        if (!booking) {
            return c.json(err("No pending booking to cancel"), 404);
        }

        // Cancel the booking (bed was never reserved, so no need to update beds table)
        await db
            .update(bookings)
            .set({ status: "cancelled" })
            .where(eq(bookings.id, booking.id));

        return c.json(ok({ message: "Booking cancelled. You can now book a different bed." }));
    }
);

// ─── GET /api/bookings — ADMIN ────────────────────────────────
bookingsRoute.get("/", requireAdmin(), async (c) => {
    const db = createDb(c.env.rent);

    const allBookings = await db
        .select()
        .from(bookings)
        .orderBy(desc(bookings.createdAt))
        .all();

    return c.json(ok(allBookings));
});

// ─── GET /api/bookings/:id — ADMIN ───────────────────────────
bookingsRoute.get("/:id", requireAdmin(), async (c) => {
    const bookingId = parseInt(c.req.param("id"), 10);
    if (isNaN(bookingId)) return c.json(err("Invalid booking ID"), 400);

    const db = createDb(c.env.rent);

    const booking = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .get();

    if (!booking) return c.json(err("Booking not found"), 404);

    const bed = await db.select().from(beds).where(eq(beds.id, booking.bedId)).get();
    const deposit = await db
        .select()
        .from(deposits)
        .where(eq(deposits.bookingId, bookingId))
        .get();
    const tenant = await db
        .select({ id: users.id, name: users.name, email: users.email, phone: users.phone })
        .from(users)
        .where(eq(users.id, booking.tenantId))
        .get();

    return c.json(ok({ booking, bed, deposit, tenant }));
});

// ─── POST /api/bookings/:id/end — ADMIN: end booking ─────────
bookingsRoute.post(
    "/:id/end",
    requireAdmin(),
    zValidator("json", endBookingSchema),
    async (c) => {
        const bookingId = parseInt(c.req.param("id"), 10);
        if (isNaN(bookingId)) return c.json(err("Invalid booking ID"), 400);

        const body = c.req.valid("json");
        const db = createDb(c.env.rent);

        const booking = await db
            .select()
            .from(bookings)
            .where(eq(bookings.id, bookingId))
            .get();

        if (!booking) return c.json(err("Booking not found"), 404);
        if (booking.status === "ended") {
            return c.json(err("Booking is already ended"), 409);
        }

        // Get the deposit to validate refund amounts
        const deposit = await db
            .select()
            .from(deposits)
            .where(eq(deposits.bookingId, bookingId))
            .get();

        if (deposit) {
            // Get the current deposit balance (accounts for previous deductions)
            const balance = await getDepositBalance(db, booking.tenantId);

            if (balance) {
                // Validate that refund + deduction equals remaining balance (not original amount)
                // Use tolerance-based comparison to avoid floating-point precision issues
                const totalRefundAndDeduction = body.refundAmount + body.deductionAmount;
                if (Math.abs(totalRefundAndDeduction - balance.remainingBalance) > 0.01) {
                    return c.json(
                        err(
                            `Invalid amounts: Refund (${body.refundAmount}) + Deduction (${body.deductionAmount}) = ${totalRefundAndDeduction} ` +
                            `does not equal remaining deposit balance (${balance.remainingBalance})`
                        ),
                        400
                    );
                }
            }

            // Validate deduction reason is provided when deducting
            if (body.deductionAmount > 0 && !body.deductionReason?.trim()) {
                return c.json(
                    err("Deduction reason is required when deducting from deposit"),
                    400
                );
            }
        }

        const now = nowISO();

        // End the booking
        await db
            .update(bookings)
            .set({ status: "ended", moveOutDate: body.moveOutDate })
            .where(eq(bookings.id, bookingId));

        // Free up the bed
        await db
            .update(beds)
            .set({ status: "available" })
            .where(eq(beds.id, booking.bedId));

        // Update deposit refund info
        if (deposit) {
            await db
                .update(deposits)
                .set({
                    status: body.deductionAmount > 0 ? "partially_refunded" : "refunded",
                    refundAmount: body.refundAmount,
                    deductionAmount: body.deductionAmount,
                    deductionReason: body.deductionReason,
                    refundedAt: now,
                })
                .where(eq(deposits.bookingId, bookingId));
        }

        return c.json(ok({ message: "Booking ended. Bed is now available." }));
    }
);

// ─── GET /api/bookings/my/deductions — TENANT ───────────────
bookingsRoute.get("/my/deductions", requireAuth(), async (c) => {
    const { sub: tenantId } = c.get("user");
    const db = createDb(c.env.rent);

    const deductions = await getTenantDeductions(db, tenantId);
    return c.json(ok(deductions));
});

// ─── GET /api/bookings/my/deposit-balance — TENANT ───────────────
bookingsRoute.get("/my/deposit-balance", requireAuth(), async (c) => {
    const { sub: tenantId } = c.get("user");
    const db = createDb(c.env.rent);

    const balance = await getDepositBalance(db, tenantId);

    if (!balance) {
        return c.json(err("No deposit found for your booking"), 404);
    }

    return c.json(ok(balance));
});

// ─── GET /api/bookings/my/deposit/receipt — TENANT ───────────────
// Returns structured data for deposit receipt generation
bookingsRoute.get("/my/deposit/receipt", requireAuth(), async (c) => {
    const { sub: tenantId } = c.get("user");
    const db = createDb(c.env.rent);

    // Get tenant's active booking
    const booking = await db
        .select()
        .from(bookings)
        .where(and(
            eq(bookings.tenantId, tenantId),
            or(eq(bookings.status, "active"), eq(bookings.status, "deposit_paid"))
        ))
        .get();

    if (!booking) return c.json(err("No active booking found"), 404);

    // Get deposit record
    const deposit = await db
        .select()
        .from(deposits)
        .where(and(eq(deposits.bookingId, booking.id), eq(deposits.tenantId, tenantId)))
        .get();

    if (!deposit || !deposit.paidAt) {
        return c.json(err("Deposit not paid yet"), 404);
    }

    // Get tenant info
    const tenant = await db
        .select({ id: users.id, name: users.name, email: users.email, phone: users.phone })
        .from(users)
        .where(eq(users.id, tenantId))
        .get();

    // Get bed and room info
    const bed = await db.select().from(beds).where(eq(beds.id, booking.bedId)).get();
    const room = bed ? await db.select().from(rooms).where(eq(rooms.id, bed.roomId)).get() : null;

    // Return structured receipt data
    return c.json(
        ok({
            receiptNumber: `DEP-${deposit.id.toString().padStart(6, "0")}`,
            tenant,
            room: room?.name ?? "N/A",
            bed: bed?.name ?? "N/A",
            depositAmount: deposit.amount,
            paymentType: deposit.razorpayPaymentId ? "online" : "offline",
            paidAt: deposit.paidAt,
            razorpayPaymentId: deposit.razorpayPaymentId,
            razorpayOrderId: deposit.razorpayOrderId,
        })
    );
});

export default bookingsRoute;