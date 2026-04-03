# Step 3: Frontend — Tenant-Facing Changes

## Summary

Changes to the tenant-facing UI: new checkout modal, new verify payment page, and updates to the dashboard.

---

## 3.1 — UPI Utilities (Client)

**File**: `client/lib/upi.ts` (NEW)

```typescript
interface GenerateUPILinkParams {
    upiId: string;
    name: string;
    amount: number;
    note: string;
    transactionRef?: string;
}

/**
 * Generate a UPI deep link. Same logic as server-side version,
 * kept on client for convenience (no sensitive data involved).
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

/**
 * Check if the current device supports UPI deep links.
 * Returns true on mobile browsers (Android/iOS).
 * Desktop browsers don't register the upi:// protocol handler.
 */
export function supportsUPIIntent(): boolean {
    if (typeof window === "undefined") return false;
    const ua = navigator.userAgent;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}
```

---

## 3.2 — UPI Checkout Modal Component

**File**: `client/components/upi/UPICheckoutModal.tsx` (NEW)

```tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { generateUPILink, supportsUPIIntent } from "@/lib/upi";
import QRCode from "qrcode";
import { useEffect } from "react";
import { Copy, Smartphone, QrCode } from "lucide-react";
import toast from "react-hot-toast";

interface UPICheckoutModalProps {
    open: boolean;
    onClose: () => void;
    onProceed: () => void;
    amount: number;
    rentMonth: string;
    upiId: string;
    payeeName: string;
    paymentId: number;
}

export function UPICheckoutModal({
    open,
    onClose,
    onProceed,
    amount,
    rentMonth,
    upiId,
    payeeName,
    paymentId,
}: UPICheckoutModalProps) {
    const [qrDataUrl, setQrDataUrl] = useState<string>("");
    const [copied, setCopied] = useState(false);

    const upiLink = generateUPILink({
        upiId,
        name: payeeName,
        amount,
        note: `Rent ${rentMonth}`,
        transactionRef: `pay_${paymentId}`,
    });

    const isMobile = supportsUPIIntent();

    // Generate QR code on mount
    useEffect(() => {
        if (open) {
            QRCode.toDataURL(upiLink, { width: 256, margin: 2 })
                .then(setQrDataUrl)
                .catch(() => {});
        }
    }, [open, upiLink]);

    const handleCopyUPI = () => {
        navigator.clipboard.writeText(upiId);
        setCopied(true);
        toast.success("UPI ID copied!");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleOpenUPIApp = () => {
        window.location.href = upiLink;
    };

    const handleProceed = () => {
        onClose();
        onProceed();
    };

    return (
        <Modal open={open} onClose={onClose} title={`Pay Rent — ${rentMonth}`}>
            <div className="space-y-6">
                {/* Amount */}
                <div className="text-center">
                    <p className="text-sm text-base-content/60">Amount to Pay</p>
                    <p className="text-3xl font-bold">₹{amount.toLocaleString()}</p>
                </div>

                {/* QR Code (always shown) */}
                <div className="flex flex-col items-center">
                    {qrDataUrl ? (
                        <img src={qrDataUrl} alt="UPI QR Code" className="w-64 h-64 border rounded-lg" />
                    ) : (
                        <div className="w-64 h-64 flex items-center justify-center border rounded-lg bg-base-200">
                            <QrCode className="h-12 w-12 text-base-content/30" />
                        </div>
                    )}
                    <p className="text-sm text-base-content/60 mt-2">Scan with any UPI app</p>
                </div>

                {/* UPI ID with copy */}
                <div className="flex items-center justify-between bg-base-200 rounded-lg p-3">
                    <div>
                        <p className="text-xs text-base-content/50">UPI ID</p>
                        <p className="font-mono font-medium">{upiId}</p>
                    </div>
                    <button
                        onClick={handleCopyUPI}
                        className="btn btn-ghost btn-sm"
                        title="Copy UPI ID"
                    >
                        <Copy className="h-4 w-4" />
                        {copied ? "Copied!" : "Copy"}
                    </button>
                </div>

                {/* Mobile: Open UPI App button */}
                {isMobile && (
                    <button
                        onClick={handleOpenUPIApp}
                        className="btn btn-primary w-full"
                    >
                        <Smartphone className="h-4 w-4" />
                        Open UPI App
                    </button>
                )}

                {/* Important message */}
                <div className="alert alert-info text-sm">
                    <div>
                        <p className="font-medium">After payment, you'll need to enter the Transaction ID (UTR)</p>
                        {!isMobile && (
                            <p className="mt-1">
                                💡 We recommend completing the verification on your phone — it's easier to copy the
                                Transaction ID from your UPI app or bank SMS.
                            </p>
                        )}
                    </div>
                </div>

                {/* Proceed button */}
                <button onClick={handleProceed} className="btn btn-primary w-full">
                    I've Made the Payment →
                </button>
            </div>
        </Modal>
    );
}
```

