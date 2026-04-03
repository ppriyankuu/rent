# Step 2: Backend API Changes

## Summary

New and modified API routes to support the UPI payment flow. The existing Razorpay-based routes for rent payments are **replaced**, not removed — the deposit flow stays untouched.

---

## 2.1 — New Validators

**File**: `server/src/validators/index.ts`

Add these new schemas:

```typescript
// Tenant submits UTR after making UPI payment
export const submitUtrSchema = z.object({
    utr: z.string().regex(/^[A-Z0-9]{12}$/, "UTR must be exactly 12 alphanumeric characters"),
});

// Admin verifies or rejects a UPI payment
export const adminVerifyPaymentSchema = z.object({
    action: z.enum(["verify", "reject"]),
    rejectionReason: z.string().optional(),
});

// Type exports
export type SubmitUtrInput = z.infer<typeof submitUtrSchema>;
export type AdminVerifyPaymentInput = z.infer<typeof adminVerifyPaymentSchema>;
```

Place these alongside the existing payment schemas (`initiatePaymentSchema`, `verifyPaymentSchema`, `manualPaymentSchema`).

---

## 2.2 — UPI Link Generation Utility

**File**: `server/src/utils/upi.ts` (NEW)

```typescript
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

    if (params.transactionRef) {
        searchParams.set("tr", params.transactionRef);
    }

    return `${base}?${searchParams.toString()}`;
}
```

---

## 2.3 — Environment Variables

**File**: `server/src/types/env.ts`

Add these new env vars:

```typescript
export interface Env {
    // ... existing fields ...

    // Manual UPI Payment
    UPI_ID: string;           // e.g., "yourname@oksbi"
    UPI_PAYEE_NAME: string;   // e.g., "Priyankuu"
    TELEGRAM_BOT_TOKEN: string;
    TELEGRAM_CHAT_ID: string;
}
```

**File**: `wrangler.toml` (or your env config)

Add:
```toml
[vars]
UPI_ID = "yourname@oksbi"
UPI_PAYEE_NAME = "Your Full Name"
TELEGRAM_BOT_TOKEN = "your-bot-token"
TELEGRAM_CHAT_ID = "your-chat-id"
```

Set these as secrets in production:
```bash
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
```

---

## 2.4 — Telegram Notification Service

**File**: `server/src/services/telegram.service.ts` (NEW)

```typescript
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
export async function sendUTRNotification(params: TelegramMessageParams): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

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
        // Send message with inline keyboard
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: "HTML",
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
    } catch (error) {
        console.error("Failed to send Telegram notification:", error);
        // Don't throw — notification failure shouldn't break the payment flow
    }
}

/**
 * Handle callback queries from Telegram inline buttons.
 * Called when admin clicks Confirm/Reject in Telegram.
 */
export async function handleTelegramCallback(
    callbackData: string,
    action: "verify" | "reject",
    rejectionReason?: string
): Promise<{ success: boolean; message: string }> {
    // This is handled by the webhook route (see section 2.7)
    // This function is a placeholder for the logic
    return { success: true, message: "Callback processed" };
}
```

---

## 2.5 — Payment Service Changes

**File**: `server/src/services/payment.service.ts`

### 2.5.1 — Modify `initiateRentPayment()`

**Current behavior**: Creates Razorpay order + pending payment record.
**New behavior**: Creates UPI payment record + generates UPI link.

```typescript
// UPDATED return type
export interface InitiatePaymentResult {
    paymentId: number;
    // REMOVED: razorpayOrderId, razorpayKeyId
    // ADDED:
    upiLink: string;
    amount: number;
    currency: string;
    tenantName: string;
    tenantEmail: string;
    rentMonth: string;
}

export async function initiateRentPayment(
    db: DrizzleDb,
    tenantId: number,
    rentMonth: string,
    upiId: string,       // NEW param
    upiPayeeName: string  // NEW param
): Promise<InitiatePaymentResult> {
    // ... [keep existing validation logic: booking check, duplicate check, late fee, prorated rent] ...

    // REMOVED: Razorpay order creation

    // Create pending payment record (type: "upi")
    const now = nowISO();
    const result = await db
        .insert(payments)
        .values({
            tenantId,
            bookingId: booking.id,
            amount: totalAmount,
            type: "upi",  // CHANGED from "online"
            status: "pending",
            // REMOVED: razorpayOrderId
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
```

