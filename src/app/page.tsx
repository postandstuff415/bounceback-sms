"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Login states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Dashboard states
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // GDPR Actions state
  const [gdprMessage, setGdprMessage] = useState<string | null>(null);
  const [gdprError, setGdprError] = useState<string | null>(null);
  const [gdprLoading, setGdprLoading] = useState(false);

  // Check stored credentials on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const emailPref = await Preferences.get({ key: "userEmail" });
        const tokenPref = await Preferences.get({ key: "authToken" });

        if (emailPref.value && tokenPref.value) {
          setUserEmail(emailPref.value);
          setAuthToken(tokenPref.value);
        } else {
          // Fallback to localStorage
          if (typeof window !== "undefined") {
            const localEmail = localStorage.getItem("userEmail");
            const localToken = localStorage.getItem("authToken");
            if (localEmail && localToken) {
              setUserEmail(localEmail);
              setAuthToken(localToken);
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

  // Fetch dashboard data when userEmail/authToken are set
  useEffect(() => {
    if (!userEmail || !authToken) return;

    const fetchDashboard = async (showRefresher = false) => {
      if (showRefresher) setIsRefreshing(true);
      else setDashboardLoading(true);
      setDashboardError(null);

      try {
        const res = await fetch("/api/dashboard", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${authToken}`,
          },
        });
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 401) {
            // Unauthorized/expired token, force logout
            handleLogout();
            throw new Error("Session expired. Please sign in again.");
          }
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
  }, [userEmail, authToken]);

  // Handle manual dashboard refresh
  const handleRefresh = async () => {
    if (!userEmail || !authToken || dashboardLoading || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/dashboard", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setDashboardData(data);
      } else if (res.status === 401) {
        handleLogout();
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
      await Preferences.set({ key: "authToken", value: data.token });
      if (typeof window !== "undefined") {
        localStorage.setItem("userEmail", data.account.email);
        localStorage.setItem("authToken", data.token);
      }
      setUserEmail(data.account.email);
      setAuthToken(data.token);
      setIsLoginModalOpen(false);
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
      await Preferences.set({ key: "authToken", value: data.token });
      if (typeof window !== "undefined") {
        localStorage.setItem("userEmail", data.account.email);
        localStorage.setItem("authToken", data.token);
      }
      setUserEmail(data.account.email);
      setAuthToken(data.token);
      setIsLoginModalOpen(false);
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
      await Preferences.remove({ key: "authToken" });
      if (typeof window !== "undefined") {
        localStorage.removeItem("userEmail");
        localStorage.removeItem("authToken");
      }
      setUserEmail(null);
      setAuthToken(null);
      setDashboardData(null);
      setLoginEmail("");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // GDPR: Right to Erasure (Delete Account)
  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to permanently delete your account and all associated data in accordance with GDPR Article 17 (Right to Erasure)? This action cannot be undone.")) {
      return;
    }

    setGdprLoading(true);
    setGdprError(null);
    setGdprMessage(null);

    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to request account erasure");
      }

      alert(data.message || "Account successfully deleted.");
      handleLogout();
    } catch (err: any) {
      console.error(err);
      setGdprError(err.message || "An error occurred during account deletion.");
    } finally {
      setGdprLoading(false);
    }
  };

  // GDPR: Right to Portability (Download Data)
  const handleDownloadData = async () => {
    setGdprLoading(true);
    setGdprError(null);
    setGdprMessage(null);

    try {
      const res = await fetch("/api/account/delete", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to export portability data");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bounceback_sms_data_${userEmail}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setGdprMessage("Your telemetry archive has been compiled and downloaded successfully (GDPR Article 20).");
    } catch (err: any) {
      console.error(err);
      setGdprError(err.message || "An error occurred during data export.");
    } finally {
      setGdprLoading(false);
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
        <p className="mt-4 text-zinc-400 text-sm font-medium">Launching Persistent Mobile Console...</p>
      </div>
    );
  }

  // ==========================================
  // --- CASE A: RENDER DYNAMIC DASHBOARD ---
  // ==========================================
  if (userEmail && authToken) {
    if (dashboardLoading && !dashboardData) {
      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          <p className="mt-4 text-zinc-400 text-xs">Syncing real-time call telemetry...</p>
        </div>
      );
    }

    if (dashboardError || !dashboardData) {
      return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-center items-center p-6 text-center pt-[calc(env(safe-area-inset-top)+2rem)]">
          <span className="text-4xl mb-3">⚠️</span>
          <h2 className="text-lg font-bold text-zinc-200">Sync Fail</h2>
          <p className="text-zinc-400 mt-2 text-sm max-w-xs">{dashboardError || "Dashboard failed to synchronize"}</p>
          <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => handleRefresh()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-colors"
            >
              Retry Sync
            </button>
            <button
              onClick={handleLogout}
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-400 py-3 px-4 rounded-xl text-sm transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      );
    }

    const { account, metrics, logs } = dashboardData;

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

        {/* Main Dashboard Content */}
        <main className="flex-1 overflow-y-auto space-y-5">
          
          {/* Twilio Numbers Setup */}
          <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 flex flex-col sm:flex-row justify-between gap-3 shadow-sm">
            <div className="space-y-1">
              <span className="block text-xxs font-semibold text-zinc-500 uppercase tracking-widest">
                My Twilio Recovery Line
              </span>
              <span className="block text-base font-mono font-extrabold text-emerald-400 select-all">
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

          {/* Stats Cards */}
          <section className="grid grid-cols-2 gap-4">
            
            <div className="bg-zinc-900/60 border border-zinc-850 rounded-3xl p-4 flex flex-col justify-between h-[140px] shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 h-20 w-20 bg-emerald-500/5 rounded-full blur-2xl"></div>
              <div className="flex items-center justify-between">
                <span className="text-xxs font-bold text-zinc-400 uppercase tracking-widest">Recovery Rate</span>
                <span className="text-lg">📈</span>
              </div>
              <div>
                <div className="text-3xl font-black text-emerald-400 tracking-tight leading-none mb-1">
                  {metrics.recoveryRate}%
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${metrics.recoveryRate}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-850 rounded-3xl p-4 flex flex-col justify-between h-[140px] shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 h-20 w-20 bg-blue-500/5 rounded-full blur-2xl"></div>
              <div className="flex items-center justify-between">
                <span className="text-xxs font-bold text-zinc-400 uppercase tracking-widest">Revenue Saved</span>
                <span className="text-lg">💰</span>
              </div>
              <div>
                <div className="text-2xl font-black text-blue-400 tracking-tight leading-none">
                  ${metrics.totalRevenueSaved.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-zinc-500 font-medium mt-1 leading-normal">
                  Estimated at $60 per intercept
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-sm text-emerald-400">
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

            <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-sm text-amber-400">
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

          {/* Telemetry Logs */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest">
                Live Call Telemetry ({logs.length})
              </h3>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold active:scale-95 transition-all p-1 h-[28px] ${
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 6.57l-4.11-1.37" />
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

          {/* GDPR Controls Panel */}
          <section className="bg-zinc-900/40 border border-zinc-900 rounded-3xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-zinc-200">GDPR Compliance & Erasure</h3>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                In compliance with the General Data Protection Regulation (GDPR), you can exercise your Right to Portability (exporting your telemetry) and Right to be Forgotten (complete database anonymization).
              </p>
            </div>

            {gdprMessage && (
              <div className="bg-emerald-950/30 border border-emerald-800 text-emerald-300 p-3 rounded-xl text-xs leading-normal">
                {gdprMessage}
              </div>
            )}
            {gdprError && (
              <div className="bg-red-950/30 border border-red-800 text-red-300 p-3 rounded-xl text-xs leading-normal">
                {gdprError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDownloadData}
                disabled={gdprLoading}
                className="flex-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-100 py-3 px-4 rounded-xl text-xs font-bold transition-all border border-zinc-800 flex items-center justify-center gap-2 h-[44px]"
              >
                📥 Export My Data (JSON)
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={gdprLoading}
                className="flex-1 bg-red-950/20 hover:bg-red-950/40 text-red-400 py-3 px-4 rounded-xl text-xs font-bold transition-all border border-red-900/40 flex items-center justify-center gap-2 h-[44px]"
              >
                ⚠️ Delete Account & Data
              </button>
            </div>
          </section>

        </main>

        {/* Bottom Nav Bar / Footer */}
        <footer className="mt-5 border-t border-zinc-900 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xxs text-zinc-500">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            <span>Security hardened auth session active</span>
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

  // ==========================================
  // --- CASE B: RENDER CORE B2B LANDING PAGE ---
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-emerald-500/30">
      
      {/* Header Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📲</span>
            <span className="text-xl font-bold tracking-tight text-white">
              BounceBack <span className="text-emerald-500 font-extrabold">SMS</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsLoginModalOpen(true)} 
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Login
            </button>
            <Link 
              href="/onboard" 
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-600/20"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-emerald-500/10 to-transparent opacity-50 blur-3xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 mb-8 animate-fade-in">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Revenue Recovery Active</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-8 leading-[1.1]">
            A Missed Call is a Customer Calling Your <span className="bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">Competitor.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-400 mb-10 leading-relaxed max-w-3xl mx-auto">
            Don't let a busy line or an unanswered phone drain your revenue. BounceBack SMS intercepts missed calls the exact second they happen, automatically texts the customer a custom booking link, and locks in the job before they move down the Google Maps list.
          </p>

          <div className="flex flex-col items-center gap-4">
            <Link 
              href="/onboard" 
              className="group relative inline-flex items-center justify-center bg-emerald-500 text-slate-950 px-10 py-5 rounded-2xl text-xl font-black transition-all hover:bg-emerald-400 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(16,185,129,0.3)]"
            >
              Get Started for $0
              <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <p className="text-sm text-slate-500 font-medium italic">
              First 100 Leads Free • No credit card required • 2-minute setup
            </p>
          </div>
        </div>
      </section>

      {/* Before & After Comparison */}
      <section className="py-24 px-4 bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Stop the Leak in Your Pipeline</h2>
            <p className="text-slate-400">See how BounceBack SMS changes your business flow instantly.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* The Old Way */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl rounded-full" />
              <h3 className="text-xl font-bold text-rose-500 uppercase tracking-widest mb-8 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                The Old Way - Loss
              </h3>
              <ul className="space-y-6">
                {[
                  "Customer calls your business.",
                  "You are stuck on a job or driving and miss the call.",
                  "Customer hangs up, clicks the next listing on Google, and pays your competitor."
                ].map((item, i) => (
                  <li key={i} className="flex gap-4 items-start text-slate-300">
                    <span className="text-rose-500 mt-1">🔴</span>
                    <span className="text-lg leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* The BounceBack Way */}
            <div className="bg-slate-950 border-2 border-emerald-500/50 rounded-3xl p-8 relative overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.1)]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />
              <h3 className="text-xl font-bold text-emerald-500 uppercase tracking-widest mb-8 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                The BounceBack Way - Win
              </h3>
              <ul className="space-y-6">
                {[
                  "Customer calls your business.",
                  "You miss the call, but BounceBack instantly sends a friendly text message within 3 seconds.",
                  "AI says: \"Hey, sorry we missed you! Click here to grab an open slot on our schedule.\"",
                  "Job booked. Revenue secured."
                ].map((item, i) => (
                  <li key={i} className="flex gap-4 items-start text-emerald-50">
                    <span className="text-emerald-500 mt-1">🟢</span>
                    <span className="text-lg leading-snug font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl hover:border-emerald-500/30 transition-all">
              <div className="text-4xl mb-6">⚡</div>
              <h4 className="text-xl font-bold mb-4">Instant 3-Second Response</h4>
              <p className="text-slate-400 leading-relaxed">Text drops immediately while the lead is burning hot. No waiting, no thinking, just action.</p>
            </div>
            <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl hover:border-emerald-500/30 transition-all">
              <div className="text-4xl mb-6">📅</div>
              <h4 className="text-xl font-bold mb-4">Smart Booking Integration</h4>
              <p className="text-slate-400 leading-relaxed">Links directly to your existing scheduler: Calendly, ServiceTitan, Jobber, or Housecall Pro.</p>
            </div>
            <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl hover:border-emerald-500/30 transition-all">
              <div className="text-4xl mb-6">📊</div>
              <h4 className="text-xl font-bold mb-4">ROI Tracking Dashboard</h4>
              <p className="text-slate-400 leading-relaxed">See exactly how many missed calls were recovered and how much money went straight back to you.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-4 bg-emerald-600/5">
        <div className="max-w-xl mx-auto">
          <div className="bg-slate-900 border-2 border-emerald-500/30 rounded-[40px] p-8 md:p-12 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/20 blur-3xl rounded-full" />
            
            <h2 className="text-2xl font-bold text-emerald-400 uppercase tracking-widest mb-6">
              The Small Business Growth Plan
            </h2>
            
            <div className="mb-10">
              <div className="text-5xl md:text-7xl font-black text-white mb-2">$0 <span className="text-2xl text-slate-500 font-normal">Upfront</span></div>
              <div className="text-xl text-slate-300 font-medium">then $19.99/mo</div>
            </div>

            <ul className="text-left space-y-4 mb-12 max-w-sm mx-auto">
              {[
                "First 100 recovered leads 100% Free",
                "Instant SMS automation engine",
                "Custom local phone number tracking",
                "24/7/365 AI FrontDesk Triage",
                "Cancel anytime. No long-term contracts."
              ].map((item, i) => (
                <li key={i} className="flex gap-3 items-center text-slate-300">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span className="text-lg">{item}</span>
                </li>
              ))}
            </ul>

            <Link 
              href="/onboard" 
              className="block w-full bg-emerald-500 text-slate-950 py-5 rounded-2xl text-xl font-black transition-all hover:bg-emerald-400 hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20 animate-pulse"
            >
              Activate Your Free Account Now
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-900 px-4 text-center">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} BounceBack SMS. Built for businesses that never want to miss a lead again.
          </p>
          <div className="flex gap-6 text-sm text-slate-400">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>

      {/* ==========================================
          --- SIGN IN MODAL OVERLAY ---
          ========================================== */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative animate-fade-in text-white">
            <button 
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer text-xl p-1"
            >
              ✕
            </button>
            
            <div className="text-center mb-6">
              <span className="text-4xl inline-block mb-2">📲</span>
              <h3 className="text-2xl font-bold tracking-tight">Access Mobile Console</h3>
              <p className="text-slate-400 text-xs mt-1">Sign in with your subscriber credentials</p>
            </div>

            {loginError && (
              <div className="mb-4 bg-red-950/40 border border-red-800 text-red-200 text-xs p-3.5 rounded-xl">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Account Email Address
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="owner@yourdomain.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm placeholder-slate-600 h-[48px]"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 active:scale-98 transition-all text-slate-950 font-black py-3.5 px-4 rounded-xl text-sm shadow-lg h-[48px] disabled:opacity-50"
              >
                {loginLoading ? (
                  <div className="h-5 w-5 border-2 border-slate-950/30 border-b-2 border-b-slate-950 rounded-full animate-spin"></div>
                ) : (
                  "Access Console"
                )}
              </button>
            </form>

            <div className="relative my-6 flex items-center justify-center">
              <div className="border-t border-slate-800 w-full"></div>
              <span className="bg-slate-900 px-3 text-[10px] uppercase tracking-widest text-slate-500 absolute">
                Quick Demo
              </span>
            </div>

            <div className="space-y-2 text-center">
              <p className="text-slate-500 text-[10px] leading-relaxed">
                No account? Try the pre-seeded active plumber test dashboard instantly:
              </p>
              <button
                onClick={() => handleQuickDemo("test@example.com")}
                className="w-full text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 py-3 rounded-xl border border-emerald-500/30 active:scale-98 transition-all flex items-center justify-center gap-2 h-[48px]"
              >
                🪠 Tap to Demo Test Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
