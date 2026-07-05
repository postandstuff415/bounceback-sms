"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface RegistrationStatus {
  status: "UNREGISTERED" | "PENDING" | "APPROVED" | "FAILED";
  registration: any;
}

export default function CompliancePage() {
  const router = useRouter();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [regStatus, setRegStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    legalBusinessName: "",
    businessType: "",
    ein: "",
    industry: "",
    website: "",
    country: "US",
    address: "",
    contactFirstName: "",
    contactLastName: "",
    contactEmail: "",
    contactPhone: "",
    campaignDescription: "",
    sampleMessage1: "",
    sampleMessage2: "",
    privacyPolicyUrl: "",
    termsOfServiceUrl: "",
  });

  const update = (field: string, val: string) => setForm((f) => ({ ...f, [field]: val }));

  const inputClass = "appearance-none block w-full px-4 py-3 border border-zinc-300 rounded-xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black h-[48px] transition-all";
  const textareaClass = "appearance-none block w-full px-4 py-3 border border-zinc-300 rounded-xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black transition-all resize-none";
  const btnClass = "w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all h-[48px] disabled:opacity-50";
  const selectClass = "appearance-none block w-full px-4 py-3 border border-zinc-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black h-[48px] transition-all bg-white";

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) { router.push("/onboard"); return; }
    setAuthToken(token);
    fetchStatus(token);
  }, [router]);

  const fetchStatus = async (token: string) => {
    try {
      const res = await fetch("/api/compliance/register", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setRegStatus(data.status);
        if (data.registration) {
          const r = data.registration;
          setForm({
            legalBusinessName: r.legalBusinessName || "",
            businessType: r.businessType || "",
            ein: r.ein || "",
            industry: r.industry || "",
            website: r.website || "",
            country: r.country || "US",
            address: r.address || "",
            contactFirstName: r.contactFirstName || "",
            contactLastName: r.contactLastName || "",
            contactEmail: r.contactEmail || "",
            contactPhone: r.contactPhone || "",
            campaignDescription: r.campaignDescription || "",
            sampleMessage1: r.sampleMessage1 || "",
            sampleMessage2: r.sampleMessage2 || "",
            privacyPolicyUrl: r.privacyPolicyUrl || "",
            termsOfServiceUrl: r.termsOfServiceUrl || "",
          });
        }
      }
    } catch (e) { /* ignore */ }
    finally { setFetchingStatus(false); }
  };

  const statusBadge = () => {
    if (fetchingStatus) return null;
    const styles: Record<string, string> = {
      UNREGISTERED: "bg-gray-100 text-gray-600 border-gray-300",
      PENDING: "bg-amber-50 text-amber-700 border-amber-300",
      APPROVED: "bg-green-50 text-green-700 border-green-300",
      FAILED: "bg-red-50 text-red-700 border-red-300",
    };
    const labels: Record<string, string> = {
      UNREGISTERED: "Not Registered",
      PENDING: "Pending Review",
      APPROVED: "Approved",
      FAILED: "Failed",
    };
    const s = regStatus || "UNREGISTERED";
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold ${styles[s] || styles.UNREGISTERED}`}>
        <span className={`h-2 w-2 rounded-full ${s === "APPROVED" ? "bg-green-500" : s === "PENDING" ? "bg-amber-500" : s === "FAILED" ? "bg-red-500" : "bg-gray-400"}`} />
        {labels[s] || labels.UNREGISTERED}
      </div>
    );
  };

  const validate = (): boolean => {
    const required: [string, string][] = [
      ["legalBusinessName", "Legal Business Name"],
      ["businessType", "Business Type"],
      ["industry", "Industry"],
      ["website", "Website"],
      ["country", "Country"],
      ["address", "Address"],
      ["contactFirstName", "Contact First Name"],
      ["contactLastName", "Contact Last Name"],
      ["contactEmail", "Contact Email"],
      ["contactPhone", "Contact Phone"],
      ["campaignDescription", "Campaign Description"],
      ["sampleMessage1", "Sample Message 1"],
      ["sampleMessage2", "Sample Message 2"],
      ["privacyPolicyUrl", "Privacy Policy URL"],
      ["termsOfServiceUrl", "Terms of Service URL"],
    ];
    for (const [key, label] of required) {
      if (!(form as any)[key]?.trim()) { setError(`${label} is required.`); return false; }
    }
    if (!form.website.startsWith("https://")) { setError("Website URL must start with https://"); return false; }
    if (!form.privacyPolicyUrl.startsWith("https://")) { setError("Privacy Policy URL must start with https://"); return false; }
    if (!form.termsOfServiceUrl.startsWith("https://")) { setError("Terms of Service URL must start with https://"); return false; }
    if (!form.contactEmail.includes("@")) { setError("Please enter a valid email address."); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/compliance/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setSuccess(true);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  if (checkingAuth || fetchingStatus) return <div className="min-h-screen bg-zinc-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-12 px-4">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <span className="text-5xl">✅</span>
          <h2 className="mt-4 text-2xl font-bold text-zinc-900">Registration Submitted!</h2>
          <p className="mt-2 text-sm text-zinc-600">Your A2P 10DLC compliance registration is under review. Twilio typically completes the review within 24–48 hours.</p>
          <div className="mt-6"><Link href="/" className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-blue-600 hover:bg-blue-700">Back to Dashboard</Link></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)] px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="flex justify-center">
          <span className="text-3xl font-extrabold text-blue-600 tracking-tight flex items-center gap-2">📲 BounceBack <span className="text-zinc-900">SMS</span></span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-zinc-950">A2P 10DLC Compliance Registration</h2>
        <p className="mt-2 text-center text-sm text-zinc-500">Twilio requires brand and campaign registration to send SMS via 10DLC.</p>
        <div className="mt-4 flex justify-center">{statusBadge()}</div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow-xl rounded-3xl sm:rounded-3xl sm:px-10 border border-zinc-100">
          {error && <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Legal Business Name</label>
                <input type="text" value={form.legalBusinessName} onChange={(e) => update("legalBusinessName", e.target.value)} className={inputClass} placeholder="e.g. Austin Mobile Detailing LLC" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Business Type</label>
                <select value={form.businessType} onChange={(e) => update("businessType", e.target.value)} className={selectClass} required>
                  <option value="">Select...</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                  <option value="LLC">LLC</option>
                  <option value="Corporation">Corporation</option>
                  <option value="Non-Profit">Non-Profit</option>
                  <option value="Partnership">Partnership</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">EIN / Tax ID</label>
                <input type="text" value={form.ein} onChange={(e) => update("ein", e.target.value)} className={inputClass} placeholder="XX-XXXXXXX" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Industry</label>
                <input type="text" value={form.industry} onChange={(e) => update("industry", e.target.value)} className={inputClass} placeholder="e.g. Home Services" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Website</label>
                <input type="url" value={form.website} onChange={(e) => update("website", e.target.value)} className={inputClass} placeholder="https://yourbusiness.com" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Country</label>
                <input type="text" value={form.country} onChange={(e) => update("country", e.target.value)} className={inputClass} placeholder="US" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Business Address</label>
                <textarea value={form.address} onChange={(e) => update("address", e.target.value)} rows={2} className={textareaClass} placeholder="123 Main St, City, State ZIP" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Contact First Name</label>
                <input type="text" value={form.contactFirstName} onChange={(e) => update("contactFirstName", e.target.value)} className={inputClass} placeholder="John" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Contact Last Name</label>
                <input type="text" value={form.contactLastName} onChange={(e) => update("contactLastName", e.target.value)} className={inputClass} placeholder="Doe" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Contact Email</label>
                <input type="email" value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} className={inputClass} placeholder="owner@yourbusiness.com" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Contact Phone</label>
                <input type="tel" value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} className={inputClass} placeholder="+1 (555) 000-0000" required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Campaign Description</label>
                <textarea value={form.campaignDescription} onChange={(e) => update("campaignDescription", e.target.value)} rows={2} className={textareaClass} placeholder="Describe how you will use SMS messaging..." required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Sample Message #1</label>
                <textarea value={form.sampleMessage1} onChange={(e) => update("sampleMessage1", e.target.value)} rows={2} className={textareaClass} placeholder='e.g. "Hi {name}, sorry we missed your call! Book here: {booking_link}"' required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Sample Message #2</label>
                <textarea value={form.sampleMessage2} onChange={(e) => update("sampleMessage2", e.target.value)} rows={2} className={textareaClass} placeholder='e.g. "Reminder: Your appointment is tomorrow at 2pm."' required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Privacy Policy URL</label>
                <input type="url" value={form.privacyPolicyUrl} onChange={(e) => update("privacyPolicyUrl", e.target.value)} className={inputClass} placeholder="https://yourbusiness.com/privacy" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Terms of Service URL</label>
                <input type="url" value={form.termsOfServiceUrl} onChange={(e) => update("termsOfServiceUrl", e.target.value)} className={inputClass} placeholder="https://yourbusiness.com/terms" required />
              </div>
            </div>
            <div className="pt-2">
              <button type="submit" disabled={loading} className={btnClass}>
                {loading ? <div className="h-5 w-5 border-2 border-white/30 border-b-white rounded-full animate-spin" /> : "Submit Compliance Registration"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
