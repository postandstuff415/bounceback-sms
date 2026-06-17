"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Preferences } from "@capacitor/preferences";

interface CallLog {
  id: string;
  callerNumber: string;
  callStatus: string;
  smsSent: boolean;
  revenueSavedEst: number;
  timestamp: string;
}

interface AccountDetails {
  id: string;
  businessName: string;
  email: string;
  realPhoneNumber: string;
  assignedTwilioNum: string | null;
  bookingLink: string;
  subscriptionStatus: string;
}

interface DashboardData {
  account: AccountDetails;
  metrics: {
    recoveryRate: number;
    totalRevenueSaved: number;
    leadsRescued: number;
    missedCalls: number;
  };
  logs: CallLog[];
}

export default function Home() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Login states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Dashboard states
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check stored credentials on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { value } = await Preferences.get({ key: "userEmail" });
        if (value) {
          setUserEmail(value);
        } else {
          // Fallback to localStorage
          if (typeof window !== "undefined") {
            const localEmail = localStorage.getItem("userEmail");
            if (localEmail) {
              setUserEmail(localEmail);
            }
          }
        }
      } catch (err) {
        console.error("Preferences access error:", err);
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  // Fetch dashboard data when userEmail is set
  useEffect(() => {
    if (!userEmail) return;

    const fetchDashboard = async (showRefresher = false) => {
      if (showRefresher) setIsRefreshing(true);
      else setDashboardLoading(true);

      setDashboardError(null);

      try {
        const res = await fetch(`/api/dashboard?email=${encodeURIComponent(userEmail)}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load dashboard metrics");
        }

        setDashboardData(data);
      } catch (err: any) {
        console.error(err);
        setDashboardError(err.message || "Failed to load dashboard. Please try again.");
      } finally {
        setDashboardLoading(false);
        setIsRefreshing(false);
      }
    };

    fetchDashboard();
  }, [userEmail]);

  // Handle manual dashboard refresh
  const handleRefresh = async () => {
    if (!userEmail || dashboardLoading || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/dashboard?email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      if (res.ok) {
        setDashboardData(data);
      }
    } catch (err) {
      console.error("Failed to refresh:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      setLoginError("Email is required");
      return;
    }

    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: loginEmail.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login verification failed");
      }

      // Store in preferences & state
      await Preferences.set({ key: "userEmail", value: data.account.email });
      if (typeof window !== "undefined") {
        localStorage.setItem("userEmail", data.account.email);
      }

      setUserEmail(data.account.email);
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Direct login for quick demo testing
  const handleQuickDemo = async (demoEmail: string) => {
    setLoginEmail(demoEmail);
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: demoEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      await Preferences.set({ key: "userEmail", value: data.account.email });
      if (typeof window !== "undefined") {
        localStorage.setItem("userEmail", data.account.email);
      }

      setUserEmail(data.account.email);
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || "Failed to launch quick demo.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await Preferences.remove({ key: "userEmail" });
      if (typeof window !== "undefined") {
        localStorage.removeItem("userEmail");
      }
      setUserEmail(null);
      setDashboardData(null);
      setLoginEmail("");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Format phone numbers
  const formatPhone = (phone: string | null) => {
    if (!phone) return "Not set";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  // Format date helper
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-zinc-400 text-sm font-medium">Launching Native Dashboard...</p>
      </div>
    );
  }

  // --- 1. RENDER LOGIN SCREEN ---
  if (!userEmail) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)] px-4 font-sans">
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <div className="text-center mb-8">
            <span className="text-5xl inline-block mb-3 animate-pulse">📲</span>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              BounceBack SMS
            </h1>
            <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
              Missed Call Revenue Recovery Mobile Console
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
            <h2 className="text-lg font-bold text-zinc-100 mb-4">Sign In</h2>

            {loginError && (
              <div className="mb-4 bg-red-950/40 border border-red-800/80 text-red-200 text-xs p-3.5 rounded-xl">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Account Email Address
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="owner@yourdomain.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm placeholder-zinc-600 h-[48px]"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 active:scale-98 transition-all text-white font-semibold py-3.5 px-4 rounded-xl text-sm shadow-lg h-[48px] disabled:opacity-50"
              >
                {loginLoading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-b-2 border-b-white rounded-full animate-spin"></div>
                ) : (
                  "Access Console"
                )}
              </button>
            </form>

            <div className="relative my-6 flex items-center justify-center">
              <div className="border-t border-zinc-800 w-full"></div>
              <span className="bg-zinc-900 px-3 text-xxs uppercase tracking-widest text-zinc-500 absolute">
                Quick Demo
              </span>
            </div>

            {/* Quick Demo Access Trigger */}
            <div className="space-y-2">
              <p className="text-zinc-500 text-center text-xxs leading-relaxed">
                No account? Try the pre-seeded active plumber test dashboard instantly:
              </p>
              <button
                onClick={() => handleQuickDemo("test@example.com")}
                className="w-full text-xs font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 py-3 rounded-xl border border-blue-500/30 active:scale-98 transition-all flex items-center justify-center gap-2 h-[48px]"
              >
                🪠 Tap to Demo Test Dashboard
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-zinc-600 text-xxs leading-normal mt-6 max-w-xs mx-auto">
          BounceBack SMS Enterprise Mobile. Safe Area responsive environment with persistent Capacitor Auth token configuration.
        </p>
      </div>
    );
  }

  // --- 2. RENDER LOADING STATE ---
  if (dashboardLoading && !dashboardData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-zinc-400 text-xs">Syncing real-time call telemetry...</p>
      </div>
    );
  }

  // --- 3. RENDER DASHBOARD ERROR ---
  if (dashboardError || !dashboardData) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-center items-center p-6 text-center pt-[calc(env(safe-area-inset-top)+2rem)]">
        <span className="text-4xl mb-3">⚠️</span>
        <h2 className="text-lg font-bold text-zinc-200">Sync Fail</h2>
        <p className="text-zinc-400 mt-2 text-sm max-w-xs">{dashboardError || "Dashboard failed to synchronize"}</p>
        <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => setUserEmail(userEmail)} // force reload
            className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl text-sm"
          >
            Retry Sync
          </button>
          <button
            onClick={handleLogout}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-400 py-3 px-4 rounded-xl text-sm"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const { account, metrics, logs } = dashboardData;

  // --- 4. RENDER GORGEOUS MINIMALIST DASHBOARD ---
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] px-4 font-sans select-none">
      
      {/* Top Header Bar */}
      <header className="flex items-center justify-between py-3 border-b border-zinc-900 mb-5">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs font-bold text-emerald-400 tracking-wide uppercase">Live Status</span>
          </div>
          <h1 className="text-lg font-extrabold text-zinc-100 leading-tight truncate max-w-[200px]">
            {account.businessName}
          </h1>
        </div>

        <button
          onClick={handleLogout}
          className="bg-zinc-900/80 active:bg-zinc-800 border border-zinc-800/80 px-3 py-2 rounded-xl text-xs font-bold text-zinc-400 transition-colors flex items-center gap-1.5 h-[36px]"
        >
          Sign Out
        </button>
      </header>

      {/* Main Core Dashboard Scroll Area */}
      <main className="flex-1 overflow-y-auto space-y-5">
        
        {/* Network & Routing Setup Card */}
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 flex flex-col sm:flex-row justify-between gap-3 shadow-sm">
          <div className="space-y-1">
            <span className="block text-xxs font-semibold text-zinc-500 uppercase tracking-widest">
              My Twilio Recovery Line
            </span>
            <span className="block text-base font-mono font-extrabold text-blue-400 select-all">
              {formatPhone(account.assignedTwilioNum)}
            </span>
          </div>
          <div className="border-t sm:border-t-0 sm:border-l border-zinc-900 pt-3 sm:pt-0 sm:pl-4 space-y-1">
            <span className="block text-xxs font-semibold text-zinc-500 uppercase tracking-widest">
              Forwarding Line
            </span>
            <span className="block text-sm font-semibold text-zinc-300">
              {formatPhone(account.realPhoneNumber)}
            </span>
          </div>
        </div>

        {/* Dynamic Analytics Metrics Cards (Grid format) */}
        <section className="grid grid-cols-2 gap-4">
          
          {/* Recovery Rate Card */}
          <div className="bg-zinc-900/60 border border-zinc-850 rounded-3xl p-4 flex flex-col justify-between h-[140px] shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 h-20 w-20 bg-blue-500/5 rounded-full blur-2xl"></div>
            <div className="flex items-center justify-between">
              <span className="text-xxs font-bold text-zinc-400 uppercase tracking-widest">Recovery Rate</span>
              <span className="text-lg">📈</span>
            </div>
            <div>
              <div className="text-3xl font-black text-blue-400 tracking-tight leading-none mb-1">
                {metrics.recoveryRate}%
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${metrics.recoveryRate}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Revenue Saved Card */}
          <div className="bg-zinc-900/60 border border-zinc-850 rounded-3xl p-4 flex flex-col justify-between h-[140px] shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 h-20 w-20 bg-emerald-500/5 rounded-full blur-2xl"></div>
            <div className="flex items-center justify-between">
              <span className="text-xxs font-bold text-zinc-400 uppercase tracking-widest">Revenue Saved</span>
              <span className="text-lg">💰</span>
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-400 tracking-tight leading-none">
                ${metrics.totalRevenueSaved.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-zinc-500 font-medium mt-1 leading-normal">
                Estimated at $60 per intercept
              </p>
            </div>
          </div>

          {/* Leads Rescued Card */}
          <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-sm">
              🛡️
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Leads Rescued
              </span>
              <span className="block text-lg font-extrabold text-zinc-100">
                {metrics.leadsRescued}
              </span>
            </div>
          </div>

          {/* Missed Calls Card */}
          <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-sm">
              📞
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Calls Intercepted
              </span>
              <span className="block text-lg font-extrabold text-zinc-100">
                {metrics.missedCalls}
              </span>
            </div>
          </div>

        </section>

        {/* Live Call Telemetry Log List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest">
              Live Call Telemetry ({logs.length})
            </h3>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold active:scale-95 transition-all p-1 h-[28px] ${
                isRefreshing ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <svg
                className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 6.57l-4.11-1.37"
                />
              </svg>
              Refresh
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="bg-zinc-900/20 border border-zinc-900/60 rounded-2xl p-8 text-center text-zinc-500 text-xs">
              <span className="text-xl block mb-2">🏖️</span>
              No calls recorded yet. All quiet on the line!
            </div>
          ) : (
            <div className="space-y-2.5">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className="bg-zinc-900/50 border border-zinc-850 hover:border-zinc-800 transition-colors p-3.5 rounded-2xl flex items-center justify-between gap-3 active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm ${
                      log.smsSent ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-400"
                    }`}>
                      {log.smsSent ? "🎯" : "📞"}
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-sm font-bold font-mono text-zinc-100">
                        {formatPhone(log.callerNumber)}
                      </span>
                      <span className="block text-[10px] text-zinc-500 font-medium">
                        {formatTime(log.timestamp)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    {log.smsSent ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 uppercase tracking-wider">
                        Rescued
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-zinc-800 text-zinc-400 uppercase tracking-wider">
                        No SMS
                      </span>
                    )}
                    <span className="block text-xs font-extrabold font-mono text-zinc-300">
                      {log.smsSent ? "+$60.00" : "$0.00"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Utility Bottom Navigation Bar / Info Panel */}
      <footer className="mt-5 border-t border-zinc-900 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xxs text-zinc-500">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
          <span>Native persistent access token valid</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Booking Link:</span>
          <a 
            href={account.bookingLink} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-400 hover:underline font-bold truncate max-w-[150px]"
          >
            {account.bookingLink}
          </a>
        </div>
      </footer>

    </div>
  );
}
