# Migration Guide: Razorpay → Manual UPI Verification

## Overview

This migration replaces the Razorpay payment gateway for **rent payments** with a manual UPI-based verification system. **Deposits continue using Razorpay** (they need instant confirmation for bed reservation).

### What Changes
- Rent payments: Razorpay → UPI deep link / QR code + UTR submission
- Deposits: **Unchanged** (still Razorpay)
- Admin manual payments: **Unchanged** (still works as before)

### What Stays the Same
- Deposit flow (booking → Razorpay → verify → bed reserved)
- Admin manual payment recording
- Payment history, receipts, exports
- Late fee logic, rent calculation, prorated first month
- All admin payment management pages

---

## File Structure of This Guide

| File | Purpose |
|------|---------|
| `01-database-changes.md` | Schema migrations, new columns, new tables |
| `02-backend-api.md` | New/modified API routes, services, validators |
| `03-frontend-tenant.md` | Tenant-facing UI: checkout modal, verify page, dashboard changes |
| `04-frontend-admin.md` | Admin panel changes: UTR verification, Telegram bot |
| `05-cleanup.md` | What to remove, deprecation steps, env var cleanup |
| `06-testing-checklist.md` | Step-by-step testing checklist before going live |

---

## Architecture Summary

```
RENT PAYMENT FLOW (new):
  Dashboard → Click "Pay Rent"
            → Show UPI Checkout Modal (QR + deep link)
            → User pays via UPI app
            → User goes to /dashboard/payments/verify
            → System auto-detects pending payment
            → User enters UTR (Transaction ID)
            → POST /api/payments/submit-utr
            → Payment status: "pending_verification"
            → Telegram notification sent to admin
            → Admin verifies in bank account
            → Admin clicks "Confirm" (admin panel or Telegram)
            → Payment status: "completed"
            → Booking updated (nextRentDueDate, bed status)

DEPOSIT FLOW (unchanged):
  Homepage → POST /api/bookings → creates booking + Razorpay order
            → openRazorpayCheckout() (frontend popup)
            → POST /api/bookings/deposit/verify → verifies signature → bed: reserved
```

---

## Key Decisions

1. **Hybrid approach**: Razorpay stays for deposits, manual UPI for rent
2. **New payment status**: `pending_verification` — UTR submitted but not yet confirmed by admin
3. **UTR uniqueness**: Enforced at DB level (UNIQUE constraint) to prevent reuse
4. **No callback URL**: UPI protocol doesn't support it without a payment gateway
5. **Phone-first UTR submission**: Desktop users are encouraged to complete verification on their phone

---

## Prerequisites

Before starting, ensure you have:
- Your UPI ID (e.g., `yourname@oksbi`)
- Your full name (as registered with UPI)
- Telegram Bot Token and your Chat ID (for notifications)
- Database backup (in case migration needs rollback)
