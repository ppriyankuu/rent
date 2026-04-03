# Step 1: Database Changes

## Summary

Add UPI-specific columns to the `payments` table and create a new table for tracking UPI verification state.

---

## 1.1 — Modify `payments` Table

Add these columns to the existing `payments` table:

```sql
-- UPI Transaction ID (UTR/RRN) submitted by tenant
ALTER TABLE payments ADD COLUMN utr TEXT UNIQUE;

-- Verification status for manual UPI payments
-- Values: NULL (not applicable), 'pending' (UTR submitted, awaiting admin confirmation),
--         'verified' (admin confirmed), 'rejected' (admin rejected)
ALTER TABLE payments ADD COLUMN verificationStatus TEXT;

-- When the UTR was submitted
ALTER TABLE payments ADD COLUMN utrSubmittedAt TEXT;

-- Which admin verified/rejected the payment
ALTER TABLE payments ADD COLUMN verifiedBy INTEGER REFERENCES users(id);

-- When the admin verified/rejected
ALTER TABLE payments ADD COLUMN verifiedAt TEXT;

-- Reason if admin rejects the UTR
ALTER TABLE payments ADD COLUMN rejectionReason TEXT;
```

### Column Details

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| `utr` | TEXT | Yes | NULL | 12-digit UPI Transaction Reference. UNIQUE constraint prevents reuse. |
| `verificationStatus` | TEXT | Yes | NULL | `pending` = UTR submitted, waiting admin. `verified` = confirmed. `rejected` = denied. NULL = not applicable (e.g., Razorpay payments, admin manual payments). |
| `utrSubmittedAt` | TEXT | Yes | NULL | ISO timestamp when tenant submitted UTR. |
| `verifiedBy` | INTEGER | Yes | NULL | Admin user ID who confirmed/rejected. |
| `verifiedAt` | TEXT | Yes | NULL | ISO timestamp of admin action. |
| `rejectionReason` | TEXT | Yes | NULL | Why the UTR was rejected (shown to tenant). |

---

## 1.2 — Update `type` Enum

The `payments.type` column currently has enum values: `["online", "manual"]`.

Add a new value: `"upi"` — for payments made via the manual UPI flow (tenant pays directly, submits UTR).

```sql
-- SQLite doesn't support ALTER ENUM, so we need a migration strategy.
-- See section 1.4 below for the full migration approach.
```

New enum values: `["online", "manual", "upi"]`

- `online` = Razorpay (used for deposits and legacy rent payments)
- `manual` = Admin recorded (cash/direct UPI, recorded by admin)
- `upi` = Tenant paid via UPI, submitted UTR, awaiting verification

---

## 1.3 — Update `status` Enum

The `payments.status` column currently has enum values: `["pending", "completed", "failed"]`.

**No new status values needed.** The existing `pending` status works for UPI payments awaiting verification. The `verificationStatus` column handles the sub-state.

Payment lifecycle for UPI payments:
```
status: "pending" + verificationStatus: NULL        → Payment initiated, UPI link shown
status: "pending" + verificationStatus: "pending"   → UTR submitted, awaiting admin
status: "completed" + verificationStatus: "verified" → Admin confirmed payment
status: "failed" + verificationStatus: "rejected"   → Admin rejected UTR
```

---

## 1.4 — Drizzle Migration File

Create a new Drizzle migration file. Since SQLite doesn't support `ALTER TABLE ADD COLUMN` with enum changes, the migration needs to handle this carefully.

**File**: `server/src/db/migrations/XXXX_manual_upi_payments.sql`

If you're using Drizzle Kit for migrations, run:
```bash
cd server
npx drizzle-kit generate
```

Then review the generated migration and ensure it includes:

```sql
-- Add new columns
ALTER TABLE payments ADD COLUMN utr TEXT UNIQUE;
ALTER TABLE payments ADD COLUMN verificationStatus TEXT;
ALTER TABLE payments ADD COLUMN utrSubmittedAt TEXT;
ALTER TABLE payments ADD COLUMN verifiedBy INTEGER REFERENCES users(id);
ALTER TABLE payments ADD COLUMN verifiedAt TEXT;
ALTER TABLE payments ADD COLUMN rejectionReason TEXT;

-- For the type enum change, SQLite requires table recreation.
-- Drizzle Kit should handle this automatically if you update the schema definition.
-- If doing manually:
-- 1. Create new table with updated schema
-- 2. Copy data from old table
-- 3. Drop old table
-- 4. Rename new table
```

