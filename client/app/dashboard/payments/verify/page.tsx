"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import toast from "react-hot-toast";
import { Clock, CheckCircle, XCircle } from "lucide-react";

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
                            You don&apos;t have any pending rent payments.
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
                            We&apos;ll update you once confirmed.
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
                        <p className="text-sm text-base-content/60 mt-2">
                            You can initiate a new payment from the dashboard.
                        </p>
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
                                className={`input input-bordered w-full font-mono ${normalizedUtr.length === 12 ? "input-success" : ""
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
