"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { RoomGridSkeleton } from "@/components/Skeleton";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { getErrorMessage } from "@/lib/errors";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Home, Bed } from "lucide-react";
import { RoomCard } from "./page-comps/HomeRoomCard";
import { BookingModal } from "./page-comps/BookingModal";
import { HouseRules } from "./page-comps/HouseRules";
import { HomeFooter } from "./page-comps/HomeFooter";
import type { Room, BED } from "@/lib/types";

export default function HomePage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalDeposit, setGlobalDeposit] = useState<number | null>(null);

  const [bookingBedId, setBookingBedId] = useState<number | null>(null);
  const [selectedBed, setSelectedBed] = useState<BED | null>(null);
  const [moveInDate, setMoveInDate] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    Promise.all([
      api.get("/api/rooms").catch(() => null),
      api.get("/api/admin/settings", { skipAuthRedirect: true }).catch(() => null)
    ]).then(([roomsRes, settingsRes]) => {
      if (roomsRes?.data?.data) setRooms(roomsRes.data.data);
      if (settingsRes?.data?.data?.deposit_amount) {
        setGlobalDeposit(parseInt(settingsRes.data.data.deposit_amount));
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleBookClick = (bed: BED) => {
    if (!isAuthenticated) {
      toast("You need to login/signup first!", { icon: "🧠" });
      return;
    }
    if (user?.role === "admin") {
      toast.error("Admins cannot book beds. Use the admin panel.");
      return;
    }
    if (user?.isActive === false) {
      toast.error("Your account has been deactivated. Please contact the administrator.");
      return;
    }
    setSelectedBed(bed);
    const today = new Date().toISOString().split("T")[0];
    setMoveInDate(today);
    setModalOpen(true);
  };

  const handleConfirmBooking = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!selectedBed || !moveInDate) return;

    setModalOpen(false);
    setBookingBedId(selectedBed.id);
    try {
      const depositAmount = globalDeposit !== null ? globalDeposit : selectedBed.monthlyRent;

      const res = await api.post("/api/bookings", { bedId: selectedBed.id, depositAmount, moveInDate });
      const { razorpayOrderId, razorpayKeyId, amount } = res.data.data;

      const paymentResult = await openRazorpayCheckout({
        razorpayKeyId,
        orderId: razorpayOrderId,
        amount: amount * 100,
        description: `Security Deposit for ${selectedBed?.name}`,
        prefill: { name: user?.name, email: user?.email },
      });

      await api.post("/api/bookings/deposit/verify", paymentResult);
      toast.success("Booking confirmed! Redirecting to dashboard...");
      setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Booking failed");
      if (msg !== "Payment cancelled by user") toast.error(msg);
    } finally {
      setBookingBedId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <section className="text-center py-12 lg:py-20">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Home className="h-4 w-4" /> Choose Your Place To Survive
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Find Your Space, <span className="text-primary">Skip the Drama</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-base-content/60">
            Browse rooms, book a bed, and avoid awkward landlord conversations.
          </p>
          {!isAuthenticated && (
            <div className="mt-8 flex justify-center gap-4">
              <Link href="/signup" className="btn btn-primary btn-lg">Get Started</Link>
              <a href="#rooms" className="btn btn-outline btn-lg">View Rooms</a>
            </div>
          )}
        </section>

        <section id="rooms" className="py-10 sm:py-12 border-t border-base-200">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8">Available Rooms</h2>
          {loading ? (
            <RoomGridSkeleton />
          ) : rooms.length === 0 ? (
            <div className="text-center py-16">
              <Bed className="h-12 w-12 mx-auto text-base-content/30 mb-4" />
              <p className="text-base-content/60">No rooms available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  bookingBedId={bookingBedId}
                  onBookClick={handleBookClick}
                />
              ))}
            </div>
          )}
        </section>

        <HouseRules />
      </main>

      <HomeFooter />

      <BookingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedBed={selectedBed}
        moveInDate={moveInDate}
        setMoveInDate={setMoveInDate}
        deposit={globalDeposit}
        onSubmit={handleConfirmBooking}
      />
    </div>
  );
}
