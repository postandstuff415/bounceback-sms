import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LeadDetailPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : undefined;

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col justify-between">
        <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md py-4">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>📲</span> BounceBack <span className="text-emerald-500">SMS</span>
            </span>
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-xl">
            <span className="text-5xl block mb-4">⚠️</span>
            <h1 className="text-2xl font-bold text-white mb-2">Access Key Missing</h1>
            <p className="text-slate-400 mb-6">
              A secure access token is required to view this lead details page. Please verify your notification link.
            </p>
            <Link
              href="/"
              className="inline-block w-full py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-all"
            >
              Go to Home
            </Link>
          </div>
        </main>

        <footer className="py-6 border-t border-slate-900 text-center text-xs text-slate-600 bg-slate-950">
          <p>© 2026 BounceBack SMS. Secure Lead Portal.</p>
        </footer>
      </div>
    );
  }

  // Retrieve lead token from database with associated ticket and account
  const leadToken = await prisma.leadToken.findUnique({
    where: { token },
    include: {
      ticket: {
        include: {
          account: true,
        },
      },
    },
  });

  // Verify token exists and is not expired (7 days expiration)
  const isExpired = leadToken ? new Date() > leadToken.expiresAt : true;

  if (!leadToken || isExpired) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col justify-between">
        <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md py-4">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>📲</span> BounceBack <span className="text-emerald-500">SMS</span>
            </span>
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-xl">
            <span className="text-5xl block mb-4">⏳</span>
            <h1 className="text-2xl font-bold text-white mb-2">Link Expired or Invalid</h1>
            <p className="text-slate-400 mb-6">
              For security, lead access links automatically expire after 7 days. This token is no longer valid.
            </p>
            <Link
              href="/"
              className="inline-block w-full py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-all"
            >
              Go to Dashboard
            </Link>
          </div>
        </main>

        <footer className="py-6 border-t border-slate-900 text-center text-xs text-slate-600 bg-slate-950">
          <p>© 2026 BounceBack SMS. Secure Lead Portal.</p>
        </footer>
      </div>
    );
  }

  const { ticket } = leadToken;
  const decryptedPhone = decrypt(ticket.customerPhone);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col justify-between selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 py-4">
        <div className="max-w-md mx-auto px-4 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>📲</span> BounceBack <span className="text-emerald-500">SMS</span>
          </span>
          <span className="px-3 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
            Secure Portal
          </span>
        </div>
      </header>

      {/* Main content - Mobile Optimized */}
      <main className="flex-grow max-w-md mx-auto w-full px-4 py-8">
        <div className="space-y-6">
          
          {/* Card Header Alert */}
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
            <span className="text-2xl animate-pulse">🚨</span>
            <div>
              <p className="font-bold text-sm">New Rescue Lead</p>
              <p className="text-xs text-emerald-500/80">Call within 5 minutes to maximize close rate!</p>
            </div>
          </div>

          {/* Lead Details Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            {/* Urgency Badge */}
            <div className="absolute top-6 right-6">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                ticket.computedUrgency === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                ticket.computedUrgency === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                ticket.computedUrgency === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {ticket.computedUrgency} URGENCY
              </span>
            </div>

            <h2 className="text-xl font-bold text-white mb-6">Lead Summary</h2>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">Customer Name</span>
                <span className="text-lg text-white font-medium">{ticket.customerName}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">Phone Number</span>
                <span className="text-lg text-white font-mono font-medium">{decryptedPhone}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">AI Issue Summary</span>
                <span className="text-sm text-slate-200 block bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 mt-1 font-medium italic">
                  "{ticket.issueSummary || "Analyzing issue description..."}"
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">Original Customer Text</span>
                <p className="text-sm text-slate-300 bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 mt-1 whitespace-pre-wrap leading-relaxed">
                  {ticket.emergencyIssue}
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">Timestamp</span>
                <span className="text-xs text-slate-400 font-medium">
                  {new Date(ticket.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <a
              href={`tel:${decryptedPhone}`}
              className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold text-lg shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all text-center"
            >
              <span>📞</span> Call Customer Now
            </a>

            <div className="text-center py-2">
              <p className="text-xs text-slate-500">
                Rescued for <strong className="text-slate-400 font-semibold">{ticket.account.businessName}</strong>
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer Placeholder for Metrics */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-8 text-center">
        <div className="max-w-md mx-auto px-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3">
              <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider">Avg Lead Value</span>
              <span className="text-emerald-400 font-bold text-sm">$60.00</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3">
              <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider">Avg Call Time</span>
              <span className="text-white font-bold text-sm">&lt; 3 Min</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-600 leading-relaxed">
            Secure tokenized lead delivery powered by BounceBack SMS. No username or password required to view this specific alert. This page is encrypted and compliant with PII standards.
          </p>
        </div>
      </footer>
    </div>
  );
}
