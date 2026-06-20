"use client";

import { useState, useEffect } from "react";
import { Preferences } from "@capacitor/preferences";

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const checkConsent = async () => {
      try {
        const { value } = await Preferences.get({ key: "cookie_consent" });
        if (!value) {
          // Fallback to localStorage
          if (typeof window !== "undefined") {
            const localConsent = localStorage.getItem("cookie_consent");
            if (!localConsent) {
              setShowBanner(true);
            }
          } else {
            setShowBanner(true);
          }
        }
      } catch (err) {
        console.error("Cookie consent check error:", err);
        setShowBanner(true);
      }
    };
    checkConsent();
  }, []);

  const handleConsent = async (accepted: boolean) => {
    try {
      const consentValue = accepted ? "accepted" : "rejected";
      await Preferences.set({ key: "cookie_consent", value: consentValue });
      if (typeof window !== "undefined") {
        localStorage.setItem("cookie_consent", consentValue);
      }
      setShowBanner(false);
    } catch (err) {
      console.error("Save consent error:", err);
      setShowBanner(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 bg-zinc-950/95 border-t border-zinc-900 shadow-2xl backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-zinc-300 text-sm max-w-3xl text-center md:text-left leading-relaxed">
          <p>
            📲 <span className="font-semibold text-white">Cookie Consent:</span> We use cookies and local telemetry to maintain dashboard sessions and verify SMS campaign delivery metrics. By clicking &ldquo;Accept All&rdquo;, you agree to our cookie policy as detailed in our{" "}
            <a href="/privacy" className="text-blue-400 hover:text-blue-300 hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto shrink-0 justify-center">
          <button
            onClick={() => handleConsent(false)}
            className="flex-1 md:flex-initial px-4 py-2 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors h-[40px]"
          >
            Reject Non-Essential
          </button>
          <button
            onClick={() => handleConsent(true)}
            className="flex-1 md:flex-initial px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition-all active:scale-95 h-[40px]"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
