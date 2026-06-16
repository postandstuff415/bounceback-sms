"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface AccountDetails {
  businessName: string;
  email: string;
  realPhoneNumber: string;
  assignedTwilioNum: string | null;
  bookingLink: string;
  subscriptionStatus: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const email = searchParams.get("email") || "";
  const sessionId = searchParams.get("session_id") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountDetails | null>(null);

  useEffect(() => {
    if (!email) {
      setError("Missing account verification details.");
      setLoading(false);
      return;
    }

    const fetchAccountDetails = async () => {
      try {
        const res = await fetch(`/api/onboard/success-details?email=${encodeURIComponent(email)}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch active subscription details.");
        }

        setAccount(data.account);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Something went wrong loading your success screen.");
      } finally {
        setLoading(false);
      }
    };

    fetchAccountDetails();
  }, [email]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-sm font-semibold text-zinc-600">Provisioning your text-back system...</p>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-red-100">
            <div className="text-center">
              <span className="text-4xl">⚠️</span>
              <h2 className="mt-2 text-xl font-bold text-zinc-900">Onboarding Pending</h2>
              <p className="mt-2 text-sm text-zinc-600">
                {error || "We're finalizing your account setup. This usually takes less than a minute."}
              </p>
              <div className="mt-6">
                <button
                  onClick={() => router.push("/onboard")}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Restart Onboarding
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Format phone numbers for beautiful display
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="text-center">
          <span className="text-6xl animate-bounce inline-block">🚀</span>
          <h2 className="mt-6 text-3xl font-extrabold text-zinc-950 tracking-tight">
            Your Text-Back System is Active!
          </h2>
          <p className="mt-2 text-lg text-green-600 font-semibold">
            Subscription confirmed and live.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow sm:rounded-lg sm:px-10 border border-zinc-100">
          
          {/* Account Details Summary */}
          <div className="space-y-6">
            <div className="border-b border-zinc-100 pb-4">
              <h3 className="text-lg font-bold text-zinc-900">{account.businessName}</h3>
              <p className="text-sm text-zinc-500">{account.email}</p>
            </div>

            {/* Twilio Number Display */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-5 text-center">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Your Assigned Twilio Number
              </span>
              <div className="text-3xl font-mono font-extrabold text-blue-900 mt-1 select-all">
                {account.assignedTwilioNum ? formatPhoneNumber(account.assignedTwilioNum) : "Allocating..."}
              </div>
              <p className="text-xs text-blue-700 mt-2 max-w-sm mx-auto">
                Any call to this number will forward to your phone. If you miss it, we instantly text them back!
              </p>
            </div>

            {/* Forwarding Details */}
            <div className="grid grid-cols-2 gap-4 text-sm bg-zinc-50 p-4 rounded-lg border border-zinc-100">
              <div>
                <span className="block text-xs font-semibold text-zinc-500 uppercase">
                  Forwarding To
                </span>
                <span className="font-semibold text-zinc-900">
                  {formatPhoneNumber(account.realPhoneNumber)}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-zinc-500 uppercase">
                  Booking Link
                </span>
                <span className="font-semibold text-blue-600 truncate block max-w-xs" title={account.bookingLink}>
                  <a href={account.bookingLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {account.bookingLink}
                  </a>
                </span>
              </div>
            </div>

            {/* Testing Instructions */}
            <div className="border-t border-zinc-100 pt-6 space-y-3">
              <h4 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
                How to test your live integration
              </h4>
              <ol className="list-decimal list-inside text-sm text-zinc-600 space-y-2">
                <li>
                  Use a different phone (e.g., a friend's phone or another line) to call your Twilio number:{" "}
                  <strong className="text-zinc-900">
                    {account.assignedTwilioNum ? formatPhoneNumber(account.assignedTwilioNum) : ""}
                  </strong>
                </li>
                <li>
                  Decline or do not answer the call on your forwarding phone (ending in{" "}
                  <strong className="text-zinc-900">{account.realPhoneNumber.slice(-4)}</strong>).
                </li>
                <li>
                  Watch the caller's phone! Within 5 seconds of the call ending, they will receive a text:
                  <div className="mt-2 bg-zinc-100 text-zinc-800 p-3 rounded-md font-mono text-xs border border-zinc-200">
                    "Hey there! It's {account.businessName}. We're with a client right now, but we want to take care of you. Tap here to view our open slots and book: {account.bookingLink}"
                  </div>
                </li>
              </ol>
            </div>

            <div className="pt-4 border-t border-zinc-100 flex justify-center">
              <button
                onClick={() => router.push("/")}
                className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-2.5 border border-zinc-300 shadow-sm text-sm font-semibold rounded-md text-zinc-700 bg-white hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Go to Homepage
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-zinc-500">Loading Confirmation...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
