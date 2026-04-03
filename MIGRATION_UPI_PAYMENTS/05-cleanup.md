# Step 5: Cleanup & Deprecation

## Summary

What to remove, what to keep, and how to clean up after the migration.

---

## 5.1 — What to REMOVE

### Backend

| File/Route | Action | Reason |
|------------|--------|--------|
| `POST /api/payments/verify` | **Remove route registration** | Razorpay-specific, no longer used for rent |
| Razorpay order creation in `initiateRentPayment()` | **Remove** | Replaced by UPI link generation |
| Razorpay fields from `initiateRentPayment()` return type | **Remove** `razorpayOrderId`, `razorpayKeyId` | No longer returned |

### Frontend — Tenant

| File/Code | Action | Reason |
|-----------|--------|--------|
| `openRazorpayCheckout` import in `dashboard/page.tsx` | **Remove import** | Not used for rent anymore |
| Razorpay checkout call in `handlePayRent()` | **Replace** with UPI modal flow | Rent now uses UPI |
| "via Razorpay" text in `RentPaymentSection.tsx` | **Update** to "via UPI" | Accuracy |

### Frontend — Hooks

| File | Action | Reason |
|------|--------|--------|
| `verifyPayment` in `usePayments.ts` | **Remove or deprecate** | Razorpay-specific, not used for rent |
| `initiatePayment` return type in `usePayments.ts` | **Update** to match new response (no `razorpayOrderId`, `razorpayKeyId`) | API changed |

---

## 5.2 — What to KEEP

### Razorpay Files (for Deposits)

| File | Keep? | Reason |
|------|-------|--------|
| `server/src/services/razorpay.service.ts` | ✅ Keep | Still used for deposit payments |
| `server/src/routes/bookings.ts` (deposit verify) | ✅ Keep | Deposit flow unchanged |
| `client/lib/razorpay.ts` | ✅ Keep | Still used for deposit checkout on homepage |
| `client/app/page.tsx` (booking + deposit) | ✅ Keep | Homepage deposit flow unchanged |
| `POST /api/bookings/deposit/verify` | ✅ Keep | Deposit verification unchanged |
| `POST /api/payments/webhook` | ✅ Keep | Razorpay webhook for deposits |

### Env Vars (Keep for Deposits)

| Env Var | Keep? | Reason |
|---------|-------|--------|
| `RAZORPAY_KEY_ID` | ✅ Keep | Needed for deposit payments |
| `RAZORPAY_KEY_SECRET` | ✅ Keep | Needed for deposit order creation & signature verification |

---

## 5.3 — What to UPDATE

### Database

| Item | Change | Details |
|------|--------|---------|
| `payments.type` enum | Add `"upi"` | New payment type for manual UPI payments |
| `payments` table | Add columns | `utr`, `verificationStatus`, `utrSubmittedAt`, `verifiedBy`, `verifiedAt`, `rejectionReason` |
| `payments` indexes | Add index | `idx_payments_verification_status` |

### API Response Types

| Item | Change |
|------|--------|
| `POST /api/payments/initiate` response | Remove `razorpayOrderId`, `razorpayKeyId`; add `upiLink` |
| `GET /api/payments/my` response | Include new UPI fields (`utr`, `verificationStatus`, etc.) |
| `GET /api/payments` admin response | Include new UPI fields |

### Client Types

| File | Change |
|------|--------|
| `client/lib/types.ts` — `Payment` | Add `utr`, `verificationStatus`, `utrSubmittedAt`, `verifiedBy`, `verifiedAt`, `rejectionReason` |
| `client/lib/types.ts` — `PaymentType` | Add `"upi"` |
| `client/lib/types.ts` — `BookingData` | Add `pendingUPIVerification` (optional) |

---

## 5.4 — Env Var Summary

### Keep (Deposits)
```
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
```

### Add (UPI Rent Payments)
```
UPI_ID              # Your UPI ID (e.g., "yourname@oksbi")
UPI_PAYEE_NAME      # Your name as registered with UPI
TELEGRAM_BOT_TOKEN  # For payment notifications
TELEGRAM_CHAT_ID    # Your Telegram chat ID
```

### Frontend Public Env (Next.js)
```
NEXT_PUBLIC_UPI_ID          # Same as UPI_ID (non-sensitive)
NEXT_PUBLIC_UPI_PAYEE_NAME  # Same as UPI_PAYEE_NAME (non-sensitive)
```

---

## 5.5 — Files That Should NOT Be Touched

These files are **completely unrelated** to this migration:

- `server/src/routes/auth.ts`
- `server/src/routes/users.ts`
- `server/src/routes/rooms.ts`
- `server/src/routes/complaints.ts`
- `server/src/routes/admin.ts`
- `server/src/routes/settings.ts`
- `server/src/routes/export.ts`
- `server/src/middleware/auth.ts`
- `server/src/middleware/cors.ts`
- `client/app/auth/**`
- `client/app/admin/rooms/**`
- `client/app/admin/tenants/**`
- `client/app/admin/settings/**`
- `client/app/admin/complaints/**`
- `client/context/AuthContext.tsx`
- `client/lib/api.ts`
- `client/lib/errors.ts`

---

## 5.6 — Migration Order (Recommended)

Follow this order to minimize risk:

1. **Database changes** (01-database-changes.md)
2. **Backend: new utilities** (UPI link generator, Telegram service)
3. **Backend: new service functions** (submitUTR, adminVerify, getPending)
4. **Backend: new API routes** (submit-utr, my/pending, admin/verify, admin/pending, telegram webhook)
5. **Backend: modify existing routes** (initiate → UPI, remove verify)
6. **Frontend: utilities** (UPI lib, QR code dependency)
7. **Frontend: tenant components** (checkout modal, verify page)
8. **Frontend: dashboard changes** (replace Razorpay flow)
9. **Frontend: admin components** (pending verifications page, payments table updates)
10. **Testing** (06-testing-checklist.md)
11. **Cleanup** (remove deprecated code)

---

## 5.7 — Rollback Plan

If something goes wrong:

1. **Revert the `initiateRentPayment()` function** to use Razorpay
2. **Re-add the `POST /api/payments/verify` route**
3. **Revert dashboard `handlePayRent()`** to use Razorpay checkout
4. **Keep the new UPI columns** in the database (they're nullable, won't break anything)
5. **Set `payments.type` back to `"online"`** for any payments created during the transition

The database changes are **additive only** (new columns, no deletions), so they're safe to keep even if you roll back the code.

---

## Checklist

- [ ] Remove `POST /api/payments/verify` route
- [ ] Remove Razorpay logic from `initiateRentPayment()`
- [ ] Remove `openRazorpayCheckout` import from dashboard
- [ ] Remove `verifyPayment` from `usePayments.ts` (or mark deprecated)
- [ ] Update all client types
- [ ] Update API response types
- [ ] Remove "via Razorpay" text from tenant UI
- [ ] Verify deposit flow still works (homepage → booking → deposit)
- [ ] Verify admin manual payment flow still works
- [ ] Verify payment history page still works
- [ ] Verify receipt generation still works
- [ ] Verify CSV export still works