### 2.5.2 — REMOVE `verifyAndCompletePayment()`

This function is Razorpay-specific (signature verification). It's no longer needed for rent payments. **Do not delete it** — it may still be referenced by the deposit flow. Just don't modify it.

### 2.5.3 — NEW: `submitUTRForVerification()`

```typescript
interface SubmitUTRResult {
    paymentId: number;
    utr: string;
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

    // Find the tenant's most recent pending UPI payment
    const payment = await db
        .select()
        .from(payments)
        .where(
            and(
                eq(payments.tenantId, tenantId),
                eq(payments.status, "pending"),
                eq(payments.type, "upi"),
                isNull(payments.utr)  // UTR not yet submitted
            )
        )
        .orderBy(desc(payments.createdAt))
        .get();

    if (!payment) {
        throw new Error("No pending UPI payment found for your account");
    }

    // Check UTR uniqueness (DB UNIQUE constraint will also catch this,
    // but we give a friendlier error message here)
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
```

### 2.5.4 — NEW: `adminVerifyUPIPayment()`

```typescript
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
        // Mark as completed
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

        // Update booking (same logic as verifyAndCompletePayment)
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
        // Reject
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
```

### 2.5.5 — NEW: `getPendingVerificationPayments()`

```typescript
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
```

---

## 2.6 — Updated Payment Routes

**File**: `server/src/routes/payments.ts`

### 2.6.1 — MODIFY `POST /api/payments/initiate`

Change from Razorpay to UPI:

```typescript
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
                c.env.UPI_ID,        // NEW
                c.env.UPI_PAYEE_NAME  // NEW
            );
            return c.json(ok(result), 201);
        } catch (e) {
            const message = e instanceof Error ? e.message : "Payment initiation failed";
            return c.json(err(message), 400);
        }
    }
);
```

### 2.6.2 — REMOVE `POST /api/payments/verify`

This route is Razorpay-specific. **Remove it** from the payments routes file. The deposit verification route (`POST /api/bookings/deposit/verify`) stays untouched.

### 2.6.3 — ADD `POST /api/payments/submit-utr`

```typescript
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
                // Get tenant and booking details
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

                // Send Telegram notification (non-blocking)
                if (tenant) {
                    sendUTRNotification({
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
                    }).catch((err) => console.error("Telegram notification failed:", err));
                }
            }

            return c.json(ok({ message: "UTR submitted successfully. Awaiting verification.", ...result }), 201);
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to submit UTR";
            return c.json(err(message), 400);
        }
    }
);
```

### 2.6.4 — ADD `GET /api/payments/my/pending`

Returns the tenant's current pending UPI payment (if any). Used by the verify page to auto-detect which payment needs verification.

```typescript
paymentsRoute.get("/my/pending", requireAuth(), async (c) => {
    const { sub: tenantId } = c.get("user");
    const db = createDb(c.env.rent);

    const pendingPayment = await db
        .select()
        .from(payments)
        .where(
            and(
                eq(payments.tenantId, tenantId),
                eq(payments.status, "pending"),
                eq(payments.type, "upi")
            )
        )
        .orderBy(desc(payments.createdAt))
        .get();

    if (!pendingPayment) {
        return c.json(ok(null));
    }

    return c.json(ok(pendingPayment));
});
```

### 2.6.5 — ADD Admin Routes for UPI Verification

```typescript
// POST /api/payments/admin/verify — Admin confirms UPI payment
paymentsRoute.post(
    "/admin/verify",
    requireAdmin(),
    zValidator("json", adminVerifyPaymentSchema),
    async (c) => {
        const { sub: adminId } = c.get("user");
        const body = c.req.valid("json");
        // body should have: { paymentId: number, action: "verify" | "reject", rejectionReason?: string }

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

// GET /api/payments/admin/pending — Admin sees all pending UPI verifications
paymentsRoute.get("/admin/pending", requireAdmin(), async (c) => {
    const db = createDb(c.env.rent);
    const pending = await getPendingVerificationPayments(db);

    // Enrich with tenant info
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
```

