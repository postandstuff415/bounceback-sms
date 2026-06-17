"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function PublicIntakePortal() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.accountId as string;

  const [form, setForm] = useState({ name: "", phone: "", issue: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/intake/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, ...form }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process intake request.");

      // On success, advance user to the scheduling/dispatch stage
      router.push(`/intake/${accountId}/book?ticketId=${data.ticketId}`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col justify-between p-4 antialiased selection:bg-indigo-500/30">
      {/* Header utility */}
      <header className="w-full max-w-md mx-auto pt-6 text-center">
        <div className="inline-flex h-2 w-12 rounded-full bg-indigo-500 mb-4 animate-pulse" />
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          Emergency Dispatch Desk
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Tell us what you need. We'll handle the rest instantly.
        </p>
      </header>

      {/* Main Touch Form UI */}
      <main className="w-full max-w-md mx-auto my-auto py-8">
        <form onSubmit={handleSubmit} className="space-y-5 bg-slate-900/50 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase pl-1">Your Name</label>
            <input
              type="text"
              required
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full h-12 px-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-500 transition-colors text-base text-white placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase pl-1">Mobile Phone Number</label>
            <input
              type="tel"
              required
              placeholder="(555) 000-0000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full h-12 px-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-500 transition-colors text-base text-white placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase pl-1">Describe the Emergency Niche/Issue</label>
            <textarea
              required
              rows={3}
              placeholder="Example: Water heater is leaking flat out onto the garage floor and I can't locate the main shutoff valve..."
              value={form.issue}
              onChange={(e) => setForm({ ...form, issue: e.target.value })}
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-500 transition-colors text-base text-white placeholder:text-slate-600 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 text-white font-medium rounded-2xl shadow-lg shadow-indigo-600/10 active:scale-[0.99] transition-all flex items-center justify-center text-base"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Analyze Emergency & Match Dispatcher"
            )}
          </button>
        </form>
      </main>

      {/* Footer Branding */}
      <footer className="w-full text-center pb-4">
        <p className="text-xs text-slate-600 tracking-widest uppercase">
          Powered by BounceBack FrontDesk
        </p>
      </footer>
    </div>
  );
}
