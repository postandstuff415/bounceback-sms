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

interface LeadActivity {
  id: string;
  ticketId: string;
  activityType: string;
  content: string;
  createdAt: string;
}

interface Lead {
  id: string;
  customerName: string;
  customerPhone: string;
  emergencyIssue: string;
  issueSummary: string | null;
  computedUrgency: string;
  status: 'NEW' | 'QUOTED' | 'BOOKED' | 'LOST';
  notes: string | null;
  activities: LeadActivity[];
  createdAt: string;
}

interface AgencySubAccount {
  id: string;
  email: string;
  businessName: string;
  realPhoneNumber: string;
  assignedTwilioNum: string | null;
  bookingLink: string;
  subscriptionStatus: string;
  aiFrontDeskEnabled: boolean;
  createdAt: string;
  metrics: {
    recoveryRate: number;
    totalRevenueSaved: number;
    leadsRescued: number;
    missedCalls: number;
  };
}

interface AgencyData {
  agency: {
    id: string;
    businessName: string;
    email: string;
    customLogoUrl: string | null;
    customBrandColor: string | null;
  };
  subAccounts: AgencySubAccount[];
  metrics: {
    recoveryRate: number;
    totalRevenueSaved: number;
    leadsRescued: number;
    missedCalls: number;
  };
}

interface DashboardData {
  account: AccountDetails & { role?: string };
  metrics: {
    recoveryRate: number;
    totalRevenueSaved: number;
    leadsRescued: number;
    missedCalls: number;
  };
  logs: CallLog[];
  leads: Lead[];
  whiteLabel?: {
    logoUrl: string | null;
    brandColor: string | null;
    agencyName: string;
  } | null;
}