### 2.6.6 — ADD Telegram Webhook Route

```typescript
// POST /api/webhooks/telegram — Handle Telegram callback queries
paymentsRoute.post("/webhooks/telegram", async (c) => {
    try {
        const body = await c.req.json();

        // Handle callback query (inline button clicks)
        if (body.callback_query) {
            const callbackData = body.callback_query.data;
            const chatId = body.callback_query.message.chat.id;
            const messageId = body.callback_query.message.message_id;

            if (callbackData?.startsWith("verify_payment:")) {
                const paymentId = parseInt(callbackData.split(":")[1], 10);
                // Process verification
                // ... call adminVerifyUPIPayment with action="verify"
                // ... edit message to show result
            } else if (callbackData?.startsWith("reject_payment:")) {
                const paymentId = parseInt(callbackData.split(":")[1], 10);
                // Process rejection
                // ... call adminVerifyUPIPayment with action="reject"
            }

            return c.json(ok({ message: "Callback processed" }));
        }

        return c.json(ok({ message: "Webhook received" }));
    } catch (e) {
        console.error("Telegram webhook error:", e);
        return c.json(err("Webhook processing error"), 500);
    }
});
```

---

## 2.7 — Routes Summary

| Method | Path | Role | Status | Purpose |
|--------|------|------|--------|---------|
| POST | `/api/payments/initiate` | Tenant | **MODIFIED** | Creates UPI payment + returns UPI link |
| POST | `/api/payments/verify` | Tenant | **REMOVED** | Was Razorpay signature verification |
| POST | `/api/payments/submit-utr` | Tenant | **NEW** | Tenant submits UTR after payment |
| GET | `/api/payments/my` | Tenant | **UNCHANGED** | Payment history |
| GET | `/api/payments/my/pending` | Tenant | **NEW** | Get current pending payment |
| GET | `/api/payments/my/:id/receipt` | Tenant | **UNCHANGED** | Receipt data |
| POST | `/api/payments/manual` | Admin | **UNCHANGED** | Record manual payment |
| GET | `/api/payments` | Admin | **UNCHANGED** | List all payments |
| GET | `/api/payments/tenant/:tenantId` | Admin | **UNCHANGED** | Payments for specific tenant |
| POST | `/api/payments/webhook` | Razorpay | **UNCHANGED** | Razorpay webhook (for deposits) |
| POST | `/api/payments/admin/verify` | Admin | **NEW** | Verify/reject UPI payment |
| GET | `/api/payments/admin/pending` | Admin | **NEW** | List pending UPI verifications |
| POST | `/api/webhooks/telegram` | Telegram | **NEW** | Telegram callback handler |

---

## Checklist

- [ ] Add new validators (`submitUtrSchema`, `adminVerifyPaymentSchema`)
- [ ] Create UPI link generation utility (`server/src/utils/upi.ts`)
- [ ] Add env vars (`UPI_ID`, `UPI_PAYEE_NAME`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`)
- [ ] Create Telegram notification service (`server/src/services/telegram.service.ts`)
- [ ] Modify `initiateRentPayment()` — remove Razorpay, add UPI link
- [ ] Add `submitUTRForVerification()` service function
- [ ] Add `adminVerifyUPIPayment()` service function
- [ ] Add `getPendingVerificationPayments()` service function
- [ ] Update `POST /api/payments/initiate` route
- [ ] Remove `POST /api/payments/verify` route
- [ ] Add `POST /api/payments/submit-utr` route
- [ ] Add `GET /api/payments/my/pending` route
- [ ] Add `POST /api/payments/admin/verify` route
- [ ] Add `GET /api/payments/admin/pending` route
- [ ] Add `POST /api/webhooks/telegram` route
- [ ] Update env type definitions
