"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/errors";
import api from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";
import { Bed, CheckCircle2, XCircle, Clock, Home, Info, Bug, GitPullRequest } from "lucide-react";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { RoomGridSkeleton } from "@/components/Skeleton";
import { Modal } from "@/components/Modal";

interface BedData {
  id: number;
  name: string;
  status: "available" | "reserved" | "occupied";
  monthlyRent: number;
  expectedMoveOutDate: string | null;
}

interface RoomData {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  beds: BedData[];
}

export default function HomePage() {
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingBedId, setBookingBedId] = useState<number | null>(null);
  const [selectedBed, setSelectedBed] = useState<BedData | null>(null);
  const [moveInDate, setMoveInDate] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [globalDeposit, setGlobalDeposit] = useState<number | null>(null);
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

  const handleBookClick = (bed: BedData) => {
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
    // Suggest today's date
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
      let depositAmount = globalDeposit !== null ? globalDeposit : selectedBed.monthlyRent;

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <span className="badge badge-success badge-sm gap-1"><CheckCircle2 className="h-3 w-3" /> Available</span>;
      case "occupied":
        return <span className="badge badge-error badge-sm gap-1"><XCircle className="h-3 w-3" /> Occupied</span>;
      case "reserved":
        return <span className="badge badge-warning badge-sm gap-1"><Clock className="h-3 w-3" /> Reserved</span>;
      default:
        return <span className="badge badge-ghost badge-sm">{status}</span>;
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
                <div key={room.id} className="card bg-base-100 shadow-md border border-base-200 hover:shadow-lg transition-shadow">
                  <div className="card-body">
                    <h3 className="card-title">{room.name}</h3>
                    {room.description && <p className="text-sm text-base-content/60">{room.description}</p>}
                    <div className="divider my-2"></div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <Bed className="h-4 w-4" /> Beds ({room.beds.length})
                    </h4>
                    <div className="space-y-2">
                      {room.beds.map((bed) => (
                        <div key={bed.id} className="flex items-center justify-between p-3 rounded-lg bg-base-200/50 border border-base-200">
                          <div>
                            <span className="font-medium text-sm">{bed.name}</span>
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusBadge(bed.status)}
                              <span className="text-xs text-base-content/50">₹{bed.monthlyRent.toLocaleString()}/mo</span>
                            </div>
                            {bed.status === "occupied" && bed.expectedMoveOutDate && (
                              <div className="text-xs text-base-content/70 mt-1 flex items-center gap-1">
                                <Info className="h-3 w-3" />
                                Expected release: {new Date(bed.expectedMoveOutDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                              </div>
                            )}
                            {bed.status === "occupied" && !bed.expectedMoveOutDate && (
                              <div className="text-xs text-base-content/50 mt-1">
                                No move-out date set
                              </div>
                            )}
                          </div>
                          {bed.status === "available" && (
                            <button
                              className={`btn btn-primary btn-sm ${bookingBedId === bed.id ? "btn-disabled" : ""}`}
                              onClick={() => handleBookClick(bed)}
                              disabled={bookingBedId === bed.id}
                            >
                              {bookingBedId === bed.id ? <span className="loading loading-spinner loading-xs"></span> : "Book"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="py-10 sm:py-12 border-t border-base-200">
          <div className="p-5 bg-base-200/50 rounded-xl text-sm sm:text-base text-base-content/80 max-w-2xl mx-auto">

            <p className="text-base-content font-medium mb-3">A few simple things to keep in mind:</p>

            <ul className="list-disc list-outside ml-5 space-y-1 text-base-content/70 text-justify leading-tight">
              <li>Please help keep the rooms and facilities clean — future you (and everyone else) will appreciate it.</li>
              <li>The bathroom is shared, so please leave it the way you’d like to find it.</li>
              <li>If something stops working, just raise a complaint from your dashboard — we’ll handle the rest.</li>
              <li>Noise happens, we get it. Just try to keep it low, especially at night.</li>
              <li>Dustbins are provided — let’s use them and keep the place tidy.</li>
            </ul>

          </div>
        </section>
      </main>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Select Move-In Date">
        <form onSubmit={handleConfirmBooking} className="space-y-4">
          <div className="p-4 sm:p-5 bg-base-200 rounded-xl text-sm sm:text-base text-base-content/80 leading-relaxed space-y-3 max-w-2xl mx-auto">
            <p className="text-base-content">
              You’re booking <strong>{selectedBed?.name}</strong>.
            </p>

            <p>
              To confirm your booking, you’ll need to pay a security deposit of{" "}
              <strong className="text-base-content">
                ₹
                {globalDeposit !== null
                  ? globalDeposit.toLocaleString()
                  : selectedBed?.monthlyRent.toLocaleString()}
              </strong>.
            </p>

            <p className="bg-base-100 p-3 rounded-lg">
              This amount will be returned when you move out — it’s yours.
              <br />
              Deductions are only made in case of any damage or if there’s any trouble during your stay.
            </p>

            <p>
              Your first month’s rent will be adjusted based on your move-in date.
            </p>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Move-In Date</span></label>
            <input
              type="date"
              className="input input-bordered w-full"
              value={moveInDate}
              onChange={(e) => setMoveInDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-full">
            Proceed to Pay Deposit
          </button>
        </form>
      </Modal>

      <footer className="mt-auto border-t border-base-200">
        <div className="max-w-2xl mx-auto px-6 py-10 text-sm text-base-content/70 text-center">

          <div className="space-y-3 leading-relaxed">

            <p>
              This site is maintained by{" "}
              <Link
                href="https://github.com/ppriyankuu"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary"
              >
                Priyanku Gogoi
              </Link>{" "}
              himself. (Mostly because he's lonely AF).
            </p>

            <p>
              Found a bug? You may report it in the{" "}
              <Link
                href="https://github.com/ppriyankuu/rent/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                issues section
              </Link>{" "}
              of this app's repository.
            </p>

            <p>
              If you're a developer yourself or are into computer science, feel free to contribute — Pull Requests are always welcome (just don't start judging my code).{" "}
              <Link
                href="https://github.com/ppriyankuu/rent"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                Click me!
              </Link>
            </p>

          </div>

          <div className="mt-8 pt-6 border-t border-base-200 text-xs opacity-40">
            © {new Date().getFullYear()} — Built with Next.js and questionable amounts of sugar.
          </div>

        </div>
      </footer>
    </div>
  );
}