**Dependencies**: Install `qrcode` and its types:
```bash
cd client
pnpm add qrcode
pnpm add -D @types/qrcode
```

---

## 3.3 — Verify Payment Page

**File**: `client/app/dashboard/payments/verify/page.tsx` (NEW)

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import toast from "react-hot-toast";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface PendingPayment {
    id: number;
    amount: number;
    lateFee: number;
    rentMonth: string;
    status: string;
    utr: string | null;
    verificationStatus: string | null;
    utrSubmittedAt: string | null;
    rejectionReason: string | null;
}

export default function VerifyPaymentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [payment, setPayment] = useState<PendingPayment | null>(null);
    const [utr, setUtr] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchPendingPayment = useCallback(async () => {
        try {
            const res = await api.get("/api/payments/my/pending");
            setPayment(res.data?.data || null);
        } catch {
            // No pending payment
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPendingPayment();
    }, [fetchPendingPayment]);

    const handleSubmitUTR = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payment) return;

        setSubmitting(true);
        try {
            await api.post("/api/payments/submit-utr", { utr });
            toast.success("UTR submitted! Awaiting verification.");
            fetchPendingPayment();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "Failed to submit UTR"));
        } finally {
            setSubmitting(false);
        }
    };

    const normalizedUtr = utr.toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    // No pending payment
    if (!payment) {
        return (
            <div className="max-w-md mx-auto mt-12">
                <div className="card bg-base-100 shadow-lg">
                    <div className="card-body items-center text-center">
                        <CheckCircle className="h-16 w-16 text-success mb-4" />
                        <h2 className="card-title">All Caught Up!</h2>
                        <p className="text-base-content/60">
                            You don't have any pending rent payments.
                        </p>
                        <button className="btn btn-primary mt-4" onClick={() => router.push("/dashboard")}>
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // UTR already submitted, awaiting verification
    if (payment.verificationStatus === "pending") {
        return (
            <div className="max-w-md mx-auto mt-12">
                <div className="card bg-base-100 shadow-lg">
                    <div className="card-body items-center text-center">
                        <Clock className="h-16 w-16 text-warning mb-4" />
                        <h2 className="card-title">Verification in Progress</h2>
                        <p className="text-base-content/60">
                            Your payment for {payment.rentMonth} is being verified.
                        </p>
                        <div className="bg-base-200 rounded-lg p-4 w-full mt-4">
                            <p className="text-sm">UTR: <span className="font-mono font-bold">{payment.utr}</span></p>
                            <p className="text-sm text-base-content/50">
                                Submitted: {payment.utrSubmittedAt ? new Date(payment.utrSubmittedAt).toLocaleString() : "—"}
                            </p>
                        </div>
                        <p className="text-sm text-base-content/50 mt-2">
                            We'll update you once confirmed.
                        </p>
                        <button className="btn btn-primary mt-4" onClick={() => router.push("/dashboard")}>
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Payment was rejected
    if (payment.verificationStatus === "rejected") {
        return (
            <div className="max-w-md mx-auto mt-12">
                <div className="card bg-base-100 shadow-lg border border-error/30">
                    <div className="card-body items-center text-center">
                        <XCircle className="h-16 w-16 text-error mb-4" />
                        <h2 className="card-title text-error">Payment Not Verified</h2>
                        <p className="text-base-content/60">
                            Your UTR could not be verified. Please check with your bank and try again.
                        </p>
                        {payment.rejectionReason && (
                            <div className="bg-error/10 rounded-lg p-4 w-full mt-4">
                                <p className="text-sm text-error">{payment.rejectionReason}</p>
                            </div>
                        )}
                        <button className="btn btn-primary mt-4" onClick={() => router.push("/dashboard")}>
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // UTR not yet submitted — show input form
    const totalAmount = payment.amount + payment.lateFee;

    return (
        <div className="max-w-md mx-auto mt-12">
            <div className="card bg-base-100 shadow-lg">
                <div className="card-body">
                    <h2 className="card-title">Verify Your Payment</h2>

                    {/* Payment details */}
                    <div className="bg-base-200 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-base-content/60">Month</span>
                            <span className="font-medium">{payment.rentMonth}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-base-content/60">Rent</span>
                            <span className="font-medium">₹{(totalAmount - payment.lateFee).toLocaleString()}</span>
                        </div>
                        {payment.lateFee > 0 && (
                            <div className="flex justify-between">
                                <span className="text-base-content/60">Late Fee</span>
                                <span className="font-medium text-error">₹{payment.lateFee}</span>
                            </div>
                        )}
                        <div className="divider my-1"></div>
                        <div className="flex justify-between">
                            <span className="font-bold">Total</span>
                            <span className="font-bold">₹{totalAmount.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* UTR Input */}
                    <form onSubmit={handleSubmitUTR} className="space-y-4 mt-4">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-medium">Transaction ID (UTR)</span>
                                <span className={`label-text ${normalizedUtr.length === 12 ? "text-success" : "text-base-content/40"}`}>
                                    {normalizedUtr.length}/12
                                </span>
                            </label>
                            <input
                                type="text"
                                maxLength={12}
                                value={utr}
                                onChange={(e) => setUtr(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                                placeholder="Enter 12-digit Transaction ID"
                                className={`input input-bordered w-full font-mono ${
                                    normalizedUtr.length === 12 ? "input-success" : ""
                                }`}
                                required
                            />
                        </div>

                        {/* Help text */}
                        <div className="bg-info/10 rounded-lg p-4 text-sm space-y-2">
                            <p className="font-medium">Where to find the Transaction ID:</p>
                            <ul className="list-disc list-inside space-y-1 text-base-content/70">
                                <li>Check the SMS from your bank — it usually contains the Transaction ID</li>
                                <li>Open your UPI app → Transaction History → tap on this payment</li>
                                <li>Google Pay may not show UTR directly; your bank SMS is the most reliable source</li>
                            </ul>
                        </div>

                        <button
                            type="submit"
                            className={`btn btn-primary w-full ${submitting || normalizedUtr.length !== 12 ? "btn-disabled" : ""}`}
                            disabled={submitting || normalizedUtr.length !== 12}
                        >
                            {submitting && <span className="loading loading-spinner loading-sm"></span>}
                            Submit for Verification
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
```

---

## 3.4 — Dashboard Page Changes

**File**: `client/app/dashboard/page.tsx`

### 3.4.1 — Remove Razorpay Import

Remove:
```typescript
import { openRazorpayCheckout } from "@/lib/razorpay";
```

Add:
```typescript
import { UPICheckoutModal } from "@/components/upi/UPICheckoutModal";
import { supportsUPIIntent } from "@/lib/upi";
```

### 3.4.2 — Modify `handlePayRent()`

**Before** (Razorpay flow):
```typescript
const handlePayRent = async () => {
    // ... initiate
    const result = await openRazorpayCheckout({ ... });
    await api.post("/api/payments/verify", { ...result, rentMonth });
    await refreshBooking();
};
```

**After** (UPI flow):
```typescript
const [upiModalOpen, setUpiModalOpen] = useState(false);
const [upiPaymentData, setUpiPaymentData] = useState<{
    paymentId: number;
    upiLink: string;
    amount: number;
    rentMonth: string;
} | null>(null);

const handlePayRent = async () => {
    if (!bookingData) return;

    const now = new Date();
    const rentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    setPayingRent(true);

    try {
        const paymentData = await api.post("/api/payments/initiate", { rentMonth })
            .then(res => res.data.data);

        if (!paymentData) return;

        // Store payment data and open UPI checkout modal
        setUpiPaymentData({
            paymentId: paymentData.paymentId,
            upiLink: paymentData.upiLink,
            amount: paymentData.amount,
            rentMonth,
        });
        setUpiModalOpen(true);
    } catch (err: unknown) {
        const msg = getErrorMessage(err, "Payment initiation failed");
        toast.error(msg);
    } finally {
        setPayingRent(false);
    }
};

const handleUPIProceed = () => {
    // Redirect to verify page
    window.location.href = "/dashboard/payments/verify";
};
```

### 3.4.3 — Add UPI Modal to JSX

Add at the bottom of the return JSX (alongside other modals):

```tsx
<UPICheckoutModal
    open={upiModalOpen}
    onClose={() => setUpiModalOpen(false)}
    onProceed={handleUPIProceed}
    amount={upiPaymentData?.amount || 0}
    rentMonth={upiPaymentData?.rentMonth || ""}
    upiId={process.env.NEXT_PUBLIC_UPI_ID || ""}
    payeeName={process.env.NEXT_PUBLIC_UPI_PAYEE_NAME || ""}
    paymentId={upiPaymentData?.paymentId || 0}
/>
```

**Note**: `NEXT_PUBLIC_UPI_ID` and `NEXT_PUBLIC_UPI_PAYEE_NAME` need to be set in your Next.js env config. These are public (non-sensitive) values.

Alternatively, you can fetch these from a settings endpoint instead of env vars.

---

## 3.5 — RentPaymentSection Changes

**File**: `client/app/dashboard/page-comps/RentPaymentSection.tsx`

### 3.5.1 — Update Description Text

Change:
```tsx
<p className="text-sm text-base-content/60">
    Pay your rent for the current month online via Razorpay
</p>
```

To:
```tsx
<p className="text-sm text-base-content/60">
    Pay your rent for the current month via UPI
</p>
```

### 3.5.2 — Show Pending Verification State

Add a new card to show when payment is pending verification:

```tsx
{/* Pending Verification State */}
{bookingData.pendingUPIVerification && (
    <div className="card bg-warning/10 border border-warning/30 mb-6">
        <div className="card-body flex flex-row items-center gap-4 py-4">
            <Clock className="h-6 w-6 text-warning shrink-0" />
            <div className="flex-1">
                <h3 className="font-bold text-warning-content">Payment Under Verification</h3>
                <p className="text-sm text-base-content/60">
                    Your payment of ₹{bookingData.pendingUPIVerification.amount.toLocaleString()} for{" "}
                    {bookingData.pendingUPIVerification.rentMonth} is being verified.
                    {bookingData.pendingUPIVerification.utr && (
                        <span className="block mt-1 font-mono text-xs">
                            UTR: {bookingData.pendingUPIVerification.utr}
                        </span>
                    )}
                </p>
            </div>
            <Link href="/dashboard/payments/verify" className="btn btn-warning btn-sm">
                Check Status
            </Link>
        </div>
    </div>
)}
```

This requires the `BookingData` type to include `pendingUPIVerification` — see the types update in `01-database-changes.md`.

---

## 3.6 — New Hook: `useUPIPayment`

**File**: `client/hooks/useUPIPayment.ts` (NEW)

```typescript
"use client";

import { useState, useCallback } from "react";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import toast from "react-hot-toast";

interface PendingPayment {
    id: number;
    amount: number;
    lateFee: number;
    rentMonth: string;
    status: string;
    utr: string | null;
    verificationStatus: string | null;
}

interface UseUPIPaymentReturn {
    pendingPayment: PendingPayment | null;
    loading: boolean;
    refreshPending: () => Promise<void>;
    submitUTR: (utr: string) => Promise<boolean>;
}

export function useUPIPayment(): UseUPIPaymentReturn {
    const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchPending = useCallback(async () => {
        try {
            const res = await api.get("/api/payments/my/pending");
            setPendingPayment(res.data?.data || null);
        } catch {
            setPendingPayment(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const refreshPending = useCallback(async () => {
        setLoading(true);
        await fetchPending();
    }, [fetchPending]);

    const submitUTR = useCallback(async (utr: string): Promise<boolean> => {
        try {
            await api.post("/api/payments/submit-utr", { utr });
            toast.success("UTR submitted successfully!");
            await fetchPending();
            return true;
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "Failed to submit UTR"));
            return false;
        }
    }, [fetchPending]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const refreshPendingOnMount = useCallback(() => { fetchPending(); }, []);

    useState(() => { refreshPendingOnMount(); });

    return { pendingPayment, loading, refreshPending, submitUTR };
}
```

---

## 3.7 — Navigation: Add "Verify Payment" Link

Add a link to the verify page in the tenant navigation or dashboard. This could be:

1. A link in the dashboard sidebar/nav: "Verify Payment"
2. A banner on the dashboard when a pending payment exists
3. Both

Example nav link (wherever your tenant nav is defined):

```tsx
<Link href="/dashboard/payments/verify" className="btn btn-outline btn-sm">
    Verify Payment
</Link>
```

---

## Checklist

- [ ] Create `client/lib/upi.ts` utility
- [ ] Install `qrcode` and `@types/qrcode`
- [ ] Create `client/components/upi/UPICheckoutModal.tsx`
- [ ] Create `client/app/dashboard/payments/verify/page.tsx`
- [ ] Modify `client/app/dashboard/page.tsx` — replace Razorpay flow with UPI modal
- [ ] Update `client/app/dashboard/page-comps/RentPaymentSection.tsx` — add pending verification state
- [ ] Create `client/hooks/useUPIPayment.ts`
- [ ] Add "Verify Payment" link to tenant navigation
- [ ] Set `NEXT_PUBLIC_UPI_ID` and `NEXT_PUBLIC_UPI_PAYEE_NAME` in Next.js env
- [ ] Remove `openRazorpayCheckout` import from dashboard page (but keep the file for deposits)
