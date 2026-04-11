"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { generateUPILink, supportsUPIIntent, openUPIApp } from "@/lib/upi";
import QRCode from "qrcode";
import { Copy, Smartphone, QrCode } from "lucide-react";
import toast from "react-hot-toast";

interface UPICheckoutModalProps {
    open: boolean;
    onClose: () => void;
    onProceed: () => void;
    amount: number;
    lateFee: number;
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
    lateFee,
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

    useEffect(() => {
        if (open) {
            QRCode.toDataURL(upiLink, { width: 256, margin: 2 })
                .then(setQrDataUrl)
                .catch(() => { });
        }
    }, [open, upiLink]);

    const handleCopyUPI = () => {
        navigator.clipboard.writeText(upiId);
        setCopied(true);
        toast.success("UPI ID copied!");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleProceed = () => {
        onClose();
        onProceed();
    };

    return (
        <Modal open={open} onClose={onClose} title={`Pay Rent — ${rentMonth}`}>
            <div className="space-y-6">
                {/* Amount Breakdown */}
                <div className="text-center">
                    <p className="text-sm text-base-content/60">Amount to Pay</p>
                    {lateFee > 0 ? (
                        <div className="mt-2 space-y-1">
                            <p className="text-lg">
                                <span className="text-base-content/70">Rent:</span>{" "}
                                <span className="font-medium">₹{(amount - lateFee).toLocaleString()}</span>
                            </p>
                            <p className="text-lg text-error">
                                <span>Late Fee:</span>{" "}
                                <span className="font-medium">₹{lateFee.toLocaleString()}</span>
                            </p>
                            <div className="border-t border-base-content/10 pt-2 mt-2">
                                <p className="text-3xl font-bold">₹{amount.toLocaleString()}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-3xl font-bold">₹{amount.toLocaleString()}</p>
                    )}
                </div>

                {/* Late Fee Warning */}
                {lateFee > 0 && (
                    <div className="alert alert-warning text-sm">
                        <div>
                            <p className="font-medium">⏰ Late Payment Fee Applied</p>
                            <p className="mt-1">
                                This payment includes a late fee of <span className="font-semibold">₹{lateFee}</span> because the rent was paid after the due date.
                                Please try to pay on time in the future to avoid additional charges.
                            </p>
                        </div>
                    </div>
                )}

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
                        onClick={() => openUPIApp(upiLink)}
                        className="btn btn-primary w-full"
                    >
                        <Smartphone className="h-4 w-4" />
                        Open UPI App
                    </button>
                )}

                {/* Important message */}
                <div className="alert alert-info text-sm">
                    <div>
                        <p className="font-medium">After payment, you&apos;ll need to enter the Transaction ID (UTR)</p>
                        {!isMobile && (
                            <p className="mt-1">
                                💡 We recommend completing the verification on your phone — it&apos;s easier to copy the
                                Transaction ID from your UPI app or bank SMS.
                            </p>
                        )}
                    </div>
                </div>

                {/* Proceed button */}
                <button onClick={handleProceed} className="btn btn-primary w-full">
                    I&apos;ve Made the Payment →
                </button>
            </div>
        </Modal>
    );
}
