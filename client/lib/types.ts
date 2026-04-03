/**
 * Centralized type definitions for the application.
 */

// ==================== Auth ====================

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "tenant";
  isActive: boolean;
  googleId?: string | null;
  createdAt: string;
}

// ==================== Rooms & Beds ====================

export interface BED {
  id: number;
  name: string;
  status: BedStatus;
  monthlyRent: number;
  roomId: number;
  expectedMoveOutDate?: string | null;
}

export type BedStatus = "available" | "occupied" | "reserved";

export interface Room {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  beds: BED[];
}

export interface NewBed {
  name: string;
  monthlyRent: number;
}

export interface BedOption {
  id: number;
  name: string;
  roomName?: string;
  monthlyRent: number;
}

// ==================== Bookings ====================

export interface Booking {
  id: number;
  status: BookingStatus;
  monthlyRent: number;
  moveInDate: string;
  expectedMoveOutDate: string | null;
  nextRentDueDate: string;
}

export type BookingStatus =
  | "pending_deposit"
  | "deposit_paid"
  | "active"
  | "ended";

export interface Deposit {
  id: number;
  amount: number;
  status: DepositStatus;
  paidAt: string | null;
  razorpayOrderId: string | null;
  refundAmount?: number | null;
  deductionAmount?: number | null;
}

export type DepositStatus = "pending" | "paid" | "refunded" | "partially_refunded";

export interface Deduction {
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

export interface DepositBalance {
  originalAmount: number;
  totalDeducted: number;
  remainingBalance: number;
}

export interface BookingData {
  booking: Booking;
  bed: BED;
  deposit: Deposit | null;
  room: Room | null;
  amountDue: number;
  isRentPaid: boolean;
  razorpayKeyId: string;
  settings: SystemSettings;
  pendingUPIVerification?: {
    id: number;
    amount: number;
    rentMonth: string;
    utr: string | null;
  } | null;
}

// ==================== Payments ====================

export interface Payment {
  id: number;
  tenantId: number;
  tenantName?: string;
  roomName?: string;
  bedName?: string;
  amount: number;
  type: PaymentType;
  status: PaymentStatus;
  rentMonth: string;
  lateFee: number;
  paidAt: string | null;
  createdAt: string;
  // UPI verification fields
  utr?: string | null;
  verificationStatus?: "pending" | "verified" | "rejected" | null;
  utrSubmittedAt?: string | null;
  verifiedBy?: number | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
}

export type PaymentType = "rent" | "deposit" | "manual" | "upi";
export type PaymentStatus = "pending" | "completed" | "failed";

export interface PaymentReceipt {
  receiptNumber: string;
  tenant: { name: string; email: string; phone: string };
  room: string;
  bed: string;
  rentMonth?: string;
  depositAmount?: number;
  rentAmount?: number;
  lateFee: number;
  totalAmount: number;
  paymentType: string;
  paidAt: string;
  razorpayPaymentId: string | null;
  razorpayOrderId: string | null;
}

export interface DepositReceipt {
  receiptNumber: string;
  tenant: { name: string; email: string; phone: string };
  room: string;
  bed: string;
  depositAmount: number;
  paymentType: string;
  paidAt: string;
  razorpayPaymentId: string | null;
  razorpayOrderId: string | null;
}

// ==================== Complaints ====================

export interface Complaint {
  id: number;
  subject: string;
  message: string;
  status: ComplaintStatus;
  adminReply: string | null;
  tenantId?: number;
  tenantName?: string;
  tenantEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export type ComplaintStatus = "open" | "in_progress" | "resolved";

// ==================== Tenants ====================

export interface Tenant {
  id: number;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  bookingId?: number | null;
  bookingStatus?: string | null;
  monthlyRent?: number | null;
  moveInDate?: string | null;
  expectedMoveOutDate?: string | null;
  nextRentDueDate?: string | null;
  bedName?: string | null;
  roomName?: string | null;
}

export interface TenantDetail {
  tenant: Tenant;
  booking: Booking | null;
  bed: BED | null;
  deposit: Deposit | null;
  payments: Payment[];
  complaints: Complaint[];
  pendingUPIVerifications: Payment[];
}

export interface TenantOption {
  id: number;
  name: string;
  email: string;
  roomName?: string | null;
  bedName?: string | null;
}

// ==================== Admin ====================

export interface SystemSettings {
  rent_due_start_day: string;
  rent_due_end_day: string;
  late_fee_amount: string;
  deposit_amount?: string;
}

export interface DashboardStats {
  beds: {
    total: number;
    occupied: number;
    reserved: number;
    available: number;
  };
  tenants: {
    total: number;
    activeBookings: number;
  };
}

// ==================== API Responses ====================

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  response?: {
    status?: number;
    data?: {
      error?: string | { issues?: Array<{ message: string }> };
      message?: string;
    };
  };
  message?: string;
}
