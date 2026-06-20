"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function OnboardPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    businessName: "",
    email: "",
    realPhoneNumber: "",
    bookingLink: "",
    agencyId: "",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const email = params.get("email") || "";
      const businessName = params.get("businessName") || "";
      const realPhoneNumber = params.get("realPhoneNumber") || "";
      const bookingLink = params.get("bookingLink") || "";
      const agencyId = params.get("agencyId") || "";

      if (email || businessName || realPhoneNumber || bookingLink || agencyId) {
        setFormData({
          email,
          businessName,
          realPhoneNumber,
          bookingLink,
          agencyId,
        });
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNext = () => {
    // Basic validation per step
    if (step === 1) {
      if (!formData.businessName.trim() || !formData.email.trim()) {
        setError("Please fill in all fields.");
        return;
      }
      if (!formData.email.includes("@")) {
        setError("Please enter a valid email address.");
        return;
      }
    } else if (step === 2) {
      if (!formData.realPhoneNumber.trim()) {
        setError("Please enter your phone number.");
        return;
      }
      // Basic phone format check
      const phoneDigits = formData.realPhoneNumber.replace(/\D/g, "");
      if (phoneDigits.length < 10) {
        setError("Please enter a valid 10-digit US phone number.");
        return;
      }
    }

    setError(null);
    setStep(step + 1);
  };

  const handlePrev = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bookingLink.trim()) {
      setError("Please enter your booking link.");
      return;
    }
    if (!formData.bookingLink.startsWith("http://") && !formData.bookingLink.startsWith("https://")) {
      setError("Booking link must start with http:// or https://");
      return;
    }
    if (!consentAccepted) {
      setError("You must agree to the Terms of Service and Privacy Policy to proceed.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      if (data.url) {
        // Redirect to Stripe or mock checkout screen
        window.location.href = data.url;
      } else {
        throw new Error("Invalid server response. Checkout URL not found.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to initiate onboarding payment.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)] px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <span className="text-3xl font-extrabold text-blue-600 tracking-tight flex items-center gap-2">
            📲 BounceBack <span className="text-zinc-900">SMS</span>
          </span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-zinc-950">
          Set up your text-back system
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-500">
          14-day free trial • Then $19.99/mo • First-month refund guarantee
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-3xl sm:rounded-3xl sm:px-10 border border-zinc-100">
          {/* Progress Indicators */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div
                  className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-semibold transition-colors ${
                    step >= 1 ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  1
                </div>
                <span className="ml-2 text-xs font-semibold text-zinc-950 hidden sm:inline">Business</span>
              </div>
              <div className="flex-1 border-t border-zinc-200 mx-4" />
              <div className="flex items-center">
                <div
                  className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-semibold transition-colors ${
                    step >= 2 ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  2
                </div>
                <span className="ml-2 text-xs font-semibold text-zinc-950 hidden sm:inline">Phone Setup</span>
              </div>
              <div className="flex-1 border-t border-zinc-200 mx-4" />
              <div className="flex items-center">
                <div
                  className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-semibold transition-colors ${
                    step >= 3 ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  3
                </div>
                <span className="ml-2 text-xs font-semibold text-zinc-950 hidden sm:inline">Booking</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="businessName" className="block text-sm font-semibold text-zinc-700">
                    Business Name
                  </label>
                  <div className="mt-1.5">
                    <input
                      type="text"
                      name="businessName"
                      id="businessName"
                      required
                      value={formData.businessName}
                      onChange={handleChange}
                      placeholder="e.g. Austin Mobile Detailing"
                      className="appearance-none block w-full px-4 py-3 border border-zinc-300 rounded-xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black h-[48px] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-zinc-700">
                    Contact Email Address
                  </label>
                  <div className="mt-1.5">
                    <input
                      type="email"
                      name="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="owner@yourdomain.com"
                      className="appearance-none block w-full px-4 py-3 border border-zinc-300 rounded-xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black h-[48px] transition-all"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all h-[48px]"
                  >
                    Continue to Step 2
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="realPhoneNumber" className="block text-sm font-semibold text-zinc-700">
                    Your Real Phone Number
                  </label>
                  <p className="text-xs text-zinc-400 mb-2 leading-relaxed">
                    Your business phone line. We will intercept missed calls here and forward your Twilio number to this phone.
                  </p>
                  <div className="mt-1.5">
                    <input
                      type="tel"
                      name="realPhoneNumber"
                      id="realPhoneNumber"
                      required
                      value={formData.realPhoneNumber}
                      onChange={handleChange}
                      placeholder="(512) 555-0199"
                      className="appearance-none block w-full px-4 py-3 border border-zinc-300 rounded-xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black h-[48px] transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="w-1/3 flex items-center justify-center py-3.5 px-4 border border-zinc-300 rounded-xl text-sm font-semibold text-zinc-700 bg-white hover:bg-zinc-50 active:scale-98 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all h-[48px]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-2/3 flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all h-[48px]"
                  >
                    Continue to Step 3
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="bookingLink" className="block text-sm font-semibold text-zinc-700">
                    Booking or Scheduling Link
                  </label>
                  <p className="text-xs text-zinc-400 mb-2 leading-relaxed">
                    Where should customers schedule their appointments? (Calendly, Acuity, GlossGenius, etc.)
                  </p>
                  <div className="mt-1.5">
                    <input
                      type="url"
                      name="bookingLink"
                      id="bookingLink"
                      required
                      value={formData.bookingLink}
                      onChange={handleChange}
                      placeholder="https://calendly.com/your-business"
                      className="appearance-none block w-full px-4 py-3 border border-zinc-300 rounded-xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black h-[48px] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="agencyId" className="block text-sm font-semibold text-zinc-700">
                    Referral Agency ID (Optional)
                  </label>
                  <div className="mt-1.5">
                    <input
                      type="text"
                      name="agencyId"
                      id="agencyId"
                      value={formData.agencyId}
                      onChange={handleChange}
                      placeholder="e.g. agency_123"
                      className="appearance-none block w-full px-4 py-3 border border-zinc-300 rounded-xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black h-[48px] transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-start pt-2">
                  <div className="flex items-center h-5">
                    <input
                      id="consent"
                      name="consent"
                      type="checkbox"
                      required
                      checked={consentAccepted}
                      onChange={(e) => setConsentAccepted(e.target.checked)}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-zinc-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-xs leading-relaxed">
                    <label htmlFor="consent" className="font-medium text-zinc-600">
                      I agree to the{" "}
                      <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                        Privacy Policy
                      </a>{" "}
                      including the secure collection of caller telemetry and missed-call text-back processing.
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={loading}
                    className="w-1/3 flex items-center justify-center py-3.5 px-4 border border-zinc-300 rounded-xl text-sm font-semibold text-zinc-700 bg-white hover:bg-zinc-50 active:scale-98 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all h-[48px] disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all h-[48px] disabled:opacity-50"
                  >
                    {loading ? "Initializing..." : "Start 14-Day Free Trial ($19.99/mo)"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
