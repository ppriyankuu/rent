# Step 4: Frontend — Admin Changes

## Summary

Admin panel updates to view and verify/reject pending UPI payments.

---

## 4.1 — Pending Verifications Page

**File**: `client/app/admin/payments/pending/page.tsx` (NEW)

```tsx
"use client";

import { useState, useEffect } from "react";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import api from "@/lib/api";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { TableSkeleton } from "@/components/Skeleton";
import { Modal } from "@/components/Modal";
import { formatDate } from "@/lib/utils/date";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

interface PendingPayment {
    id: number;
    tenantId: number;
    tenantName: string;
    tenantEmail: string;
    roomName?: string;
    bedName?: string;
    amount: number;
    lateFee: number;
    rentMonth: string;
    utr: string;
    utrSubmittedAt: string;
    rejectionReason: string | null;
}

export default function AdminPendingVerificationsPage() {
    const [payments, setPayments] = useState<PendingPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchPending();
    }, []);

    const fetchPending = async () => {
        try {
            const res = await api.get("/api/payments/admin/pending");
            setPayments(res.data?.data || []);
        } catch {
            toast.error("Failed to load pending verifications");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (paymentId: number) => {
        setProcessing(true);
        try {
            await api.post("/api/payments/admin/verify", {
                paymentId,
                action: "verify",
            });
            toast.success("Payment verified!");
            fetchPending();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "Failed to verify payment"));
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPayment) return;

        setProcessing(true);
        try {
            await api.post("/api/payments/admin/verify", {
                paymentId: selectedPayment.id,
                action: "reject",
                rejectionReason: rejectionReason || undefined,
            });
            toast.success("Payment rejected");
            setRejectModalOpen(false);
            setSelectedPayment(null);
            setRejectionReason("");
            fetchPending();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, "Failed to reject payment"));
        } finally {
            setProcessing(false);
        }
    };

    const openRejectModal = (payment: PendingPayment) => {
        setSelectedPayment(payment);
        setRejectionReason("");
        setRejectModalOpen(true);
    };

    if (loading) {
        return (
            <div>
                <PageHeader title="Pending Verifications" icon={Clock} />
                <TableSkeleton rows={5} />
            </div>
        );
    }

    return (
        <div>
            <PageHeader title="Pending Verifications" icon={Clock} />

            {payments.length === 0 ? (
                <EmptyState
                    icon={CheckCircle}
                    title="No pending verifications"
                    description="All UPI payments have been processed."
                />
            ) : (
                <div className="overflow-x-auto">
                    <table className="table table-zebra">
                        <thead>
                            <tr>
                                <th>Payment ID</th>
                                <th>Tenant</th>
                                <th>Room & Bed</th>
                                <th>Month</th>
                                <th>Amount</th>
                                <th>Late Fee</th>
                                <th>UTR</th>
                                <th>Submitted</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((p) => (
                                <tr key={p.id}>
                                    <td>#{p.id}</td>
                                    <td>
                                        <div className="font-medium">{p.tenantName}</div>
                                        <div className="text-xs text-base-content/50">{p.tenantEmail}</div>
                                    </td>
                                    <td>
                                        {p.roomName && p.bedName ? (
                                            <div className="text-sm">{p.roomName} - {p.bedName}</div>
                                        ) : (
                                            <span className="text-base-content/50 text-sm">N/A</span>
                                        )}
                                    </td>
                                    <td className="font-medium">{p.rentMonth}</td>
                                    <td>₹{(p.amount + p.lateFee).toLocaleString()}</td>
                                    <td>{p.lateFee > 0 ? <span className="text-error">₹{p.lateFee}</span> : "—"}</td>
                                    <td><span className="font-mono text-xs">{p.utr}</span></td>
                                    <td className="text-sm">{p.utrSubmittedAt ? formatDate(p.utrSubmittedAt) : "—"}</td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button
                                                className="btn btn-success btn-xs"
                                                onClick={() => handleVerify(p.id)}
                                                disabled={processing}
                                            >
                                                <CheckCircle className="h-3 w-3" /> Verify
                                            </button>
                                            <button
                                                className="btn btn-error btn-xs"
                                                onClick={() => openRejectModal(p)}
                                                disabled={processing}
                                            >
                                                <XCircle className="h-3 w-3" /> Reject
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Reject Modal */}
            <Modal
                open={rejectModalOpen}
                onClose={() => { setRejectModalOpen(false); setSelectedPayment(null); }}
                title="Reject Payment"
            >
                <form onSubmit={handleReject} className="space-y-4">
                    <div className="bg-base-200 rounded-lg p-4">
                        <p className="font-medium">{selectedPayment?.tenantName}</p>
                        <p className="text-sm text-base-content/60">
                            {selectedPayment?.rentMonth} — ₹{(selectedPayment?.amount || 0 + (selectedPayment?.lateFee || 0)).toLocaleString()}
                        </p>
                        <p className="text-sm font-mono mt-1">UTR: {selectedPayment?.utr}</p>
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Rejection Reason</span>
                        </label>
                        <textarea
                            className="textarea textarea-bordered w-full"
                            placeholder="e.g., Payment not found in bank account"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <button
                        type="submit"
                        className={`btn btn-error w-full ${processing ? "btn-disabled" : ""}`}
                        disabled={processing}
                    >
                        {processing && <span className="loading loading-spinner loading-sm"></span>}
                        Reject Payment
                    </button>
                </form>
            </Modal>
        </div>
    );
}
```