export default function Home() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Login states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginInfo, setLoginInfo] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Dashboard states
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // CRM & Tab states
  const [activeSection, setActiveSection] = useState<'crm' | 'telemetry'>('crm');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>({});

  // GDPR Actions state
  const [gdprMessage, setGdprMessage] = useState<string | null>(null);
  const [gdprError, setGdprError] = useState<string | null>(null);
  const [gdprLoading, setGdprLoading] = useState(false);

  // Agency state variables
  const [agencyData, setAgencyData] = useState<AgencyData | null>(null);
  const [agencyLoading, setAgencyLoading] = useState(false);
  const [agencyError, setAgencyError] = useState<string | null>(null);

  // White-label settings state
  const [logoUrlInput, setLogoUrlInput] = useState("");
  const [brandColorInput, setBrandColorInput] = useState("");
  const [isSavingWhiteLabel, setIsSavingWhiteLabel] = useState(false);

  // Add sub-account modal state
  const [isAddSubModalOpen, setIsAddSubModalOpen] = useState(false);
  const [newSubEmail, setNewSubEmail] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newSubPhone, setNewSubPhone] = useState("");
  const [newSubBooking, setNewSubBooking] = useState("");
  const [addSubError, setAddSubError] = useState<string | null>(null);
  const [addSubLoading, setAddSubLoading] = useState(false);

  // Impersonating sub-account dashboard state
  const [selectedSubAccountEmail, setSelectedSubAccountEmail] = useState<string | null>(null);
  const [subAccountDashboardData, setSubAccountDashboardData] = useState<DashboardData | null>(null);
  const [subAccountDashboardLoading, setSubAccountDashboardLoading] = useState(false);

  // ROI Calculator states
  const [avgJobVal, setAvgJobVal] = useState(150);
  const [missedCallsPerWeek, setMissedCallsPerWeek] = useState(5);
  const [closeRate, setCloseRate] = useState(30);

  // FAQ states
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Check stored credentials on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // 1. Magic-link callback: /api/auth/verify redirects here with the
        // freshly-minted session token in the URL. Capture it, persist it,
        // then strip it from the address bar.
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const urlToken = params.get("authToken");
          const urlEmail = params.get("email");
          if (urlToken && urlEmail) {
            await Preferences.set({ key: "userEmail", value: urlEmail });
            await Preferences.set({ key: "authToken", value: urlToken });
            localStorage.setItem("userEmail", urlEmail);
            localStorage.setItem("authToken", urlToken);
            setUserEmail(urlEmail);
            setAuthToken(urlToken);
            window.history.replaceState({}, "", window.location.pathname);
            setCheckingSession(false);
            return;
          }
        }

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

  // Fetch agency data when user role is AGENCY
  useEffect(() => {
    if (!dashboardData || dashboardData.account.role !== "AGENCY" || !authToken) return;

    const fetchAgencyData = async () => {
      setAgencyLoading(true);
      setAgencyError(null);
      try {
        const res = await fetch("/api/agency/dashboard", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${authToken}`,
          },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load agency dashboard");
        }
        setAgencyData(data);
        // Initialize input fields with fetched white-label configuration
        setLogoUrlInput(data.agency.customLogoUrl || "");
        setBrandColorInput(data.agency.customBrandColor || "#10B981");
      } catch (err: any) {
        console.error(err);
        setAgencyError(err.message || "Failed to load agency metrics.");
      } finally {
        setAgencyLoading(false);
      }
    };

    fetchAgencyData();
  }, [dashboardData, authToken]);

  // Save white-label settings
  const handleSaveWhiteLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;

    setIsSavingWhiteLabel(true);
    try {
      const res = await fetch("/api/agency/white-label", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          customLogoUrl: logoUrlInput.trim() || null,
          customBrandColor: brandColorInput.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save branding configuration.");
      } else {
        alert("White-label branding settings updated!");
        // Refresh agency data
        if (agencyData) {
          setAgencyData({
            ...agencyData,
            agency: {
              ...agencyData.agency,
              customLogoUrl: data.whiteLabel.customLogoUrl,
              customBrandColor: data.whiteLabel.customBrandColor,
            },
          });
        }
        // Force refresh local dashboard to update logo/color in active session
        handleRefresh();
      }
    } catch (err) {
      console.error(err);
      alert("System error saving branding configuration.");
    } finally {
      setIsSavingWhiteLabel(false);
    }
  };

  // Add a new client sub-account
  const handleAddSubAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;

    if (!newSubEmail || !newSubName || !newSubPhone || !newSubBooking) {
      setAddSubError("Please fill out all required fields.");
      return;
    }

    setAddSubLoading(true);
    setAddSubError(null);
    try {
      const res = await fetch("/api/agency/sub-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          email: newSubEmail.trim(),
          businessName: newSubName.trim(),
          realPhoneNumber: newSubPhone.trim(),
          bookingLink: newSubBooking.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddSubError(data.error || "Failed to create client sub-account.");
      } else {
        alert("Client sub-account provisioned successfully!");
        setIsAddSubModalOpen(false);
        // Reset form fields
        setNewSubEmail("");
        setNewSubName("");
        setNewSubPhone("");
        setNewSubBooking("");
        // Refresh agency data
        const refreshRes = await fetch("/api/agency/dashboard", {
          headers: { "Authorization": `Bearer ${authToken}` }
        });
        const refreshData = await refreshRes.json();
        if (refreshRes.ok) {
          setAgencyData(refreshData);
        }
      }
    } catch (err) {
      console.error(err);
      setAddSubError("System error provisioning client sub-account.");
    } finally {
      setAddSubLoading(false);
    }
  };

  // Delete sub-account
  const handleDeleteSubAccount = async (subId: string, subName: string) => {
    if (!confirm(`Are you sure you want to permanently delete client sub-account "${subName}"? All lead history and logs will be lost forever.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/agency/sub-accounts?id=${subId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete sub-account");
      } else {
        alert(data.message || "Sub-account deleted.");
        // Refresh agency dashboard
        const refreshRes = await fetch("/api/agency/dashboard", {
          headers: { "Authorization": `Bearer ${authToken}` }
        });
        const refreshData = await refreshRes.json();
        if (refreshRes.ok) {
          setAgencyData(refreshData);
        }
      }
    } catch (err) {
      console.error(err);
      alert("System error deleting sub-account.");
    }
  };

  // Fetch impersonated sub-account dashboard details
  useEffect(() => {
    if (!selectedSubAccountEmail || !authToken) {
      setSubAccountDashboardData(null);
      return;
    }

    const fetchSubAccountDashboard = async () => {
      setSubAccountDashboardLoading(true);
      try {
        const res = await fetch(`/api/dashboard?email=${encodeURIComponent(selectedSubAccountEmail)}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${authToken}`,
          },
        });
        const data = await res.json();
        if (res.ok) {
          setSubAccountDashboardData(data);
        } else {
          alert(data.error || "Failed to load sub-account dashboard");
          setSelectedSubAccountEmail(null);
        }
      } catch (err) {
        console.error(err);
        alert("Failed to load sub-account dashboard due to network error.");
        setSelectedSubAccountEmail(null);
      } finally {
        setSubAccountDashboardLoading(false);
      }
    };

    fetchSubAccountDashboard();
  }, [selectedSubAccountEmail, authToken]);

  // Export leads to JSON/CSV for follow-up marketing
  const handleExport = (format: 'json' | 'csv') => {
    const leadsToExport = dashboardData?.leads || [];
    
    const filtered = leadsToExport.filter(lead => {
      const statusMatch = filterStatus === 'ALL' || lead.status === filterStatus;
      const urgencyMatch = filterUrgency === 'ALL' || lead.computedUrgency === filterUrgency;
      return statusMatch && urgencyMatch;
    });

    if (format === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filtered, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `bounceback_leads_${filterStatus}_${filterUrgency}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      const headers = ["ID", "Name", "Phone", "Original Issue", "AI Summary", "Urgency", "Status", "Notes", "Created At"];
      const rows = filtered.map(lead => [
        lead.id,
        lead.customerName,
        lead.customerPhone,
        `"${lead.emergencyIssue.replace(/"/g, '""')}"`,
        `"${(lead.issueSummary || '').replace(/"/g, '""')}"`,
        lead.computedUrgency,
        lead.status,
        `"${(lead.notes || '').replace(/"/g, '""')}"`,
        lead.createdAt
      ]);
      
      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", encodeURI(csvContent));
      downloadAnchor.setAttribute("download", `bounceback_leads_${filterStatus}_${filterUrgency}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  };

  // Update lead status/notes in real-time
  const handleUpdateLead = async (ticketId: string, status?: string, notes?: string) => {
    setUpdatingLeadId(ticketId);
    try {
      const res = await fetch("/api/leads/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({ ticketId, status, notes }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update lead");
      } else {
        setDashboardData(prev => {
          if (!prev) return null;
          const updatedLeads = (prev.leads || []).map(lead => {
            if (lead.id === ticketId) {
              const updatedActivities = [...lead.activities];
              if (status && status !== lead.status) {
                updatedActivities.push({
                  id: Math.random().toString(),
                  ticketId,
                  activityType: "STATUS_CHANGED",
                  content: `Lead status updated from ${lead.status} to ${status}.`,
                  createdAt: new Date().toISOString()
                });
              }
              if (notes !== undefined && notes !== lead.notes) {
                updatedActivities.push({
                  id: Math.random().toString(),
                  ticketId,
                  activityType: "NOTE_ADDED",
                  content: "Internal notes updated.",
                  createdAt: new Date().toISOString()
                });
              }
              return {
                ...lead,
                status: (status as any) || lead.status,
                notes: notes !== undefined ? notes : lead.notes,
                activities: updatedActivities
              };
            }
            return lead;
          });
          return {
            ...prev,
            leads: updatedLeads
          };
        });
      }
    } catch (err) {
      console.error(err);
      alert("System error updating lead.");
    } finally {
      setUpdatingLeadId(null);
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
    setLoginInfo(null);

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

      // Production: a secure sign-in link was emailed. No token is returned —
      // the session is established when the user clicks the link.
      if (data.magicLink || !data.token) {
        setLoginInfo(
          data.message || "Check your email for a secure sign-in link."
        );
        return;
      }

      // Non-production / instant login: store session immediately.
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
      // Quick demo relies on instant login (non-production). If the server is
      // in magic-link mode, there's no token to store — inform the user.
      if (data.magicLink || !data.token) {
        setLoginInfo(
          data.message || "Check your email for a secure sign-in link."
        );
        return;
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
              {account.subscriptionStatus === "trialing" ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider animate-pulse">
                  14-Day Free Trial
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                  Active
                </span>
              )}
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

          {/* Trial / Refund Guarantee Status Banner */}
          <div className="bg-gradient-to-r from-emerald-950/20 to-teal-950/20 border border-emerald-900/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛡️</span>
              <div className="space-y-0.5">
                <span className="block font-bold text-zinc-200">
                  {account.subscriptionStatus === "trialing" ? "14-Day Free Trial Active" : "100% Risk-Free Guarantee Active"}
                </span>
                <span className="block text-zinc-400 leading-normal">
                  {account.subscriptionStatus === "trialing" ? (
                    "Your first 14 days are completely free. You are covered by our 100% first-month refund guarantee."
                  ) : (
                    "Your subscription is active. Covered by our 100% first-month refund guarantee if no leads provide value."
                  )}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xxs uppercase tracking-widest text-emerald-400 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                $29.99/mo Plan
              </span>
            </div>
          </div>
          
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

          {/* Section Selector Tabs */}
          <div className="flex border-b border-zinc-900 mt-2 mb-4">
            <button
              onClick={() => setActiveSection('crm')}
              className={`flex-1 pb-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all ${
                activeSection === 'crm' 
                  ? 'border-emerald-500 text-emerald-400 font-black' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              💼 Rescued Leads CRM ({dashboardData.leads?.length || 0})
            </button>
            <button
              onClick={() => setActiveSection('telemetry')}
              className={`flex-1 pb-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all ${
                activeSection === 'telemetry' 
                  ? 'border-emerald-500 text-emerald-400 font-black' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              📞 Call Telemetry ({logs.length})
            </button>
          </div>

          {activeSection === 'crm' ? (
            <section className="space-y-4">
              {/* Filter & Export Bar */}
              <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between gap-3 items-center">
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {/* Status Filter */}
                    <div className="space-y-1 w-[48%] sm:w-auto">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-zinc-300 outline-none focus:border-emerald-500/50 w-full"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="NEW">New</option>
                        <option value="QUOTED">Quoted</option>
                        <option value="BOOKED">Booked</option>
                        <option value="LOST">Lost</option>
                      </select>
                    </div>

                    {/* Urgency Filter */}
                    <div className="space-y-1 w-[48%] sm:w-auto">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Urgency</label>
                      <select
                        value={filterUrgency}
                        onChange={(e) => setFilterUrgency(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-zinc-300 outline-none focus:border-emerald-500/50 w-full"
                      >
                        <option value="ALL">All Urgencies</option>
                        <option value="CRITICAL">Critical</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </select>
                    </div>
                  </div>

                  {/* Export Options */}
                  <div className="flex gap-2 w-full sm:w-auto justify-end sm:justify-start">
                    <button
                      onClick={() => handleExport('csv')}
                      className="px-3 py-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      📥 CSV Export
                    </button>
                    <button
                      onClick={() => handleExport('json')}
                      className="px-3 py-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      📦 JSON Export
                    </button>
                  </div>
                </div>
              </div>

              {/* Leads List */}
              {(!dashboardData.leads || dashboardData.leads.filter(lead => {
                const statusMatch = filterStatus === 'ALL' || lead.status === filterStatus;
                const urgencyMatch = filterUrgency === 'ALL' || lead.computedUrgency === filterUrgency;
                return statusMatch && urgencyMatch;
              }).length === 0) ? (
                <div className="bg-zinc-900/20 border border-zinc-900/60 rounded-2xl p-8 text-center text-zinc-500 text-xs">
                  <span className="text-xl block mb-2">📥</span>
                  No matching leads found in CRM.
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData.leads.filter(lead => {
                    const statusMatch = filterStatus === 'ALL' || lead.status === filterStatus;
                    const urgencyMatch = filterUrgency === 'ALL' || lead.computedUrgency === filterUrgency;
                    return statusMatch && urgencyMatch;
                  }).map(lead => (
                    <div 
                      key={lead.id}
                      className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4 space-y-4 shadow-sm"
                    >
                      {/* Top Row: Name, Phone & Status selector */}
                      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:items-center">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-zinc-100 flex items-center gap-2">
                            <span>{lead.customerName}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border uppercase tracking-wider ${
                              lead.computedUrgency === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              lead.computedUrgency === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                              lead.computedUrgency === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                              'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                              {lead.computedUrgency}
                            </span>
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-zinc-400 select-all">{formatPhone(lead.customerPhone)}</span>
                            <a 
                              href={`tel:${lead.customerPhone}`}
                              className="text-emerald-400 hover:text-emerald-300 text-xs font-bold"
                            >
                              📞 Call
                            </a>
                          </div>
                        </div>

                        {/* Status dropdown selector */}
                        <div className="space-y-1 shrink-0">
                          <span className="block text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest sm:text-right">Lead Status</span>
                          <select
                            value={lead.status}
                            disabled={updatingLeadId === lead.id}
                            onChange={(e) => handleUpdateLead(lead.id, e.target.value)}
                            className={`rounded-xl px-2.5 py-1 text-xs font-extrabold outline-none w-full sm:w-[120px] transition-all cursor-pointer ${
                              lead.status === 'BOOKED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35' :
                              lead.status === 'QUOTED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/35' :
                              lead.status === 'LOST' ? 'bg-zinc-800 text-zinc-400 border border-zinc-700/50' :
                              'bg-amber-500/20 text-amber-400 border border-amber-500/35'
                            }`}
                          >
                            <option value="NEW" className="bg-zinc-950 text-white">NEW</option>
                            <option value="QUOTED" className="bg-zinc-950 text-white">QUOTED</option>
                            <option value="BOOKED" className="bg-zinc-950 text-white">BOOKED</option>
                            <option value="LOST" className="bg-zinc-950 text-white">LOST</option>
                          </select>
                        </div>
                      </div>

                      {/* AI Issue Summary & Original Customer text */}
                      <div className="space-y-2">
                        <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-900">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">AI Issue Summary</span>
                          <p className="text-xs text-zinc-300 italic">"{lead.issueSummary || 'Analyzing customer request...'}"</p>
                        </div>
                        <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-900">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Original Customer Text</span>
                          <p className="text-xs text-zinc-400 whitespace-pre-wrap">{lead.emergencyIssue}</p>
                        </div>
                      </div>

                      {/* Internal Notes Editor */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase block">Internal Notes (Private)</span>
                        <div className="flex gap-2">
                          <textarea
                            value={editingNotes[lead.id] !== undefined ? editingNotes[lead.id] : (lead.notes || '')}
                            onChange={(e) => setEditingNotes(prev => ({ ...prev, [lead.id]: e.target.value }))}
                            placeholder="Add client quote amount, dispatch times, or follow-up details..."
                            rows={1}
                            className="flex-1 bg-zinc-950 border border-zinc-850 focus:border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-300 outline-none resize-none font-medium placeholder-zinc-600"
                          />
                          <button
                            onClick={() => handleUpdateLead(lead.id, undefined, editingNotes[lead.id] !== undefined ? editingNotes[lead.id] : (lead.notes || ''))}
                            disabled={updatingLeadId === lead.id}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shrink-0 active:scale-95 transition-all self-end"
                          >
                            Save
                          </button>
                        </div>
                      </div>

                      {/* Interactive Activity Timeline */}
                      <div className="border-t border-zinc-900/60 pt-3 space-y-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase block">Activity Timeline</span>
                        <div className="relative pl-4 space-y-3 before:content-[''] before:absolute before:left-[5px] before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-zinc-800">
                          {lead.activities?.map(act => (
                            <div key={act.id} className="relative text-xs">
                              <span className={`absolute -left-[15px] top-1 h-2.5 w-2.5 rounded-full border border-zinc-950 ${
                                act.activityType === 'CREATED' ? 'bg-blue-400 shadow-sm shadow-blue-400/20' :
                                act.activityType === 'SMS_SENT' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/20' :
                                act.activityType === 'STATUS_CHANGED' ? 'bg-amber-400 shadow-sm shadow-amber-400/20' :
                                'bg-zinc-400'
                              }`}></span>
                              <div className="space-y-0.5">
                                <p className="text-zinc-300 font-medium leading-tight">{act.content}</p>
                                <span className="text-[9px] text-zinc-600 font-semibold">{new Date(act.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : (
            /* Telemetry Logs */
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
                      className="bg-zinc-900/50 border border-zinc-850 hover:border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between gap-3 active:scale-[0.99] transition-all"
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
          )}

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
  
  // Computations for ROI Calculator
  const monthlyMissedCalls = missedCallsPerWeek * 4;
  const estimatedRecoveredCalls = Math.round(monthlyMissedCalls * 0.70);
  const estimatedBookedJobs = Math.round(estimatedRecoveredCalls * (closeRate / 100));
  const estimatedSavedRevenue = estimatedBookedJobs * avgJobVal;
  const estimatedRoiMultiplier = estimatedSavedRevenue > 0 ? Math.round(estimatedSavedRevenue / 29.99) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-emerald-500/30 overflow-x-hidden relative">
      
      {/* Decorative Blur Background Circles */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[800px] right-1/4 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[150px] pointer-events-none z-0" />
      <div className="absolute bottom-[400px] left-1/3 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[130px] pointer-events-none z-0" />

      {/* Header Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📲</span>
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              BounceBack <span className="text-emerald-500 font-extrabold">SMS</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer">
              Terms
            </Link>
            <button 
              onClick={() => setIsLoginModalOpen(true)} 
              className="text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <Link 
              href="/onboard" 
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2.5 rounded-xl text-sm font-extrabold transition-all hover:scale-105 active:scale-95 shadow-md shadow-emerald-500/10 cursor-pointer"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden z-10">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800/80 mb-8 animate-fade-in shadow-lg">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              Now Compliant with Carrier 10DLC Standards
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight text-white mb-8 leading-[1.1] max-w-4xl mx-auto">
            Never Lose a Customer to a <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 bg-clip-text text-transparent">Missed Call</span> Again.
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-slate-400 mb-12 leading-relaxed max-w-3xl mx-auto">
            62% of calls to small businesses go unanswered—and those callers immediately ring your competitor. BounceBack SMS automatically texts back missed calls in under 30 seconds, capturing leads, booking appointments, and saving your revenue on autopilot.
          </p>

          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row mb-12">
            <Link 
              href="/onboard" 
              className="group relative inline-flex items-center justify-center bg-emerald-500 text-slate-950 px-8 py-4.5 rounded-2xl text-lg font-black transition-all hover:bg-emerald-400 hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20 cursor-pointer text-center w-full sm:w-auto"
            >
              Start Your 14-Day Free Trial 🚀
            </Link>
            <button 
              onClick={() => handleQuickDemo("test@example.com")}
              className="inline-flex items-center justify-center bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-emerald-400 px-8 py-4.5 rounded-2xl text-lg font-extrabold transition-all hover:scale-105 active:scale-95 cursor-pointer text-center w-full sm:w-auto"
            >
              🪠 Tap to Demo Plumber Dashboard
            </button>
          </div>

          <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider mb-12">
            No setup fees. No credit card required to try. 100% Risk-Free.
          </p>

          {/* Core Guarantee Callout Badge */}
          <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-emerald-950/10 border border-emerald-500/20 backdrop-blur-sm shadow-md text-left sm:text-center flex flex-col sm:flex-row items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl shrink-0">
              🛡️
            </div>
            <p className="text-slate-300 text-sm leading-relaxed font-medium">
              <span className="font-extrabold text-emerald-400 uppercase tracking-wider block sm:inline mr-1">30-Day Fresh Lead Guarantee:</span>
              If BounceBack SMS doesn’t generate a single fresh lead for your business in your first 30 days, we’ll completely refund your first month. No questions asked.
            </p>
          </div>

        </div>
      </section>

      {/* Interactive Revenue ROI Calculator Section */}
      <section className="py-20 px-4 relative z-10 bg-slate-900/20 border-y border-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">Calculate Your Recovered Revenue</h2>
            <p className="text-slate-400 mt-3 text-base">Adjust the sliders below to see the monthly impact of securing missed calls.</p>
          </div>

          <div className="grid md:grid-cols-12 gap-8 items-stretch">
            {/* Left Controls Column */}
            <div className="md:col-span-7 bg-slate-900/40 border border-slate-900 p-8 rounded-3xl backdrop-blur-sm flex flex-col justify-between space-y-8">
              
              {/* Slider 1 */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-extrabold text-slate-300 uppercase tracking-widest">
                    Average Job Value
                  </label>
                  <span className="text-xl font-bold font-mono text-emerald-400">${avgJobVal}</span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="1500" 
                  step="25"
                  value={avgJobVal}
                  onChange={(e) => setAvgJobVal(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-950 h-2 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xxs text-slate-500 font-bold">
                  <span>$50</span>
                  <span>$750</span>
                  <span>$1,500</span>
                </div>
              </div>

              {/* Slider 2 */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-extrabold text-slate-300 uppercase tracking-widest">
                    Weekly Unanswered Calls
                  </label>
                  <span className="text-xl font-bold font-mono text-emerald-400">{missedCallsPerWeek} calls</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="30" 
                  step="1"
                  value={missedCallsPerWeek}
                  onChange={(e) => setMissedCallsPerWeek(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-950 h-2 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xxs text-slate-500 font-bold">
                  <span>1 call</span>
                  <span>15 calls</span>
                  <span>30 calls</span>
                </div>
              </div>

              {/* Slider 3 */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-extrabold text-slate-300 uppercase tracking-widest">
                    Estimate Close Rate
                  </label>
                  <span className="text-xl font-bold font-mono text-emerald-400">{closeRate}%</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="100" 
                  step="5"
                  value={closeRate}
                  onChange={(e) => setCloseRate(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-950 h-2 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xxs text-slate-500 font-bold">
                  <span>10%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

            </div>

            {/* Right Display Card */}
            <div className="md:col-span-5 bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/30 p-8 rounded-3xl flex flex-col justify-between shadow-xl relative overflow-hidden text-center sm:text-left">
              <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none" />
              
              <div className="space-y-6 relative z-10">
                <div>
                  <span className="text-xxs uppercase tracking-widest text-emerald-400 font-extrabold bg-emerald-500/10 px-2.5 py-1 rounded-md">
                    Estimated Recovery Impact
                  </span>
                  <p className="text-slate-400 text-xs mt-2.5">
                    Based on standard 70% SMS response dispatch and your chosen parameters.
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="block text-xxs font-extrabold text-slate-500 uppercase tracking-wider">
                    Recovered Revenue / Month
                  </span>
                  <div className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight leading-none font-mono">
                    ${estimatedSavedRevenue.toLocaleString()}
                  </div>
                </div>

                <div className="border-t border-slate-900 pt-4 space-y-3 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Fresh SMS Sent / Month</span>
                    <span className="font-bold text-white font-mono">{estimatedRecoveredCalls}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Est. Appts Booked / Month</span>
                    <span className="font-bold text-white font-mono">{estimatedBookedJobs}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Return on Investment (ROI)</span>
                    <span className="font-bold text-emerald-400 font-mono">{estimatedRoiMultiplier}x ROI</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 relative z-10">
                <Link 
                  href="/onboard" 
                  className="block text-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold py-3.5 px-4 rounded-xl text-sm transition-all shadow-md shadow-emerald-500/5 cursor-pointer"
                >
                  Secure Your Revenue Now
                </Link>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-24 px-4 bg-slate-900/10 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-4">
              A Missed Call is Just a Donation to Your Competitor.
            </h2>
            <p className="text-slate-400 text-base max-w-2xl mx-auto">
              Unanswered phone lines are the largest leaky bucket in local services. BounceBack SMS plugs the leak instantly.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-stretch">
            
            {/* Step 1 */}
            <div className="bg-slate-950 border border-slate-900 p-8 rounded-3xl relative overflow-hidden group hover:border-slate-800 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 text-center flex items-center justify-center text-xl font-black text-slate-400 mb-6">
                1
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Inbound Call</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                A homeowner finds your Google Maps listing, dials your number with high intent, but you are busy on a job site or driving and can't answer.
              </p>
              <div className="mt-6 p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-400 text-xs font-mono">
                📞 Call Missed (Loss of opportunity)
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-950 border border-slate-900 p-8 rounded-3xl relative overflow-hidden group hover:border-slate-800 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 text-center flex items-center justify-center text-xl font-black text-slate-400 mb-6">
                2
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Instant Bounceback</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Within 30 seconds of the hang-up, our carrier-grade system intercepts the missed call log and dispatches a highly personalized text-back with your schedule link.
              </p>
              <div className="mt-6 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs font-mono">
                💬 "Hey there! Sorry we missed you. Book here..."
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-950 border-2 border-emerald-500/30 p-8 rounded-3xl relative overflow-hidden shadow-lg shadow-emerald-500/5">
              <div className="absolute top-0 right-0 h-20 w-20 bg-emerald-500/5 rounded-full blur-[40px] pointer-events-none" />
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-center flex items-center justify-center text-xl font-black text-emerald-400 mb-6">
                3
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Automated Save</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                The caller views details on their phone, selects an open scheduling slot on your calendar, and books. You rescue the customer before they dial the next business.
              </p>
              <div className="mt-6 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-mono font-extrabold flex items-center justify-between">
                <span>🎉 Job Secured Autopilot</span>
                <span>+$150.00</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Features Bento Grid Section */}
      <section className="py-24 px-4 relative z-10 border-t border-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-4">
              Designed to Maximize Lead Capture Rate
            </h2>
            <p className="text-slate-400 text-base max-w-2xl mx-auto">
              Everything you need to automate missed calls, maintain compliance, and track dynamic ROI.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="p-8 bg-slate-900/30 border border-slate-900 hover:border-slate-800 rounded-3xl transition-all flex flex-col justify-between space-y-6">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl mb-6 text-emerald-400">
                  ⚡
                </div>
                <h4 className="text-xl font-bold text-white mb-3">Instant Missed Call Recovery</h4>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Sends an automated text-back message in under 30 seconds of a missed line, capturing high-intent prospects before they go elsewhere.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-8 bg-slate-900/30 border border-slate-900 hover:border-slate-800 rounded-3xl transition-all flex flex-col justify-between space-y-6">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl mb-6 text-emerald-400">
                  🛡️
                </div>
                <h4 className="text-xl font-bold text-white mb-3">10DLC Compliant Network</h4>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Vetted carrier-approved communications structure ensuring absolute text-delivery success rate. No spam filters, no carrier blockages.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-8 bg-slate-900/30 border border-slate-900 hover:border-slate-800 rounded-3xl transition-all flex flex-col justify-between space-y-6">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl mb-6 text-emerald-400">
                  ����
                </div>
                <h4 className="text-xl font-bold text-white mb-3">Centralized Tracking Dashboard</h4>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Complete dashboard for small business owners to monitor call logs, audit recovery performance, and track business revenue metrics.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Enterprise-Grade Security & Compliance Section */}
      <section className="py-24 px-4 bg-slate-950 border-t border-slate-900 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xxs uppercase tracking-widest text-emerald-400 font-extrabold bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-500/20 inline-block mb-4">
              Security First
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-4">
              Enterprise-Grade Security & Compliance
            </h2>
            <p className="text-slate-400 text-base max-w-2xl mx-auto">
              BounceBack SMS is engineered to protect sensitive customer data while maintaining strict adherence to modern privacy regulations and carrier requirements.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch mb-12">
            
            {/* AES-256-GCM Badge */}
            <div className="p-6 bg-slate-900/20 border border-slate-900 hover:border-slate-800 rounded-3xl transition-all flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl mb-6 text-emerald-400 font-bold">
                  🔒
                </div>
                <h4 className="text-lg font-bold text-white mb-2">AES-256-GCM</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  All personally identifiable information (PII), call logs, and customer telephone numbers are encrypted at the application layer using military-grade AES-256-GCM.
                </p>
              </div>
            </div>

            {/* GDPR Badge */}
            <div className="p-6 bg-slate-900/20 border border-slate-900 hover:border-slate-800 rounded-3xl transition-all flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl mb-6 text-emerald-400 font-bold">
                  🇪🇺
                </div>
                <h4 className="text-lg font-bold text-white mb-2">GDPR Compliant</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  We fully respect EU privacy standards. Access your data anytime via our Data Portability export utility, or trigger complete anonymization under the Right to be Forgotten.
                </p>
              </div>
            </div>

            {/* CCPA Badge */}
            <div className="p-6 bg-slate-900/20 border border-slate-900 hover:border-slate-800 rounded-3xl transition-all flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl mb-6 text-emerald-400 font-bold">
                  🐻
                </div>
                <h4 className="text-lg font-bold text-white mb-2">CCPA / CPRA</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  California Consumer Privacy Act compliant. We never sell, rent, or lease your business details or client databases to any brokers, networks, or advertising agencies.
                </p>
              </div>
            </div>

            {/* 10DLC Vetted Badge */}
            <div className="p-6 bg-slate-900/20 border border-slate-900 hover:border-slate-800 rounded-3xl transition-all flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl mb-6 text-emerald-400 font-bold">
                  📡
                </div>
                <h4 className="text-lg font-bold text-white mb-2">10DLC & CTIA Vetted</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Every auto-text is processed through registered 10-Digit Long Code channels in full compliance with carrier vetting and CTIA anti-spam regulations.
                </p>
              </div>
            </div>

          </div>

          {/* DPO / Contact info inside the block */}
          <div className="p-6 bg-slate-900/20 border border-slate-900 rounded-3xl text-center max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="text-xs text-slate-400">
              Need to contact our data protection team? Email our Data Protection Officer at{" "}
              <a href="mailto:privacy@bounceback-sms.com" className="text-emerald-400 hover:underline font-bold">
                privacy@bounceback-sms.com
              </a>{" "}
              or our security team at{" "}
              <a href="mailto:security@bounceback-sms.com" className="text-emerald-400 hover:underline font-bold">
                security@bounceback-sms.com
              </a>.
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-4 bg-slate-900/30 border-t border-slate-900 relative z-10">
        <div className="max-w-xl mx-auto">
          <div className="bg-slate-950 border-2 border-emerald-500/30 rounded-[40px] p-8 md:p-12 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/20 blur-3xl rounded-full" />
            
            <span className="text-xxs uppercase tracking-widest text-emerald-400 font-extrabold bg-emerald-500/10 px-3 py-1 rounded-md inline-block mb-6 border border-emerald-500/20">
              The Growth Plan
            </span>
            
            <div className="mb-8">
              <div className="text-5xl md:text-6xl font-black text-white mb-2">14 Days Free</div>
              <div className="text-lg text-slate-300 font-medium">then just $29.99 / month</div>
              <div className="mt-3 text-2xl md:text-3xl font-black text-emerald-400">Exactly $1.00 a day</div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mb-10">
              <span className="text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full backdrop-blur-sm">
                ✓ 14-Day Free Trial
              </span>
              <span className="text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full backdrop-blur-sm">
                ✓ 30-Day &lsquo;Fresh Lead&rsquo; Refund Guarantee
              </span>
            </div>

            <ul className="text-left space-y-4 mb-12 max-w-sm mx-auto">
              {[
                "Automated Text-Back",
                "Compliance Architecture",
                "Unified Tracking",
                "Lead Guarantee",
                "No Hidden Fees"
              ].map((item, i) => (
                <li key={i} className="flex gap-3.5 items-center text-slate-300">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs shrink-0 font-extrabold">
                    ✓
                  </div>
                  <span className="text-base font-semibold">{item}</span>
                </li>
              ))}
            </ul>

            <Link 
              href="/onboard" 
              className="block w-full bg-emerald-500 text-slate-950 py-5 rounded-2xl text-xl font-black transition-all hover:bg-emerald-400 hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/15 cursor-pointer text-center"
            >
              Start Your 14-Day Free Trial
            </Link>

            <p className="text-slate-500 text-xxs font-semibold uppercase tracking-wider mt-5">
              Instant Setup • Cancel Anytime • No Upfront Commitment
            </p>
          </div>
        </div>
      </section>

      {/* Interactive FAQ Accordion Section */}
      <section className="py-24 px-4 border-t border-slate-900 relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">Frequently Asked Questions</h2>
            <p className="text-slate-400 mt-3">Everything you need to understand about BounceBack SMS.</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Do I need to replace my existing business phone number?",
                a: "No! You keep your existing business line. Our setup connects directly to your phone via Twilio voice forwarding, intercepting call statuses only when you are busy or don't answer, and handling text-backs automatically."
              },
              {
                q: "Is there a setup fee or custom integration cost?",
                a: "Absolutely not. Setup is 100% automated, takes less than 3 minutes, and is completely free of charge during your 14-day trial period."
              },
              {
                q: "What is 10DLC compliance and why does it matter?",
                a: "10DLC (10-Digit Long Code) compliance ensures your automated texts are fully verified with carrier registries. We manage this entire registration process for you automatically so that your messages never get filtered as spam."
              },
              {
                q: "How does the refund guarantee work?",
                a: "We are so confident in our product that if BounceBack SMS doesn't generate a single active lead or value for your business within your first month, just email us and we will issue a full refund of your subscription fee immediately."
              }
            ].map((faq, idx) => (
              <div 
                key={idx}
                className="bg-slate-900/30 border border-slate-900 hover:border-slate-850 rounded-2xl transition-all overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full text-left p-6 flex justify-between items-center gap-4 text-base font-bold text-white transition-colors"
                >
                  <span>{faq.q}</span>
                  <span className={`text-xl text-emerald-400 transition-transform ${openFaq === idx ? "rotate-45" : ""}`}>
                    ＋
                  </span>
                </button>
                
                {openFaq === idx && (
                  <div className="px-6 pb-6 text-sm text-slate-400 leading-relaxed border-t border-slate-900/30 pt-4 animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4-Column Footer */}
      <footer className="py-20 border-t border-slate-900 px-4 bg-slate-950 relative z-10 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16 text-left">
            
            {/* Column 1: Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📲</span>
                <span className="text-lg font-bold tracking-tight text-white">
                  BounceBack <span className="text-emerald-500 font-extrabold">SMS</span>
                </span>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">
                BounceBack SMS recovers lost revenue for small businesses by automatically texting customers the moment a call is missed, securing immediate scheduling and leads.
              </p>
            </div>

            {/* Column 2: Product */}
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Product</h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <button onClick={() => setIsLoginModalOpen(true)} className="hover:text-white transition-colors cursor-pointer text-left">
                    Sign In to Console
                  </button>
                </li>
                <li>
                  <Link href="/onboard" className="hover:text-white transition-colors">
                    Start 14-Day Free Trial
                  </Link>
                </li>
                <li>
                  <button onClick={() => handleQuickDemo("test@example.com")} className="hover:text-white transition-colors cursor-pointer text-left">
                    Interactive Live Demo
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Legal */}
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Legal & Compliance</h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <span className="text-slate-500 cursor-default">
                    Cookie Consent (Essential only)
                  </span>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact */}
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Contact & Support</h4>
              <ul className="space-y-2.5 text-xs">
                <li className="flex flex-col gap-0.5">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wide">Data Protection Officer (DPO)</span>
                  <a href="mailto:privacy@bounceback-sms.com" className="text-emerald-400 hover:underline">
                    privacy@bounceback-sms.com
                  </a>
                </li>
                <li className="flex flex-col gap-0.5">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wide">Security Response</span>
                  <a href="mailto:security@bounceback-sms.com" className="text-emerald-400 hover:underline">
                    security@bounceback-sms.com
                  </a>
                </li>
                <li className="text-[11px] text-slate-500 leading-normal">
                  GDPR Article 27 EU Representative details available in full Privacy Policy framework.
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-900 pt-8 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-xs text-slate-500">
              <p>© {new Date().getFullYear()} BounceBack SMS. All rights reserved.</p>
              <div className="hidden sm:block h-3 w-px bg-slate-900" />
              <p className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Protected by AES-256-GCM encryption
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] text-slate-600 font-semibold uppercase tracking-wider">
              <span>14-Section GDPR/CCPA Compliant Framework</span>
              <span>•</span>
              <span>10DLC Registered Carrier Net</span>
              <span>•</span>
              <span>Stripe PCI-DSS Level 1 Secure Payments</span>
            </div>
          </div>
          
          <div className="mt-8 text-center text-[10px] text-slate-600 leading-relaxed max-w-4xl mx-auto">
            SMS Disclosure: By registering, you authorize BounceBack SMS to deliver automated text-back notifications to consumers calling your assigned number. Message frequency varies. Message & data rates may apply. Recipients may reply HELP for assistance or STOP to cancel messaging at any time. Opt-out requests are processed immediately.
          </div>
        </div>
      </footer>

      {/* ==========================================
          --- SIGN IN MODAL OVERLAY ---
          ========================================== */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative animate-fade-in text-white z-50">
            <button 
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer text-xl p-1 font-bold"
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

            {loginInfo && (
              <div className="mb-4 bg-emerald-950/40 border border-emerald-800 text-emerald-200 text-xs p-3.5 rounded-xl">
                ✉️ {loginInfo}
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
