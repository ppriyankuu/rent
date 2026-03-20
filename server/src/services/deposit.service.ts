import { eq, and, desc, sum, sql } from "drizzle-orm";
import type { DrizzleDb } from "../db/client";
import { depositDeductions, deposits, bookings, users } from "../db/schema";
import { nowISO } from "../utils";
import type { DepositDeduction, NewDepositDeduction } from "../db/schema";

// ─── Types ────────────────────────────────────────────────────

export interface DepositBalance {
    originalAmount: number;
    totalDeducted: number;
    remainingBalance: number;
}

export interface DeductionWithDetails extends DepositDeduction {
    adminName: string | null;
    adminEmail: string | null;
}

// ─── Service Functions ────────────────────────────────────────

/**
 * Calculate the current deposit balance for a tenant.
 * Returns original amount, total deducted, and remaining balance.
 */
export async function getDepositBalance(
    db: DrizzleDb,
    tenantId: number
): Promise<DepositBalance | null> {
    // Get the active deposit for this tenant
    const activeBooking = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(
            and(
                eq(bookings.tenantId, tenantId),
                sql`${bookings.status} IN ('active', 'deposit_paid', 'pending_deposit')`
            )
        )
        .get();

    if (!activeBooking) {
        // Check for ended bookings with deposits
        const endedBooking = await db
            .select({ id: bookings.id })
            .from(bookings)
            .where(eq(bookings.tenantId, tenantId))
            .orderBy(desc(bookings.createdAt))
            .get();

        if (!endedBooking) return null;

        const deposit = await db
            .select({ amount: deposits.amount })
            .from(deposits)
            .where(eq(deposits.bookingId, endedBooking.id))
            .get();

        if (!deposit) return null;

        // Get total deductions for this booking
        const totalDeductedResult = await db
            .select({ total: sum(depositDeductions.amount) })
            .from(depositDeductions)
            .where(eq(depositDeductions.bookingId, endedBooking.id))
            .get();

        const totalDeducted = parseFloat(totalDeductedResult?.total ?? "0");

        return {
            originalAmount: deposit.amount,
            totalDeducted,
            remainingBalance: deposit.amount - totalDeducted,
        };
    }

    const deposit = await db
        .select({ amount: deposits.amount })
        .from(deposits)
        .where(eq(deposits.bookingId, activeBooking.id))
        .get();

    if (!deposit) return null;

    // Get total deductions for this booking
    const totalDeductedResult = await db
        .select({ total: sum(depositDeductions.amount) })
        .from(depositDeductions)
        .where(eq(depositDeductions.bookingId, activeBooking.id))
        .get();

    const totalDeducted = parseFloat(totalDeductedResult?.total ?? "0");

    return {
        originalAmount: deposit.amount,
        totalDeducted,
        remainingBalance: deposit.amount - totalDeducted,
    };
}

/**
 * Create a new deposit deduction (charge a fine).
 * Validates that the deduction amount doesn't exceed remaining balance.
 */
export async function createDepositDeduction(
    db: DrizzleDb,
    tenantId: number,
    adminId: number,
    amount: number,
    reason: string
): Promise<{ deduction: DepositDeduction; balance: DepositBalance }> {
    // Get tenant's active booking
    const booking = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(
            and(
                eq(bookings.tenantId, tenantId),
                sql`${bookings.status} IN ('active', 'deposit_paid', 'pending_deposit')`
            )
        )
        .get();

    if (!booking) {
        throw new Error("No active booking found for this tenant");
    }

    // Get the deposit for this booking
    const deposit = await db
        .select()
        .from(deposits)
        .where(eq(deposits.bookingId, booking.id))
        .get();

    if (!deposit) {
        throw new Error("No deposit found for this booking");
    }

    // Calculate current balance
    const balance = await getDepositBalance(db, tenantId);
    if (!balance) {
        throw new Error("Could not calculate deposit balance");
    }

    // Validate deduction amount
    if (amount <= 0) {
        throw new Error("Deduction amount must be greater than zero");
    }

    if (amount > balance.remainingBalance) {
        throw new Error(
            `Deduction amount (₹${amount}) exceeds remaining deposit balance (₹${balance.remainingBalance})`
        );
    }

    // Validate reason
    if (!reason.trim()) {
        throw new Error("Reason is required for deduction");
    }

    // Create the deduction record
    const now = nowISO();
    const newDeduction: NewDepositDeduction = {
        depositId: deposit.id,
        tenantId,
        bookingId: booking.id,
        amount,
        reason: reason.trim(),
        deductedBy: adminId,
        createdAt: now,
    };

    const created = await db
        .insert(depositDeductions)
        .values(newDeduction)
        .returning()
        .get();

    if (!created) {
        throw new Error("Failed to create deduction record");
    }

    // Recalculate balance after deduction
    const updatedBalance = await getDepositBalance(db, tenantId);
    if (!updatedBalance) {
        throw new Error("Could not calculate updated balance");
    }

    return {
        deduction: created,
        balance: updatedBalance,
    };
}

/**
 * Delete a deposit deduction (reverse a fine).
 * This is allowed at any time (admin can reverse a deduction).
 */
export async function deleteDepositDeduction(
    db: DrizzleDb,
    deductionId: number
): Promise<{ balance: DepositBalance }> {
    // Get the deduction record
    const deduction = await db
        .select()
        .from(depositDeductions)
        .where(eq(depositDeductions.id, deductionId))
        .get();

    if (!deduction) {
        throw new Error("Deduction not found");
    }

    // Delete the deduction
    await db
        .delete(depositDeductions)
        .where(eq(depositDeductions.id, deductionId));

    // Recalculate balance after deletion
    const updatedBalance = await getDepositBalance(db, deduction.tenantId);
    if (!updatedBalance) {
        throw new Error("Could not calculate updated balance");
    }

    return {
        balance: updatedBalance,
    };
}

/**
 * Get all deductions for a tenant with admin details.
 */
export async function getTenantDeductions(
    db: DrizzleDb,
    tenantId: number
): Promise<DeductionWithDetails[]> {
    const deductions = await db
        .select({
            id: depositDeductions.id,
            depositId: depositDeductions.depositId,
            tenantId: depositDeductions.tenantId,
            bookingId: depositDeductions.bookingId,
            amount: depositDeductions.amount,
            reason: depositDeductions.reason,
            deductedBy: depositDeductions.deductedBy,
            createdAt: depositDeductions.createdAt,
            adminName: users.name,
            adminEmail: users.email,
        })
        .from(depositDeductions)
        .leftJoin(users, eq(depositDeductions.deductedBy, users.id))
        .where(eq(depositDeductions.tenantId, tenantId))
        .orderBy(desc(depositDeductions.createdAt))
        .all();

    return deductions;
}

/**
 * Get a specific deduction by ID with details.
 */
export async function getDeductionById(
    db: DrizzleDb,
    deductionId: number
): Promise<DeductionWithDetails | null> {
    const deduction = await db
        .select({
            id: depositDeductions.id,
            depositId: depositDeductions.depositId,
            tenantId: depositDeductions.tenantId,
            bookingId: depositDeductions.bookingId,
            amount: depositDeductions.amount,
            reason: depositDeductions.reason,
            deductedBy: depositDeductions.deductedBy,
            createdAt: depositDeductions.createdAt,
            adminName: users.name,
            adminEmail: users.email,
        })
        .from(depositDeductions)
        .leftJoin(users, eq(depositDeductions.deductedBy, users.id))
        .where(eq(depositDeductions.id, deductionId))
        .get();

    return deduction || null;
}
