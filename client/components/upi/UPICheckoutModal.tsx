"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { generateUPILink, supportsUPIIntent, openUPIApp } from "@/lib/upi";
import QRCode from "qrcode";
import { Copy, Smartphone, QrCode, AlertTriangle, Info } from "lucide-react";

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
    const baseRent = amount - lateFee;

    useEffect(() => {
        if (open) {
            QRCode.toDataURL(upiLink, { width: 220, margin: 2 })
                .then(setQrDataUrl)
                .catch(() => { });
        }
    }, [open, upiLink]);

    const handleCopyUPI = () => {
        navigator.clipboard.writeText(upiId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleProceed = () => {
        onClose();
        onProceed();
    };

    const QRBlock = () => (
        <div className="bg-base-200/50 p-4 rounded-2xl border border-base-content/5 flex flex-col items-center shadow-inner">
            <div className="bg-white p-2.5 rounded-xl shadow-md">
                {qrDataUrl ? (
                    <img src={qrDataUrl} alt="UPI QR Code" className="w-36 h-36 sm:w-40 sm:h-40" />
                ) : (
                    <div className="w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center bg-base-100">
                        <QrCode className="h-10 w-10 opacity-20" />
                    </div>
                )}
            </div>
            <p className="text-[10px] font-bold text-base-content/40 mt-3 uppercase tracking-widest">Scan QR</p>
        </div>
    );

    const UPIIdBlock = () => (
        <div className="bg-base-200 rounded-xl p-3">
            <p className="text-xs text-base-content/50 mb-0.5">UPI ID</p>
            <div className="flex items-center justify-between gap-2">
                <p className="font-mono font-medium text-sm truncate">{upiId}</p>
                <button onClick={handleCopyUPI} className="btn btn-ghost btn-xs shrink-0">
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? "Copied!" : "Copy"}
                </button>
            </div>
        </div>
    );

    const UTRNotice = () => (
        <div className="flex items-start gap-2.5 text-xs bg-base-200 rounded-lg px-3 py-2.5 text-base-content/70">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-base-content/50" />
            <span>
                Enter the <strong className="text-base-content">Transaction ID (UTR)</strong> once done — that’s how we confirm it’s you.
                {!isMobile && " Easier to copy from your UPI app on your phone."}
            </span>
        </div>
    );

    return (
        <Modal open={open} onClose={onClose} title={`Pay Rent — ${rentMonth}`}>
            <div className="space-y-4">

                {lateFee > 0 ? (
                    <>
                        <div className="flex items-center justify-between gap-3 flex-wrap bg-base-200/70 rounded-2xl px-5 py-4 border border-base-content/5">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase tracking-wider opacity-50">Total Amount</span>
                                <span className="text-3xl font-black">₹{amount.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col items-end text-right">
                                <span className="text-xs text-base-content/60">₹{baseRent.toLocaleString()} rent</span>
                                <span className="text-error font-bold flex items-center gap-1.5 text-sm">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    + ₹{lateFee.toLocaleString()} late fee
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-5">
                            <QRBlock />

                            <div className="flex flex-col justify-center gap-3 flex-1 min-w-0">
                                <div className="flex items-start gap-2 text-[11px] leading-tight bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-900 shadow-sm">
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                                    <span>
                                        Looks like we're a bit late — ₹{lateFee} fee added.
                                    </span>
                                </div>

                                <div className="px-1">
                                    <p className="text-xs text-base-content/50 mb-0.5">Paying to</p>
                                    <p className="text-lg font-bold truncate">{payeeName}</p>
                                </div>

                                <UPIIdBlock />

                                {isMobile && (
                                    <button onClick={() => openUPIApp(upiLink)} className="btn btn-primary btn-sm w-full gap-2 shadow-md">
                                        <Smartphone className="h-4 w-4" /> Open UPI App
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="text-center py-2">
                            <p className="text-4xl font-black tracking-tight text-base-content">
                                ₹{amount.toLocaleString()}
                            </p>
                            <p className="text-sm text-base-content/60 mt-1">
                                Paying to <span className="font-medium text-base-content">{payeeName}</span>
                            </p>
                        </div>

                        <div className="flex justify-center">
                            <QRBlock />
                        </div>

                        <div className="space-y-3">
                            <UPIIdBlock />

                            {isMobile && (
                                <button
                                    onClick={() => openUPIApp(upiLink)}
                                    className="btn btn-primary w-full gap-2 shadow-md"
                                >
                                    <Smartphone className="h-4 w-4" />
                                    Pay via UPI App
                                </button>
                            )}
                        </div>
                    </>
                )}

                <UTRNotice />

                <button onClick={handleProceed} className="btn btn-primary w-full">
                    I&apos;ve Made the Payment →
                </button>
            </div>
        </Modal>
    );
}
