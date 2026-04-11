
"use client";

import { X } from "lucide-react";

interface RoomImageModalProps {
  open: boolean;
  onClose: () => void;
  images: string[];
}

export function RoomImageModal({ open, onClose, images }: RoomImageModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-base-100 rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-200">
          <h3 className="text-lg font-semibold">Room Images</h3>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Image Grid */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((src, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden bg-base-200"
              >
                <img
                  src={src}
                  alt={`Room view ${index + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            ))}
          </div>

          {/* Footer Note */}
          <p className="mt-5 text-xs sm:text-sm text-center text-base-content/70">
            We do take a{" "}
            <span className="font-semibold text-base-content">
              security deposit
            </span>{" "}
            — don’t worry, it comes back to you when you leave (as long as nothing mysteriously breaks 👀)
          </p>
        </div>
      </div>
    </div>
  );
}