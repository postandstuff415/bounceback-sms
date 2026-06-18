import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-emerald-500/30">
      {/* 1. Header Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📲</span>
            <span className="text-xl font-bold tracking-tight text-white">
              BounceBack <span className="text-emerald-500 font-extrabold">SMS</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/onboard" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Login
            </Link>
            <Link 
              href="/onboard" 
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-600/20"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Gradients */}
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
              className="group relative inline-flex items-center justify-center bg-emerald-500 text-slate-950 px-10 py-5 rounded-2xl text-xl font-black transition-all hover:bg-emerald-400 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(16,185,129,0.3)] animate-pulse-slow"
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

      {/* 3. Before & After Comparison */}
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

      {/* 4. Features Section */}
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

      {/* 5. Pricing Section */}
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
              className="block w-full bg-emerald-500 text-slate-950 py-5 rounded-2xl text-xl font-black transition-all hover:bg-emerald-400 hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20"
            >
              Activate Your Free Account Now
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-900 px-4 text-center">
        <div className="max-w-7xl mx-auto">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} BounceBack SMS. Built for businesses that never want to miss a lead again.
          </p>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        .animate-pulse-slow {
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