---

## 4.2 — Update Admin Payments Page

**File**: `client/app/admin/payments/page.tsx`

### 4.2.1 — Add Link to Pending Verifications

Add a button in the PageHeader actions:

```tsx
import Link from "next/link";
import { Clock } from "lucide-react";

// In the actions section of PageHeader:
<Link href="/admin/payments/pending" className="btn btn-warning btn-sm">
    <Clock className="h-4 w-4" /> Pending Verifications
</Link>
```

### 4.2.2 — Show UTR Column in Payments Table

Add a UTR column to the existing payments table:

```tsx
// In the <thead>:
<th>UTR</th>
<th>Status</th>

// In the <tbody> row:
<td>
    {p.utr ? (
        <span className="font-mono text-xs">{p.utr}</span>
    ) : (
        <span className="text-base-content/30">—</span>
    )}
</td>
```

### 4.2.3 — Show Verification Status Badge

Update the status column to show verification status for UPI payments:

```tsx
<td>
    <StatusBadge status={p.status} />
    {p.type === "upi" && p.verificationStatus === "pending" && (
        <span className="badge badge-warning badge-xs ml-1">Awaiting</span>
    )}
    {p.type === "upi" && p.verificationStatus === "rejected" && (
        <span className="badge badge-error badge-xs ml-1">Rejected</span>
    )}
</td>
```

---

## 4.3 — Admin Navigation

Add the "Pending Verifications" link to the admin sidebar/navigation wherever it's defined:

```tsx
<Link href="/admin/payments/pending" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-base-200">
    <Clock className="h-4 w-4" />
    <span>Pending Verifications</span>
    {pendingCount > 0 && (
        <span className="badge badge-warning badge-sm">{pendingCount}</span>
    )}
</Link>
```

Optionally, fetch `pendingCount` from `/api/payments/admin/pending` and display it as a badge.

---

## 4.4 — Telegram Bot Setup

The Telegram bot is configured via env vars (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`). Here's how to set it up:

### 4.4.1 — Create a Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Follow the prompts to name your bot
4. Copy the **Bot Token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 4.4.2 — Get Your Chat ID

1. Open your bot in Telegram and send it a message
2. Visit: `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates`
3. Look for `"chat": {"id": -123456789}` in the response
4. Copy the `id` value (this is your `TELEGRAM_CHAT_ID`)

### 4.4.3 — Set Env Vars

```bash
# Development (wrangler.toml [vars] or .env)
TELEGRAM_BOT_TOKEN="your-bot-token"
TELEGRAM_CHAT_ID="your-chat-id"

# Production (secrets)
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
```

### 4.4.4 — Set Webhook (Production)

For Telegram inline button callbacks to work, you need to set a webhook:

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/api/payments/webhooks/telegram"}'
```

Or visit in browser:
```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://your-domain.com/api/payments/webhooks/telegram
```

---

## Checklist

- [ ] Create `client/app/admin/payments/pending/page.tsx`
- [ ] Add "Pending Verifications" button to admin payments page header
- [ ] Add UTR column to payments table
- [ ] Add verification status badges to status column
- [ ] Add "Pending Verifications" link to admin navigation
- [ ] Create Telegram bot via @BotFather
- [ ] Get Chat ID from bot
- [ ] Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` env vars
- [ ] Set Telegram webhook URL (production)
