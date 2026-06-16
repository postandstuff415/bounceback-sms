"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function MockCheckoutForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read metadata from query string
  const businessName = searchParams.get("businessName") || "";
  const email = searchParams.get("email") || "";
  const realPhoneNumber = searchParams.get("realPhoneNumber") || "";
  const bookingLink = searchParams.get("bookingLink") || "";
  const agencyId = searchParams.get("agencyId") || "";

  // Card form states
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [expiry, setExpiry] = useState("12/28");
  const [cvc, setCvc] = useState("123");
  const [cardholderName, setCardholderName] = useState(businessName || "Business Owner");

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Simulate Stripe Checkout Session Completion
    const mockSessionId = `cs_mock_${Math.random().toString(36).substring(2, 11)}`;
    const mockCustomerId = `cus_mock_${Math.random().toString(36).substring(2, 11)}`;

    const mockWebhookPayload = {
      id: `evt_mock_${Math.random().toString(36).substring(2, 11)}`,
      type: "checkout.session.completed",
      data: {
        object: {
          id: mockSessionId,
          customer: mockCustomerId,
          payment_status: "paid",
          metadata: {
            businessName,
            email,
            realPhoneNumber,
            bookingLink,
            agencyId,
          },
        },
      },
    };

    try {
      console.log("Simulating webhook event for checkout.session.completed...");
      
      const res = await fetch("/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-mock-request": "true",
        },
        body: JSON.stringify(mockWebhookPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Webhook simulation failed");
      }

      console.log("Webhook simulation succeeded! Account created/updated.", data);
      
      // Redirect to success page
      router.push(`/onboard/success?session_id=${mockSessionId}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process simulation payment. See console for details.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col md:flex-row font-sans">
      {/* Left panel: Order Summary */}
      <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-between bg-zinc-50 border-r border-zinc-200">
        <div>
          <button
            onClick={() => router.push("/onboard")}
            className="text-zinc-500 hover:text-zinc-950 text-sm font-medium flex items-center gap-1.5 mb-12"
          >
            ← Back to Onboarding
          </button>

          <span className="text-sm font-semibold tracking-wide uppercase text-zinc-500">
            BounceBack SMS
          </span>
          <h1 className="text-4xl font-extrabold text-zinc-950 mt-2">
            Subscribe to BounceBack SMS
          </h1>
          <p className="text-lg text-zinc-600 mt-2">
            Automated missed-call text-backs for local service providers.
          </p>

          {/* Pricing Info */}
          <div className="mt-8 flex items-baseline text-zinc-950">
            <span className="text-5xl font-extrabold tracking-tight">$49.00</span>
            <span className="ml-1 text-xl font-semibold text-zinc-500">/ month</span>
          </div>

          {/* Business Summary */}
          <div className="mt-12 space-y-4 border-t border-zinc-200 pt-8 max-w-sm">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
              Registration Info
            </h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-zinc-500">Business</span>
              <span className="text-zinc-950 font-medium truncate">{businessName || "Not provided"}</span>
              
              <span className="text-zinc-500">Email</span>
              <span className="text-zinc-950 font-medium truncate">{email || "Not provided"}</span>
              
              <span className="text-zinc-500">Real Phone</span>
              <span className="text-zinc-950 font-medium">{realPhoneNumber || "Not provided"}</span>
              
              <span className="text-zinc-500">Booking Link</span>
              <span className="text-zinc-950 font-medium truncate">{bookingLink || "Not provided"}</span>

              {agencyId && (
                <>
                  <span className="text-zinc-500">Agency Attribution</span>
                  <span className="text-zinc-950 font-medium">{agencyId}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 text-xs text-zinc-400 border-t border-zinc-200 pt-6">
          <span>Powered by </span>
          <span className="font-bold text-zinc-500">stripe</span>
          <span className="mx-2">|</span>
          <span className="font-medium text-blue-600">Mock Checkout Sandbox</span>
        </div>
      </div>

      {/* Right panel: Checkout Form */}
      <div className="w-full md:w-1/2 p-8 md:p-16 flex items-center justify-center bg-white">
        <div className="w-full max-w-md">
          <h2 className="text-xl font-bold text-zinc-950 mb-6">Payment details</h2>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handlePay} className="space-y-6">
            <div className="space-y-4">
              {/* Cardholder Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Name on card
                </label>
                <input
                  type="text"
                  required
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  className="block w-full px-4 py-3 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-600 focus:border-blue-600 sm:text-sm text-black font-medium"
                />
              </div>

              {/* Card Number */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Card info
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="block w-full px-4 py-3 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-600 focus:border-blue-600 sm:text-sm text-black font-mono font-medium"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <span className="text-zinc-400 font-bold text-xs uppercase tracking-widest bg-zinc-100 px-1.5 py-1 rounded">
                      VISA
                    </span>
                  </div>
                </div>
              </div>

              {/* Expiry / CVC */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    Expiration
                  </label>
                  <input
                    type="text"
                    required
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="block w-full px-4 py-3 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-600 focus:border-blue-600 sm:text-sm text-black font-mono font-medium text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    CVC
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    placeholder="123"
                    className="block w-full px-4 py-3 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-600 focus:border-blue-600 sm:text-sm text-black font-mono font-medium text-center"
                  />
                </div>
              </div>
            </div>

            {/* Billing Address Mock */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Billing address
              </label>
              <select className="block w-full px-4 py-3 border border-zinc-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-blue-600 focus:border-blue-600 sm:text-sm text-black font-medium">
                <option>United States (US)</option>
                <option>Canada (CA)</option>
                <option>United Kingdom (UK)</option>
              </select>
            </div>

            {/* Pay Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-md shadow-sm text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 mt-4"
            >
              {loading ? "Processing Payment..." : `Pay $49.00`}
            </button>

            <p className="text-center text-xs text-zinc-500 mt-4">
              By clicking Pay, you authorize Stripe (simulated) to charge your payment method for $49.00/mo until you cancel.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function MockCheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-zinc-500">Loading Checkout Sandbox...</div>}>
      <MockCheckoutForm />
    </Suspense>
  );
}