---

## 1.5 — Update Schema Definition

**File**: `server/src/db/schema.ts`

Update the `payments` table definition:

```typescript
export const payments = sqliteTable("payments", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenant_id").notNull().references(() => users.id),
    bookingId: integer("booking_id").notNull().references(() => bookings.id),
    amount: real("amount").notNull(),
    // UPDATED: Added "upi" to the enum
    type: text("type", { enum: ["online", "manual", "upi"] }).notNull(),
    status: text("status", {
        enum: ["pending", "completed", "failed"],
    }).notNull().default("pending"),
    // Razorpay fields (only filled for online payments)
    razorpayOrderId: text("razorpay_order_id"),
    razorpayPaymentId: text("razorpay_payment_id"),
    razorpaySignature: text("razorpay_signature"),
    // NEW: UPI verification fields
    utr: text("utr"),
    verificationStatus: text("verification_status", {
        enum: ["pending", "verified", "rejected"],
    }),
    utrSubmittedAt: text("utr_submitted_at"),
    verifiedBy: integer("verified_by").references(() => users.id),
    verifiedAt: text("verified_at"),
    rejectionReason: text("rejection_reason"),
    // Existing fields...
    rentMonth: text("rent_month").notNull(),
    lateFee: real("late_fee").notNull().default(0),
    notes: text("notes"),
    paidAt: text("paid_at"),
    createdAt: text("created_at").notNull(),
}, (table) => ([
    index("idx_payments_tenant_month").on(table.tenantId, table.rentMonth),
    index("idx_payments_tenant_status").on(table.tenantId, table.status),
    index("idx_payments_status").on(table.status),
    index("idx_payments_booking_id").on(table.bookingId),
    // NEW: Index for finding pending verifications quickly
    index("idx_payments_verification_status").on(table.verificationStatus),
]));
```

---

## 1.6 — Update TypeScript Types

The `Payment` type is auto-inferred by Drizzle from the schema, so it will update automatically after the schema change.

**File**: `client/lib/types.ts`

Update the client-side `Payment` interface:

```typescript
export interface Payment {
  id: number;
  tenantId: number;
  tenantName?: string;
  roomName?: string;
  bedName?: string;
  amount: number;
  type: PaymentType;
  status: PaymentStatus;
  rentMonth: string;
  lateFee: number;
  paidAt: string | null;
  createdAt: string;
  // NEW:
  utr?: string | null;
  verificationStatus?: "pending" | "verified" | "rejected" | null;
  utrSubmittedAt?: string | null;
  verifiedBy?: number | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
}

// UPDATED: Added "upi"
export type PaymentType = "rent" | "deposit" | "manual" | "upi";
```

---

## 1.7 — Backward Compatibility

Existing payments (with `type: "online"` or `"manual"`) will have `verificationStatus: NULL`. This is fine — the verification flow only applies to `type: "upi"` payments.

When querying payments, always handle the case where `verificationStatus` is NULL:

```typescript
// Good: handles all cases
const isPendingVerification = payment.status === "pending" && payment.verificationStatus === "pending";
const isCompleted = payment.status === "completed" && payment.verificationStatus === "verified";
const isRejected = payment.status === "failed" && payment.verificationStatus === "rejected";

// For legacy payments (Razorpay/manual), status alone is sufficient
const isLegacyCompleted = payment.status === "completed" && payment.verificationStatus === null;
```

---

## Checklist

- [ ] Add new columns to `payments` table (utr, verificationStatus, utrSubmittedAt, verifiedBy, verifiedAt, rejectionReason)
- [ ] Add UNIQUE constraint on `utr` column
- [ ] Update `type` enum to include `"upi"`
- [ ] Add index on `verificationStatus`
- [ ] Update Drizzle schema definition
- [ ] Update client-side `Payment` type in `client/lib/types.ts`
- [ ] Run migration on production database
- [ ] Verify existing payments still query correctly (backward compatibility)
