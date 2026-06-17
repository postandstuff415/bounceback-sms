"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

function BookingContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const accountId = params.accountId as string;
  const ticketId = searchParams.get("ticketId");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const timeslots = [
    "Today, 2:00 PM - 4:00 PM",
    "Today, 4:00 PM - 6:00 PM",
    "Tomorrow, 8:00 AM - 10:00 AM",
    "Tomorrow, 10:00 AM - 12:00 PM",
  ];

  const handleBook = async (slot: string) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/intake/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, selectedTimeslot: slot }),
      });

      if (!res.ok) throw new Error("Failed to confirm booking.");
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col justify-center items-center p-4">
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-3xl text-center max-w-md">
          <div className="h-16 w-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
            ✓
          </div>
          <h1 className="text-2xl font-bold mb-2">Booking Confirmed!</h1>
          <p className="text-slate-400">
            Our dispatcher has been notified and is reviewing your emergency details. We will call you shortly.
          </p>
          <button 
            onClick={() => window.close()}
            className="mt-8 text-sm font-semibold text-indigo-400 hover:text-indigo-300"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Select an Arrival Window</h1>
        <div className="space-y-3">
          {timeslots.map((slot) => (
            <button
              key={slot}
              disabled={loading}
              onClick={() => handleBook(slot)}
              className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-indigo-500 transition-all text-left flex justify-between items-center group"
            >
              <span className="font-medium text-slate-200">{slot}</span>
              <span className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </button>
          ))}
        </div>
        {error && <p className="mt-4 text-rose-500 text-center text-sm">{error}</p>}
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>}>
      <BookingContent />
    </Suspense>
  );
}
