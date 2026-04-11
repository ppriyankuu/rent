"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DashboardSkeleton } from "@/components/Skeleton";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { getErrorMessage } from "@/lib/errors";
import { useBooking } from "@/hooks/useBooking";
import { UPICheckoutModal } from "@/components/upi/UPICheckoutModal";
import { AccountStatusAlert } from "./page-comps/AccountStatusAlert";
import { DashboardStats } from "./page-comps/DashboardStats";
import { BookingDetailsCard } from "./page-comps/BookingDetailsCard";
import { DepositDeductionsCard } from "./page-comps/DepositDeductionsCard";
import { RentPaymentSection } from "./page-comps/RentPaymentSection";
import { MoveInDateModal } from "./page-comps/MoveInDateModal";
import { MoveOutDateModal } from "./page-comps/MoveOutDateModal";
import { DepositReceiptModal } from "./page-comps/DepositReceiptModal";
import { NoBookingState } from "./page-comps/NoBookingState";
import type { DepositReceipt } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const {
    bookingData,
    deductions,
    depositBalance,
    loading,
    noBooking,
    refreshBooking,
    viewDepositReceipt,
    updateMoveInDate,
    updateMoveOutDate,
    cancelBooking,
  } = useBooking();

  // Modal states
  const [moveInDateModalOpen, setMoveInDateModalOpen] = useState(false);
  const [moveOutDateModalOpen, setMoveOutDateModalOpen] = useState(false);
  const [newMoveInDate, setNewMoveInDate] = useState("");
  const [newMoveOutDate, setNewMoveOutDate] = useState("");
  const [updatingDate, setUpdatingDate] = useState(false);
  const [depositReceipt, setDepositReceipt] = useState<DepositReceipt | null>(null);
  const [depositReceiptOpen, setDepositReceiptOpen] = useState(false);

  // Payment states
  const [payingRent, setPayingRent] = useState(false);
  const [retryingDeposit, setRetryingDeposit] = useState(false);

  // UPI payment states
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [upiPaymentData, setUpiPaymentData] = useState<{
    paymentId: number;
    upiLink: string;
    amount: number;
    lateFee: number;
    rentMonth: string;
  } | null>(null);

  const handleUpdateMoveInDate = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!newMoveInDate) return;
    setUpdatingDate(true);
    const success = await updateMoveInDate(newMoveInDate);
    if (success) {
      setMoveInDateModalOpen(false);
    }
    setUpdatingDate(false);
  };

  const handleUpdateMoveOutDate = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!newMoveOutDate) return;
    setUpdatingDate(true);
    const success = await updateMoveOutDate(newMoveOutDate);
    if (success) {
      setMoveOutDateModalOpen(false);
    }
    setUpdatingDate(false);
  };

  const handlePayRent = async () => {
    if (!bookingData) return;

    const now = new Date();
    const rentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    setPayingRent(true);

    try {
      const paymentData = await api.post("/api/payments/initiate", { rentMonth }).then(res => res.data.data);
      if (!paymentData) return;

      // Store payment data and open UPI checkout modal
      setUpiPaymentData({
        paymentId: paymentData.paymentId,
        upiLink: paymentData.upiLink,
        amount: paymentData.amount,
        lateFee: paymentData.lateFee || 0,
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

  const handleRetryDeposit = async () => {
    if (!bookingData?.deposit) return;
    setRetryingDeposit(true);
    try {
      const bookingRes = await api.get("/api/bookings/my");
      const currentBedStatus = bookingRes.data.data?.bed?.status;

      if (currentBedStatus !== "available") {
        toast.error("This bed is no longer available. Your booking has been cancelled.");
        return;
      }

      const result = await openRazorpayCheckout({
        razorpayKeyId: bookingData.razorpayKeyId,
        orderId: bookingData.deposit.razorpayOrderId || "",
        amount: bookingData.deposit.amount * 100,
        description: "Security Deposit",
        prefill: {
          name: user?.name,
          email: user?.email,
        },
      });

      await api.post("/api/bookings/deposit/verify", result);
      await refreshBooking();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Payment failed");
      if (msg !== "Payment cancelled by user") {
        toast.error(msg);
      }
    } finally {
      setRetryingDeposit(false);
    }
  };

  const handleViewDepositReceipt = async () => {
    const receipt = await viewDepositReceipt();
    if (receipt) {
      setDepositReceipt(receipt);
      setDepositReceiptOpen(true);
    }
  };

  if (loading) return <DashboardSkeleton />;

  if (noBooking) {
    return <NoBookingState />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <AccountStatusAlert isActive={user?.isActive !== false} />

      <DashboardStats
        bookingData={bookingData!}
        onEditMoveInDate={() => {
          setNewMoveInDate(bookingData!.booking.moveInDate);
          setMoveInDateModalOpen(true);
        }}
        onEditMoveOutDate={() => {
          setNewMoveOutDate(bookingData!.booking.expectedMoveOutDate || new Date().toISOString().split("T")[0]);
          setMoveOutDateModalOpen(true);
        }}
        onViewDepositReceipt={handleViewDepositReceipt}
      />

      <BookingDetailsCard bookingData={bookingData!} />

      {deductions.length > 0 && depositBalance && (
        <DepositDeductionsCard deductions={deductions} depositBalance={depositBalance} />
      )}

      <RentPaymentSection
        bookingData={bookingData!}
        isActive={user?.isActive !== false}
        onPayRent={handlePayRent}
        onRetryDeposit={handleRetryDeposit}
        onCancelBooking={cancelBooking}
        payingRent={payingRent}
        retryingDeposit={retryingDeposit}
      />

      <MoveInDateModal
        open={moveInDateModalOpen}
        onClose={() => setMoveInDateModalOpen(false)}
        moveInDate={newMoveInDate}
        setMoveInDate={setNewMoveInDate}
        onSubmit={handleUpdateMoveInDate}
        isSubmitting={updatingDate}
      />

      <MoveOutDateModal
        open={moveOutDateModalOpen}
        onClose={() => setMoveOutDateModalOpen(false)}
        moveOutDate={newMoveOutDate}
        setMoveOutDate={setNewMoveOutDate}
        onSubmit={handleUpdateMoveOutDate}
        isSubmitting={updatingDate}
      />

      <DepositReceiptModal
        open={depositReceiptOpen}
        onClose={() => setDepositReceiptOpen(false)}
        receipt={depositReceipt}
      />

      <UPICheckoutModal
        open={upiModalOpen}
        onClose={() => setUpiModalOpen(false)}
        onProceed={handleUPIProceed}
        amount={upiPaymentData?.amount || 0}
        lateFee={upiPaymentData?.lateFee || 0}
        rentMonth={upiPaymentData?.rentMonth || ""}
        upiId={process.env.NEXT_PUBLIC_UPI_ID ?? "workwithpriyanku@oksbi"}
        payeeName={process.env.NEXT_PUBLIC_UPI_PAYEE_NAME ?? "Priyanku Gogoi"}
        paymentId={upiPaymentData?.paymentId || 0}
      />
    </div>
  );
}

// Import these at the bottom to avoid circular dependencies
import api from "@/lib/api";
import toast from "react-hot-toast";
