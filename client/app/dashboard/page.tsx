"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { StatCard } from "@/components/StatCard";
import { openRazorpayCheckout } from "@/lib/razorpay";
import toast from "react-hot-toast";
import Link from "next/link";
import { Modal } from "@/components/Modal";
import {
  Bed,
  CalendarDays,
  IndianRupee,
  CreditCard,
  MapPin,
  Shield,
  Edit2,
  CheckCircle2,
  DollarSign,
  LogOut,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/Skeleton";
import { formatStatus } from "@/lib/formatStatus";

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

interface BookingData {
  booking: {
    id: number;
    status: string;
    monthlyRent: number;
    moveInDate: string;
    expectedMoveOutDate: string | null;
    nextRentDueDate: string;
  };
  bed: {
    id: number;
    name: string;
    roomId: number;
    status: string;
    monthlyRent: number;
  };
  deposit: {
    id: number;
    amount: number;
    status: string;
    paidAt: string | null;
    razorpayOrderId: string | null;
  } | null;
  room: {
    id: number;
    name: string;
  } | null;
  amountDue: number;
  isRentPaid: boolean;
  razorpayKeyId: string;
  settings: {
    rent_due_start_day: string;
    rent_due_end_day: string;
    late_fee_amount: string;
  };
}

interface Deduction {
  id: number;
  depositId: number;
  tenantId: number;
  bookingId: number;
  amount: number;
  reason: string;
  deductedBy: number;
  createdAt: string;
  adminName: string;
  adminEmail: string;
}

interface DepositBalance {
  originalAmount: number;
  totalDeducted: number;
  remainingBalance: number;
}

export default function DashboardPage() {
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noBooking, setNoBooking] = useState(false);
  const [payingRent, setPayingRent] = useState(false);
  const [moveInDateModalOpen, setMoveInDateModalOpen] = useState(false);
  const [moveOutDateModalOpen, setMoveOutDateModalOpen] = useState(false);
  const [newMoveInDate, setNewMoveInDate] = useState("");
  const [newMoveOutDate, setNewMoveOutDate] = useState("");
  const [updatingDate, setUpdatingDate] = useState(false);
  const [retryingDeposit, setRetryingDeposit] = useState(false);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [depositBalance, setDepositBalance] = useState<DepositBalance | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      fetchBooking(),
      fetchDeductions(),
      fetchDepositBalance(),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBooking = async () => {
    try {
      const res = await api.get("/api/bookings/my");
      setBookingData(res.data.data);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 404) {
        setNoBooking(true);
      } else {
        toast.error("Failed to load booking data");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDeductions = async () => {
    try {
      const res = await api.get("/api/bookings/my/deductions");
      setDeductions(res.data.data || []);
    } catch {
      // Ignore errors - deductions are optional
    }
  };

  const fetchDepositBalance = async () => {
    try {
      const res = await api.get("/api/bookings/my/deposit-balance");
      setDepositBalance(res.data.data);
    } catch {
      // Ignore errors - balance is optional
    }
  };

  const handleUpdateMoveInDate = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!newMoveInDate) return;
    setUpdatingDate(true);
    try {
      await api.put("/api/bookings/my/move-in-date", { moveInDate: newMoveInDate });
      toast.success("Move-in date updated successfully!");
      setMoveInDateModalOpen(false);
      fetchBooking();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to update move-in date"));
    } finally {
      setUpdatingDate(false);
    }
  };

  const handleUpdateMoveOutDate = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!newMoveOutDate) return;
    setUpdatingDate(true);
    try {
      await api.put("/api/bookings/my/expected-move-out-date", { expectedMoveOutDate: newMoveOutDate });
      toast.success("Expected move-out date updated successfully!");
      setMoveOutDateModalOpen(false);
      fetchBooking();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to update move-out date"));
    } finally {
      setUpdatingDate(false);
    }
  };

  const handlePayRent = async () => {
    if (!bookingData) return;

    const now = new Date();
    const rentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    setPayingRent(true);

    try {
      // Initiate payment
      const res = await api.post("/api/payments/initiate", { rentMonth });
      const { razorpayOrderId, razorpayKeyId, amount } = res.data.data;

      // Open Razorpay
      const result = await openRazorpayCheckout({
        razorpayKeyId,
        orderId: razorpayOrderId,
        amount: amount * 100,
        description: `Rent for ${rentMonth}`,
        prefill: {
          name: user?.name,
          email: user?.email,
        },
      });

      // Verify payment
      await api.post("/api/payments/verify", { ...result, rentMonth });
      toast.success("Rent paid successfully!");
      fetchBooking(); // Refresh booking data
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Payment failed");
      if (msg !== "Payment cancelled by user") {
        toast.error(msg);
      }
    } finally {
      setPayingRent(false);
    }
  };

  const handleRetryDeposit = async () => {
    if (!bookingData?.deposit) return;
    setRetryingDeposit(true);
    try {
      // Re-check bed availability before allowing payment retry
      // The bed might have been taken by another user while this user was retrying
      const bookingRes = await api.get("/api/bookings/my");
      const currentBedStatus = bookingRes.data.data?.bed?.status;

      if (currentBedStatus !== "available") {
        toast.error("This bed is no longer available. Your booking has been cancelled.");
        setNoBooking(true);
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
      toast.success("Deposit paid successfully!");
      fetchBooking();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Payment failed");
      if (msg !== "Payment cancelled by user") {
        toast.error(msg);
      }
    } finally {
      setRetryingDeposit(false);
    }
  };

  const handleCancelBooking = async () => {
    try {
      await api.post("/api/bookings/my/cancel");
      toast.success("Booking cancelled. You can now book a different bed.");
      setNoBooking(true);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to cancel booking"));
    }
  };

  if (loading) return <DashboardSkeleton />;

  if (noBooking) {
    return (
      <div className="text-center py-16">
        <Bed className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Active Booking</h2>
        <p className="text-base-content/60 mb-6">
          You don&apos;t have an active booking yet. Browse available rooms to get
          started.
        </p>
        <Link href="/" className="btn btn-primary">
          Browse Rooms
        </Link>
      </div>
    );
  }

  const { booking, bed, room, deposit, settings } = bookingData!;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {user?.isActive === false && (
        <div className="alert alert-error mb-6 shadow-sm rounded-lg">
          <Shield className="h-5 w-5" />
          <span>Your account has been deactivated. Please contact the administrator.</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
        <StatCard
          label="Monthly Rent"
          value={`₹${booking.monthlyRent.toLocaleString()}`}
          icon={IndianRupee}
        />
        <StatCard
          label="Move-in Date"
          value={
            <div className="flex items-center gap-2">
              <span>{new Date(booking.moveInDate).toLocaleDateString("en-IN")}</span>
              {bed.status !== "occupied" && (
                <button
                  className="btn btn-ghost btn-xs btn-square"
                  onClick={() => {
                    setNewMoveInDate(booking.moveInDate);
                    setMoveInDateModalOpen(true);
                  }}
                  title="Edit Move-In Date"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              )}
            </div>
          }
          icon={CalendarDays}
        />
        <StatCard
          label="Expected Move-Out Date"
          value={
            <div className="flex items-center gap-2">
              <span>
                {booking.expectedMoveOutDate
                  ? new Date(booking.expectedMoveOutDate).toLocaleDateString("en-IN")
                  : "Not set"}
              </span>
              {bed.status === "occupied" && (
                <button
                  className="btn btn-ghost btn-xs btn-square"
                  onClick={() => {
                    setNewMoveOutDate(booking.expectedMoveOutDate || new Date().toISOString().split("T")[0]);
                    setMoveOutDateModalOpen(true);
                  }}
                  title="Edit Expected Move-Out Date"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              )}
            </div>
          }
          icon={LogOut}
          description={
            !booking.expectedMoveOutDate
              ? "Please set your move-out date"
              : new Date(booking.expectedMoveOutDate) < new Date()
                ? "Past due!"
                : new Date(booking.expectedMoveOutDate).toDateString() === new Date().toDateString()
                  ? "Today!"
                  : ""
          }
          className={
            !booking.expectedMoveOutDate
              ? "border-warning border-2"
              : new Date(booking.expectedMoveOutDate) <= new Date()
                ? "border-error border-2"
                : ""
          }
        />
        <StatCard
          label="Deposit"
          value={deposit ? `₹${deposit.amount.toLocaleString()}` : "N/A"}
          icon={Shield}
          description={deposit?.status ? formatStatus(deposit.status) : ""}
        />
      </div>

      {/* Booking Details Card */}
      <div className="card bg-base-100 shadow-md border border-base-200 mb-6 hover:shadow-lg transition-shadow">
        <div className="card-body">
          <h2 className="card-title text-lg">Booking Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-sm text-base-content/60">Status</p>
              <span
                className={`badge ${booking.status === "active"
                  ? "badge-success"
                  : "badge-warning"
                  }`}
              >
                {formatStatus(booking.status)}
              </span>
            </div>
            <div>
              <p className="text-sm text-base-content/60">Next Rent Due</p>
              <p className="font-medium">
                {new Date(booking.nextRentDueDate).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-base-content/60">Room & Bed</p>
              <p className="font-medium flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {room ? `${room.name} - ` : ""}{bed.name}
              </p>
            </div>
            <div>
              <p className="text-sm text-base-content/60">Monthly Rent</p>
              <p className="font-medium">₹{booking.monthlyRent.toLocaleString()}</p>
            </div>
          </div>

          <div className="divider my-4"></div>

          <div className="bg-base-200/50 p-4 rounded-lg space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-base-content/80">
              <CalendarDays className="h-4 w-4" /> Payment Window & Late Fee
            </h3>
            <p className="text-sm text-base-content/70">
              Rent can be paid between the <strong>{settings.rent_due_start_day}{getOrdinalSuffix(Number(settings.rent_due_start_day))}</strong> and <strong>{settings.rent_due_end_day}{getOrdinalSuffix(Number(settings.rent_due_end_day))}</strong> of every month.
            </p>
            <p className="text-sm text-error/80">
              A late fee of <strong>₹{settings.late_fee_amount}</strong> will be applied if payment is made after the {settings.rent_due_end_day}{getOrdinalSuffix(Number(settings.rent_due_end_day))}.
            </p>
          </div>
        </div>
      </div>

      {/* Deposit Deductions */}
      {deductions.length > 0 && depositBalance && (
        <div className="card bg-base-100 shadow-md border border-base-200 mb-6 hover:shadow-lg transition-shadow">
          <div className="card-body">
            <h2 className="card-title text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> Deposit Deductions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
              <div>
                <p className="text-sm text-base-content/60">Original Deposit</p>
                <p className="font-medium">₹{depositBalance.originalAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-base-content/60">Total Deducted</p>
                <p className="font-medium text-error">₹{depositBalance.totalDeducted.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-base-content/60">Remaining Balance</p>
                <p className="font-medium text-success">₹{depositBalance.remainingBalance.toLocaleString()}</p>
              </div>
            </div>

            <div className="divider my-4"></div>

            <h3 className="text-sm font-semibold text-base-content/80 mb-2">Deduction History</h3>
            <div className="overflow-x-auto">
              <div className="max-h-55 overflow-y-auto pr-2">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deductions.map((d) => (
                      <tr key={d.id}>
                        <td className="text-xs">
                          {new Date(d.createdAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="font-medium text-error">₹{d.amount.toLocaleString()}</td>
                        <td className="text-sm">{d.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rent Paid Confirmation */}
      {bookingData!.isRentPaid && (booking.status === "active" || booking.status === "deposit_paid") && (
        <div className="card bg-success/10 border border-success/20 mb-6">
          <div className="card-body flex flex-row items-center gap-4 py-4">
            <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
            <div>
              <h3 className="font-bold text-success">Rent Paid for this Month</h3>
              <p className="text-sm text-base-content/60">
                Your rent payment has been received. View your receipt in the{" "}
                <Link href="/dashboard/payments" className="link link-primary">payment history</Link>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pay Rent Button */}
      {user?.isActive !== false && (booking.status === "active" || booking.status === "deposit_paid") && !bookingData!.isRentPaid && (
        <div className="card bg-primary/5 border border-primary/20">
          <div className="card-body flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Pay Monthly Rent
              </h3>
              <p className="text-sm text-base-content/60">
                Pay your rent for the current month online via Razorpay
              </p>
            </div>
            <button
              onClick={handlePayRent}
              className={`btn btn-primary w-full sm:w-auto ${payingRent ? "btn-disabled" : ""}`}
              disabled={payingRent}
            >
              {payingRent ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>Pay ₹{bookingData!.amountDue.toLocaleString()}</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Retry Deposit Button */}
      {user?.isActive !== false && booking.status === "pending_deposit" && deposit && !deposit.paidAt && (
        <div className="card bg-warning/10 border border-warning/30 mb-6">
          <div className="card-body flex flex-col items-start gap-4">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2 text-warning-content">
                <Shield className="h-5 w-5" /> Pending Deposit
              </h3>
              <p className="text-sm text-base-content/80">
                Complete your deposit payment to secure your booking. The bed will be reserved once payment is confirmed.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={handleRetryDeposit}
                className={`btn btn-warning w-full ${retryingDeposit ? "btn-disabled" : ""}`}
                disabled={retryingDeposit}
              >
                {retryingDeposit ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <>Pay Deposit ₹{deposit.amount.toLocaleString()}</>
                )}
              </button>
              <button
                onClick={handleCancelBooking}
                className="btn btn-ghost btn-sm text-error w-full"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Move In Date Modal */}
      <Modal open={moveInDateModalOpen} onClose={() => setMoveInDateModalOpen(false)} title="Update Move-In Date">
        <form onSubmit={handleUpdateMoveInDate} className="space-y-4">
          <div className="p-3 bg-base-200 rounded text-sm text-base-content/70">
            You can change your move-in date before you pay the first month's rent.
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">New Move-In Date</span></label>
            <input
              type="date"
              className="input input-bordered w-full"
              value={newMoveInDate}
              onChange={(e) => setNewMoveInDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              required
            />
          </div>
          <button type="submit" className={`btn btn-primary w-full ${updatingDate ? "btn-disabled" : ""}`} disabled={updatingDate}>
            {updatingDate ? <span className="loading loading-spinner loading-sm"></span> : "Update Date"}
          </button>
        </form>
      </Modal>

      {/* Edit Expected Move-Out Date Modal */}
      <Modal open={moveOutDateModalOpen} onClose={() => setMoveOutDateModalOpen(false)} title="Update Expected Move-Out Date">
        <form onSubmit={handleUpdateMoveOutDate} className="space-y-4">
          <div className="p-3 bg-base-200 rounded text-sm text-base-content/70">
            This helps others know when your bed might become available. You can update this date anytime.
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Expected Move-Out Date</span></label>
            <input
              type="date"
              className="input input-bordered w-full"
              value={newMoveOutDate}
              onChange={(e) => setNewMoveOutDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              required
            />
          </div>
          <button type="submit" className={`btn btn-primary w-full ${updatingDate ? "btn-disabled" : ""}`} disabled={updatingDate}>
            {updatingDate ? <span className="loading loading-spinner loading-sm"></span> : "Update Date"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
