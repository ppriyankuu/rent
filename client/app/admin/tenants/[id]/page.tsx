"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTenants } from "@/hooks/useTenants";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { TenantProfileCard } from "./page-comps/TenantProfileCard";
import { BookingInfoCard } from "./page-comps/BookingInfoCard";
import { DepositInfoCard } from "./page-comps/DepositInfoCard";
import { PaymentHistoryCard } from "./page-comps/PaymentHistoryCard";
import { ComplaintsCard } from "./page-comps/ComplaintsCard";
import { UpdateRentModal } from "./page-comps/UpdateRentModal";
import { EndBookingModal } from "./page-comps/EndBookingModal";
import { ChargeDeductionModal } from "./page-comps/ChargeDeductionModal";

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const {
    tenantDetail,
    detailLoading,
    deductions,
    depositBalance,
    refreshTenantDetail,
    updateRent,
    chargeDeduction,
    deleteDeduction,
    endBooking,
  } = useTenants();

  // Update rent modal state
  const [rentModalOpen, setRentModalOpen] = useState(false);
  const [newRent, setNewRent] = useState("");
  const [applyToAll, setApplyToAll] = useState(false);
  const [updatingRent, setUpdatingRent] = useState(false);

  // End booking modal state
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [endForm, setEndForm] = useState({
    moveOutDate: new Date().toISOString().slice(0, 10),
    refundAmount: "0",
    deductionAmount: "0",
    deductionReason: "",
  });
  const [endingBooking, setEndingBooking] = useState(false);

  // Deduction modal state
  const [deductionModalOpen, setDeductionModalOpen] = useState(false);
  const [deductionForm, setDeductionForm] = useState({ amount: "", reason: "" });
  const [chargingDeduction, setChargingDeduction] = useState(false);

  // Delete deduction confirmation
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    deductionId: number | null;
  }>({ isOpen: false, deductionId: null });

  useEffect(() => {
    refreshTenantDetail(tenantId);
  }, [tenantId, refreshTenantDetail]);

  useEffect(() => {
    if (tenantDetail?.booking) {
      setNewRent(tenantDetail.booking.monthlyRent.toString());
    }
    if (tenantDetail?.deposit) {
      const remainingBalance = depositBalance?.remainingBalance || tenantDetail.deposit.amount;
      setEndForm((f) => ({
        ...f,
        refundAmount: remainingBalance.toString(),
      }));
    }
    if (depositBalance) {
      setEndForm((f) => ({
        ...f,
        refundAmount: depositBalance.remainingBalance.toString(),
      }));
    }
  }, [tenantDetail, depositBalance]);

  const handleUpdateRent = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setUpdatingRent(true);
    const success = await updateRent(tenantId, Number(newRent), applyToAll);
    if (success) {
      setRentModalOpen(false);
    }
    setUpdatingRent(false);
  };

  const handleChargeDeduction = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!deductionForm.amount || !deductionForm.reason) return;

    setChargingDeduction(true);
    const success = await chargeDeduction(
      tenantId,
      Number(deductionForm.amount),
      deductionForm.reason
    );
    if (success) {
      setDeductionModalOpen(false);
      setDeductionForm({ amount: "", reason: "" });
    }
    setChargingDeduction(false);
  };

  const handleDeleteDeduction = async () => {
    if (!deleteConfirmModal.deductionId) return;

    const success = await deleteDeduction(deleteConfirmModal.deductionId);
    if (success) {
      setDeleteConfirmModal({ isOpen: false, deductionId: null });
    }
  };

  const handleEndBooking = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!tenantDetail?.booking) return;

    setEndingBooking(true);
    const finalDeduction = Number(endForm.deductionAmount);

    try {
      // If there's a final deduction, charge it first
      if (finalDeduction > 0 && endForm.deductionReason.trim()) {
        await chargeDeduction(tenantId, finalDeduction, endForm.deductionReason.trim());
      }

      const success = await endBooking(tenantDetail.booking.id, {
        moveOutDate: endForm.moveOutDate,
        refundAmount: Number(endForm.refundAmount),
      });

      if (success) {
        setEndModalOpen(false);
      }
    } catch {
      // Error already handled in hook
    } finally {
      setEndingBooking(false);
    }
  };

  if (detailLoading) return <LoadingSpinner text="Loading tenant..." />;
  if (!tenantDetail) return <p>Tenant not found</p>;

  const { tenant, booking, bed, deposit, payments, complaints } = tenantDetail;

  return (
    <div>
      <button
        className="btn btn-ghost btn-sm mb-4"
        onClick={() => router.push("/admin/tenants")}
      >
        <ArrowLeft className="h-4 w-4" /> Back to Tenants
      </button>

      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        {tenant.name}
      </h1>

      <TenantProfileCard tenant={tenant} />

      {booking ? (
        <BookingInfoCard
          booking={booking}
          bed={bed}
          onUpdateRent={() => setRentModalOpen(true)}
          onEndBooking={() => setEndModalOpen(true)}
          canEndBooking={booking.status === "active"}
        />
      ) : (
        <div className="alert mb-6">
          <span>No active booking for this tenant.</span>
        </div>
      )}

      {deposit && (
        <DepositInfoCard
          deposit={deposit}
          depositBalance={depositBalance}
          deductions={deductions}
          canChargeDeduction={!!booking && booking.status !== "ended" && !!depositBalance && depositBalance.remainingBalance > 0}
          onChargeDeduction={() => setDeductionModalOpen(true)}
          onDeleteDeduction={(id) => setDeleteConfirmModal({ isOpen: true, deductionId: id })}
        />
      )}

      <PaymentHistoryCard payments={payments} />

      <ComplaintsCard complaints={complaints} />

      {/* Modals */}
      <UpdateRentModal
        open={rentModalOpen}
        onClose={() => setRentModalOpen(false)}
        currentRent={newRent}
        setRent={setNewRent}
        applyToAll={applyToAll}
        setApplyToAll={setApplyToAll}
        onSubmit={handleUpdateRent}
        isSubmitting={updatingRent}
      />

      <EndBookingModal
        open={endModalOpen}
        onClose={() => setEndModalOpen(false)}
        deposit={deposit}
        depositBalance={depositBalance}
        moveOutDate={endForm.moveOutDate}
        setMoveOutDate={(date) => setEndForm((f) => ({ ...f, moveOutDate: date }))}
        deductionAmount={endForm.deductionAmount}
        setDeductionAmount={(amount) => {
          const deduction = Number(amount) || 0;
          const remainingBalance = depositBalance?.remainingBalance || deposit?.amount || 0;
          setEndForm((f) => ({
            ...f,
            deductionAmount: amount,
            refundAmount: Math.max(0, remainingBalance - deduction).toString(),
          }));
        }}
        refundAmount={endForm.refundAmount}
        deductionReason={endForm.deductionReason}
        setDeductionReason={(reason) => setEndForm((f) => ({ ...f, deductionReason: reason }))}
        onSubmit={handleEndBooking}
        isSubmitting={endingBooking}
      />

      <ChargeDeductionModal
        open={deductionModalOpen}
        onClose={() => setDeductionModalOpen(false)}
        amount={deductionForm.amount}
        setAmount={(amount) => setDeductionForm((f) => ({ ...f, amount }))}
        reason={deductionForm.reason}
        setReason={(reason) => setDeductionForm((f) => ({ ...f, reason }))}
        onSubmit={handleChargeDeduction}
        isSubmitting={chargingDeduction}
      />

      <ConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, deductionId: null })}
        onConfirm={handleDeleteDeduction}
        title="Reverse Deduction"
        message="Are you sure you want to reverse this deduction? This action cannot be undone."
        confirmText="Yes, Reverse"
        variant="danger"
      />
    </div>
  );
}
