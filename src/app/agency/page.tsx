"use client";

import { useState, useEffect } from "react";
import { Preferences } from "@capacitor/preferences";

interface Business {
  id: string;
  email: string;
  businessName: string;
  assignedTwilioNum: string | null;
  bookingLink: string;
  role: string;
  subscriptionStatus: string;
  smsTemplate: string | null;
  createdAt: string;
}

interface CallLog {
  id: string;
  accountId: string;
  businessName: string;
  callerNumber: string;
  callStatus: string;
  smsSent: boolean;
  revenueSavedEst: number;
  timestamp: string;
}

interface SuperadminDashboardData {
  businesses: Business[];
  logs: CallLog[];
}

export default function AgencySuperadminPage() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Login form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Dashboard states
  const [dashboardData, setDashboardData] = useState<SuperadminDashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"subscriptions" | "telemetry">("subscriptions");

  // Filters
  const [statusFilter, setSubscriptionFilter] = useState("ALL");
  const [telemetryFilter, setTelemetryFilter] = useState("ALL");

  // Template configuration states
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [templateInput, setTemplateInput] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Check stored credentials on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const emailPref = await Preferences.get({ key: "userEmail" });
        const tokenPref = await Preferences.get({ key: "authToken" });

        if (emailPref.value && tokenPref.value) {
          setUserEmail(emailPref.value);
          setAuthToken(tokenPref.value);
        } else if (typeof window !== "undefined") {
          const localEmail = localStorage.getItem("userEmail");
          const localToken = localStorage.getItem("authToken");
          if (localEmail && localToken) {
            setUserEmail(localEmail);
            setAuthToken(localToken);
          }
        }
      } catch (err) {
        console.error("Session verification failed:", err);
      } finally {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, []);

  // Fetch superadmin dashboard data
  const fetchDashboard = async (tokenToUse = authToken) => {
    if (!tokenToUse) return;
    setLoadingDashboard(true);
    setDashboardError(null);
    try {
      const res = await fetch("/api/agency/dashboard", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${tokenToUse}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          handleLogout();
          throw new Error(data.error || "Session expired or access denied.");
        }
        throw new Error(data.error || "Failed to load admin metrics.");
      }
      setDashboardData(data);
    } catch (err: any) {
      console.error(err);
      setDashboardError(err.message || "Failed to synchronize superadmin dashboard.");
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchDashboard(authToken);
    }
  }, [authToken]);

  // Login submission
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login verification failed");
      }

      await Preferences.set({ key: "userEmail", value: data.account.email });
      await Preferences.set({ key: "authToken", value: data.token });
      if (typeof window !== "undefined") {
        localStorage.setItem("userEmail", data.account.email);
        localStorage.setItem("authToken", data.token);
      }

      setUserEmail(data.account.email);
      setAuthToken(data.token);
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || "Authentication failed. Try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Logout
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

  // Configure SMS Template
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBusiness || !authToken) return;

    setSavingTemplate(true);
    try {
      const res = await fetch("/api/agency/template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          accountId: editingBusiness.id,
          smsTemplate: templateInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to configure SMS Template.");
      } else {
        alert("SMS template updated successfully!");
        setEditingBusiness(null);
        fetchDashboard(authToken); // Refresh data
      }
    } catch (err) {
      console.error(err);
      alert("System error configuring SMS template.");
    } finally {
      setSavingTemplate(false);
    }
  };

  // Format phone number
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

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
        <p className="mt-4 text-zinc-400 text-sm font-medium">Authorizing secure session...</p>
      </div>
    );
  }

  // ==========================================
  // --- LOGIN INTERFACE ---
  // ==========================================
  if (!userEmail || !authToken) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6 selection:bg-emerald-500/30">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <span className="text-4xl block">🛡️</span>
            <h1 className="text-2xl font-black tracking-tight">Superadmin Login</h1>
            <p className="text-xs text-slate-400">
              Only authorized staff (Michael@bounceback-sms.com) can access global controls.
            </p>
          </div>

          {loginError && (
            <div className="bg-red-950/40 border border-red-900/60 p-3.5 rounded-xl text-xs text-red-400 leading-normal">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="michael@bounceback-sms.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-slate-700 font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-sm transition-all active:scale-95 shadow-md shadow-emerald-500/10"
            >
              {loginLoading ? "Verifying Access..." : "Secure Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // --- LOADING / ERROR INTERFACES ---
  // ==========================================
  if (loadingDashboard && !dashboardData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        <p className="mt-4 text-zinc-400 text-xs">Syncing master registry & global telemetry...</p>
      </div>
    );
  }

  if (dashboardError || !dashboardData) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6 text-center">
        <span className="text-4xl mb-3">⚠️</span>
        <h2 className="text-lg font-bold">Registry Sync Failure</h2>
        <p className="text-zinc-400 mt-2 text-sm max-w-xs">{dashboardError || "Dashboard failed to synchronize"}</p>
        <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => fetchDashboard(authToken)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-colors"
          >
            Retry Sync
          </button>
          <button
            onClick={handleLogout}
            className="w-full bg-slate-900 border border-slate-800 text-slate-400 py-3 px-4 rounded-xl text-sm transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const { businesses, logs } = dashboardData;

  // Filter accounts (excluding Superadmin)
  const filteredBusinesses = businesses.filter((b) => {
    if (b.role === "SUPERADMIN") return false;
    if (statusFilter === "ALL") return true;
    return b.subscriptionStatus.toUpperCase() === statusFilter.toUpperCase();
  });

  // Filter logs (global telemetries)
  const filteredLogs = logs.filter((log) => {
    if (telemetryFilter === "ALL") return true;
    if (telemetryFilter === "RESCUED") return log.smsSent;
    if (telemetryFilter === "NOSMS") return !log.smsSent;
    return true;
  });

  // Aggregated Stats
  const activeBusinesses = businesses.filter((b) => b.role !== "SUPERADMIN");
  const totalCalls = logs.length;
  const totalRescued = logs.filter((log) => log.smsSent).length;
  const globalRecoveryRate = totalCalls > 0 ? Math.round((totalRescued / totalCalls) * 100) : 100;
  const globalRevenueSaved = logs.reduce((sum, log) => sum + log.revenueSavedEst, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none selection:bg-emerald-500/30">
      
      {/* Header */}
      <nav className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <span className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                BounceBack <span className="text-emerald-500 font-extrabold">SMS</span> Registry
              </span>
              <span className="text-[10px] text-slate-500 block leading-none font-bold uppercase tracking-wider">
                Michael Console
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xxs px-2.5 py-1 rounded-md font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
              SUPERADMIN ACTIVE
            </span>
            <button
              onClick={handleLogout}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 font-extrabold text-xs py-2 px-4 rounded-xl transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-6">
        
        {/* Aggregated Global Stats Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between h-[105px] relative overflow-hidden shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Registered Clients</span>
            <div className="text-3xl font-black text-white">{activeBusinesses.length}</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between h-[105px] relative overflow-hidden shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Global Recovery Rate</span>
            <div className="text-3xl font-black text-emerald-400">{globalRecoveryRate}%</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between h-[105px] relative overflow-hidden shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Rescued Leads</span>
            <div className="text-3xl font-black text-blue-400">
              {totalRescued} <span className="text-xs text-slate-500 font-semibold font-sans">/ {totalCalls} calls</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between h-[105px] relative overflow-hidden shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Global Saved Revenue</span>
            <div className="text-3xl font-black text-yellow-400">${globalRevenueSaved.toLocaleString()}</div>
          </div>
        </section>

        {/* Tab Selection Navigation */}
        <div className="flex border-b border-slate-900 mb-6">
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all px-4 ${
              activeTab === "subscriptions"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            📋 Subscription Tracker ({activeBusinesses.length})
          </button>
          <button
            onClick={() => setActiveTab("telemetry")}
            className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all px-4 ${
              activeTab === "telemetry"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            📞 Global Missed Calls ({logs.length})
          </button>
        </div>

        {/* ==========================================
            --- TAB 1: SUBSCRIPTION TRACKER TABLE ---
            ========================================== */}
        {activeTab === "subscriptions" ? (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Monthly Subscription Summary
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filter:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setSubscriptionFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-semibold outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="TRIALING">Trialing</option>
                  <option value="PAST_DUE">Past Due</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            {/* Businesses Grid / Table */}
            {filteredBusinesses.length === 0 ? (
              <div className="bg-slate-900/20 border border-slate-900/60 rounded-2xl p-8 text-center text-slate-500 text-xs">
                No matching businesses found.
              </div>
            ) : (
              <div className="bg-slate-900/20 border border-slate-900 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-900 bg-slate-900/60 text-slate-500 font-extrabold uppercase tracking-wider">
                        <th className="py-3.5 px-4">Business Name</th>
                        <th className="py-3.5 px-4">Owner Email</th>
                        <th className="py-3.5 px-4">Line Status</th>
                        <th className="py-3.5 px-4">Subscription Status</th>
                        <th className="py-3.5 px-4">Registration Date</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-medium">
                      {filteredBusinesses.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-900/20 transition-colors">
                          <td className="py-4 px-4">
                            <span className="font-extrabold text-white block">{b.businessName}</span>
                            <span className="text-[10px] font-mono text-slate-500 block mt-0.5 select-all">
                              {formatPhone(b.assignedTwilioNum)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-300 font-semibold select-all">{b.email}</td>
                          <td className="py-4 px-4 font-mono select-all">
                            {b.assignedTwilioNum ? (
                              <span className="text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 border border-emerald-500/10 rounded">
                                Provisioned
                              </span>
                            ) : (
                              <span className="text-slate-500">Unassigned</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`px-2 py-1 rounded text-[9px] font-black border uppercase tracking-wider ${
                                b.subscriptionStatus === "active"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                                  : b.subscriptionStatus === "trialing"
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/25"
                                  : b.subscriptionStatus === "past_due"
                                  ? "bg-red-500/10 text-red-400 border-red-500/25 animate-pulse"
                                  : "bg-slate-800 text-slate-400 border-slate-700/50"
                              }`}
                            >
                              {b.subscriptionStatus}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-400">
                            {new Date(b.createdAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => {
                                setEditingBusiness(b);
                                setTemplateInput(b.smsTemplate || "");
                              }}
                              className="bg-slate-900 hover:bg-emerald-600 hover:text-slate-950 hover:border-transparent text-emerald-400 border border-slate-800 font-extrabold text-[10px] py-1.5 px-3 rounded-xl transition-all"
                            >
                              💬 Config Text-Back
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ==========================================
              --- TAB 2: GLOBAL LEAD MONITORING ---
              ========================================== */
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Aggregated Incoming Call Telemetry
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filter:</span>
                <select
                  value={telemetryFilter}
                  onChange={(e) => setTelemetryFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-semibold outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Call Logs</option>
                  <option value="RESCUED">Rescued Only</option>
                  <option value="NOSMS">No SMS Only</option>
                </select>
              </div>
            </div>

            {/* Logs List */}
            {filteredLogs.length === 0 ? (
              <div className="bg-slate-900/20 border border-slate-900/60 rounded-2xl p-8 text-center text-slate-500 text-xs">
                No missed calls recorded matching this filter.
              </div>
            ) : (
              <div className="bg-slate-900/20 border border-slate-900 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-900 bg-slate-900/60 text-slate-500 font-extrabold uppercase tracking-wider">
                        <th className="py-3.5 px-4">Business</th>
                        <th className="py-3.5 px-4">Caller Number</th>
                        <th className="py-3.5 px-4">SMS Status</th>
                        <th className="py-3.5 px-4">Revenue Saved</th>
                        <th className="py-3.5 px-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-medium">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-900/20 transition-colors">
                          <td className="py-4 px-4 font-extrabold text-white">{log.businessName}</td>
                          <td className="py-4 px-4 font-mono font-bold select-all text-slate-300">
                            {formatPhone(log.callerNumber)}
                          </td>
                          <td className="py-4 px-4">
                            {log.smsSent ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                                Rescued
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black bg-slate-800 text-slate-400 border border-slate-700/50 uppercase tracking-wider">
                                No SMS
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 font-mono font-extrabold text-slate-200">
                            {log.smsSent ? "+$60.00" : "$0.00"}
                          </td>
                          <td className="py-4 px-4 text-slate-400">
                            {new Date(log.timestamp).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ==========================================
          --- CONFIG TEMPLATE POPUP MODAL ---
          ========================================== */}
      {editingBusiness && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setEditingBusiness(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 font-extrabold text-sm h-8 w-8 rounded-full bg-slate-950 flex items-center justify-center border border-slate-800"
            >
              ✕
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">Configure SMS Text-Back</h3>
              <p className="text-xxs text-slate-500 font-bold uppercase tracking-wider">
                Client: {editingBusiness.businessName} ({editingBusiness.email})
              </p>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Custom SMS Dispatch Template
                </label>
                <textarea
                  required
                  placeholder="e.g. Hi, we missed your call. Securing your booking is easy! Tap our Calendly link: {booking_link}"
                  value={templateInput}
                  onChange={(e) => setTemplateInput(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-2xl p-4 text-xs text-slate-200 outline-none resize-none font-medium placeholder-slate-600 leading-normal"
                />
                <span className="text-[10px] text-slate-500 block leading-relaxed font-semibold">
                  💡 Use the placeholder <span className="font-mono text-emerald-400 font-black">{`{booking_link}`}</span> to dynamically insert this client's booking calendar url (<span className="text-blue-400 underline">{editingBusiness.bookingLink}</span>).
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBusiness(null)}
                  className="flex-1 bg-slate-950 hover:bg-slate-850 text-slate-300 py-3 rounded-xl text-xs font-bold transition-all active:scale-95 border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTemplate}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3 rounded-xl text-xs font-black transition-all active:scale-95 shadow-lg shadow-emerald-500/10"
                >
                  {savingTemplate ? "Saving Configuration..." : "Apply Configured Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
