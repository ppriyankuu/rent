# Step 6: Testing Checklist

## Summary

Step-by-step testing to verify the migration works correctly before and after going live.

---

## 6.1 — Pre-Deployment Testing (Local/Dev)

### Database

- [ ] Run migration script — no errors
- [ ] Verify new columns exist in `payments` table: `utr`, `verificationStatus`, `utrSubmittedAt`, `verifiedBy`, `verifiedAt`, `rejectionReason`
- [ ] Verify UNIQUE constraint on `utr` column
- [ ] Verify existing payments still query correctly (backward compatibility)
- [ ] Verify `payments.type` enum includes `"upi"`

### Backend — UPI Payment Initiation

- [ ] `POST /api/payments/initiate` returns `{ paymentId, upiLink, amount, rentMonth }` (no Razorpay fields)
- [ ] UPI link format is correct: `upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...&tr=...`
- [ ] Payment record is created with `type: "upi"`, `status: "pending"`
- [ ] Late fee is calculated correctly
- [ ] Prorated rent is calculated correctly for first month
- [ ] Duplicate payment prevention works (can't pay for same month twice)
- [ ] Error: tenant with no active booking gets rejected
- [ ] Error: tenant with deactivated account gets rejected

### Backend — UTR Submission

- [ ] `POST /api/payments/submit-utr` accepts valid 12-char alphanumeric UTR
- [ ] UTR is normalized to uppercase
- [ ] UTR with special characters is rejected
- [ ] UTR shorter than 12 chars is rejected
- [ ] Duplicate UTR is rejected (UNIQUE constraint)
- [ ] UTR submission updates `verificationStatus` to `"pending"`
- [ ] UTR submission sets `utrSubmittedAt` timestamp
- [ ] Error: no pending payment → appropriate error message
- [ ] Error: payment already has UTR → appropriate error message

### Backend — Admin Verification

- [ ] `POST /api/payments/admin/verify` with `action: "verify"` marks payment as `completed` + `verificationStatus: "verified"`
- [ ] `POST /api/payments/admin/verify` with `action: "reject"` marks payment as `failed` + `verificationStatus: "rejected"`
- [ ] Verification sets `verifiedBy` and `verifiedAt`
- [ ] Rejection sets `rejectionReason`
- [ ] Booking's `nextRentDueDate` is updated after verification
- [ ] Bed status is updated to `"occupied"` after verification
- [ ] Error: verifying non-pending payment → appropriate error
- [ ] Error: invalid payment ID → appropriate error

### Backend — Pending Payments

- [ ] `GET /api/payments/my/pending` returns current pending UPI payment for tenant
- [ ] `GET /api/payments/my/pending` returns `null` when no pending payment
- [ ] `GET /api/payments/admin/pending` returns all pending UPI verifications
- [ ] Admin pending list includes tenant name, email, room, bed info

### Backend — Telegram Notifications

- [ ] UTR submission triggers Telegram message
- [ ] Message contains: tenant name, email, amount, month, late fee, UTR, payment ID
- [ ] Message includes inline buttons: "Confirm" and "Reject"
- [ ] If Telegram credentials are missing, notification is skipped gracefully (no crash)
- [ ] Telegram webhook route receives callback queries

### Backend — Existing Flows (Regression)

- [ ] `POST /api/bookings` (deposit initiation) still works with Razorpay
- [ ] `POST /api/bookings/deposit/verify` still verifies Razorpay signatures
- [ ] `POST /api/payments/manual` (admin manual payment) still works
- [ ] `GET /api/payments/my` (tenant payment history) still works
- [ ] `GET /api/payments` (admin payment list) still works
- [ ] `GET /api/payments/my/:id/receipt` still returns receipt data
- [ ] `POST /api/payments/webhook` (Razorpay webhook) still processes deposit events

### Frontend — Tenant

- [ ] UPI Checkout Modal opens when tenant clicks "Pay Rent"
- [ ] QR code is generated and displayed
- [ ] UPI ID is displayed with copy button
- [ ] "Open UPI App" button appears on mobile devices
- [ ] "Open UPI App" button triggers UPI deep link on mobile
- [ ] "I've Made the Payment" button redirects to verify page
- [ ] Verify page (`/dashboard/payments/verify`) loads correctly
- [ ] Verify page shows pending payment details (amount, month, late fee)
- [ ] UTR input auto-uppercase, restricts to alphanumeric, shows char count
- [ ] Submit button is disabled until 12 chars entered
- [ ] Successful UTR submission shows success toast
- [ ] "Verification in Progress" state shows UTR and submission time
- [ ] "Payment Rejected" state shows rejection reason
- [ ] "All Caught Up" state shows when no pending payment
- [ ] Dashboard shows "Payment Under Verification" card when applicable

### Frontend — Admin

- [ ] `/admin/payments/pending` page loads
- [ ] Pending payments table shows all required columns
- [ ] "Verify" button confirms payment successfully
- [ ] "Reject" button opens modal with reason input
- [ ] Rejection with reason is recorded correctly
- [ ] Verified/rejected payments disappear from pending list
- [ ] Empty state shows when no pending verifications
- [ ] UTR column appears in main payments table
- [ ] Verification status badges appear for UPI payments

---

## 6.2 — Post-Deployment Testing (Production)

### Environment

- [ ] `UPI_ID` env var is set correctly
- [ ] `UPI_PAYEE_NAME` env var is set correctly
- [ ] `TELEGRAM_BOT_TOKEN` secret is set
- [ ] `TELEGRAM_CHAT_ID` secret is set
- [ ] `NEXT_PUBLIC_UPI_ID` is set in Next.js config
- [ ] `NEXT_PUBLIC_UPI_PAYEE_NAME` is set in Next.js config
- [ ] Razorpay env vars are still set (for deposits)

### End-to-End: Tenant Pays Rent

1. [ ] Tenant logs in, goes to dashboard
2. [ ] Clicks "Pay Rent"
3. [ ] UPI Checkout Modal opens with correct amount and QR code
4. [ ] On mobile: "Open UPI App" button works
5. [ ] On desktop: QR code scans correctly
6. [ ] Tenant makes payment via UPI app
7. [ ] Tenant clicks "I've Made the Payment"
8. [ ] Redirected to verify page
9. [ ] Verify page shows correct payment details
10. [ ] Tenant enters UTR from bank SMS / UPI app
11. [ ] UTR is submitted successfully
12. [ ] "Verification in Progress" message is shown

### End-to-End: Admin Verifies Payment

1. [ ] Admin receives Telegram notification with payment details
2. [ ] Telegram message shows correct amount, tenant, month, UTR
3. [ ] Admin checks bank account — payment is visible
4. [ ] Admin clicks "Confirm" in Telegram (or verifies via admin panel)
5. [ ] Payment status updates to "completed"
6. [ ] Tenant's dashboard updates — shows "Rent Paid" confirmation
7. [ ] Payment appears in tenant's payment history

### End-to-End: Admin Rejects Payment

1. [ ] Admin receives Telegram notification
2. [ ] Admin checks bank account — payment is NOT visible
3. [ ] Admin clicks "Reject" in Telegram (or via admin panel)
4. [ ] Admin enters rejection reason
5. [ ] Payment status updates to "failed"
6. [ ] Tenant sees "Payment Not Verified" message with reason
7. [ ] Tenant can re-initiate payment and try again

### Regression: Deposit Flow

1. [ ] New user visits homepage
2. [ ] Selects a bed, fills move-in date
3. [ ] Razorpay checkout opens for deposit
4. [ ] Deposit payment completes
5. [ ] Signature verification passes
6. [ ] Booking status becomes "deposit_paid"
7. [ ] Bed status becomes "reserved"

### Regression: Admin Manual Payment

1. [ ] Admin goes to `/admin/payments`
2. [ ] Clicks "Record Payment"
3. [ ] Fills tenant, amount, month, notes
4. [ ] Submits — payment is recorded as "completed"
5. [ ] Tenant's dashboard updates

---

## 6.3 — Edge Cases to Test

- [ ] Tenant tries to pay for a month that's already paid → error
- [ ] Tenant tries to pay before move-in month → error
- [ ] Tenant submits UTR for a payment that doesn't exist → error
- [ ] Tenant submits a UTR that was already used by another tenant → error (UNIQUE constraint)
- [ ] Tenant submits UTR with lowercase letters → auto-converted to uppercase
- [ ] Tenant submits UTR with spaces/special chars → stripped out
- [ ] Admin tries to verify a payment that's already verified → error
- [ ] Admin tries to reject a payment that's already verified → error
- [ ] Telegram notification fails (network error) → payment still recorded, error logged
- [ ] Tenant has two pending payments (edge case) → most recent one is used
- [ ] Deactivated tenant tries to pay → error
- [ ] Admin records manual payment for a month that's already paid → error

---

## 6.4 — Performance Checks

- [ ] UPI link generation is instant (< 10ms)
- [ ] QR code generation completes in < 500ms
- [ ] UTR submission completes in < 1s
- [ ] Admin pending page loads in < 2s (with 100+ pending payments)
- [ ] Telegram notification is sent within 2s of UTR submission
- [ ] No N+1 query issues in admin pending payments list

---

## 6.5 — Security Checks

- [ ] UTR UNIQUE constraint prevents duplicate submissions at DB level
- [ ] Tenant can only submit UTR for their own payments (tenantId check)
- [ ] Admin verification requires admin role (requireAdmin middleware)
- [ ] Telegram webhook validates callback data format
- [ ] UTR input is sanitized (only alphanumeric allowed)
- [ ] No sensitive data (Telegram tokens, UPI ID secrets) exposed in frontend code
- [ ] Razorpay key secret is still server-only (never sent to frontend for rent payments)

---

## Final Sign-Off

- [ ] All pre-deployment tests pass
- [ ] All post-deployment tests pass
- [ ] All edge cases tested
- [ ] All regression tests pass (deposit flow, manual payments, payment history)
- [ ] No console errors in browser
- [ ] No server errors in logs
- [ ] Telegram notifications working
- [ ] Database migration applied successfully
- [ ] Backup created before migration
