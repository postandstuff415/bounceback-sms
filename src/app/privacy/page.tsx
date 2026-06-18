import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-emerald-500/30">
      <nav className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">📲</span>
            <span className="text-xl font-bold tracking-tight text-white">
              BounceBack <span className="text-emerald-500">SMS</span>
            </span>
          </Link>
          <Link href="/" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
            Back to Home
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-16 md:py-24">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-8">Privacy Policy</h1>
        <p className="text-slate-500 mb-12 text-sm italic">Last Updated: June 17, 2026</p>

        <section className="space-y-12">
          <div className="prose prose-invert max-w-none">
            <h2 className="text-2xl font-bold text-white mb-4">1. Information Collection</h2>
            <p className="mb-4">
              BounceBack SMS collects information to provide better services to our users. We collect customer phone numbers directly from you through our onboarding and sign-up forms.
            </p>
            <p>
              This information is used exclusively for running the missed-call text-back automation engine, enabling your business to recover lost leads instantly.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800">
            <h2 className="text-2xl font-bold text-emerald-400 mb-6">2. SMS Compliance & Carrier Policy</h2>
            <p className="text-lg leading-relaxed text-white mb-6">
              Mobile information will not be shared with third parties/affiliates for marketing/promotional purposes. All the above categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties.
            </p>
            <p className="text-slate-400">
              Your opt-in data is kept strictly confidential and is used solely for the purpose of delivering the automated messages you have requested.
            </p>
          </div>

          <div className="prose prose-invert max-w-none">
            <h2 className="text-2xl font-bold text-white mb-4">3. Data Usage</h2>
            <p className="mb-4">
              We use the data we collect to:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Provision your local Twilio recovery line.</li>
              <li>Monitor missed call telemetry on your behalf.</li>
              <li>Dispatch automated text-back responses to your customers.</li>
              <li>Provide analytics via your dashboard.</li>
            </ul>
          </div>

          <div className="prose prose-invert max-w-none">
            <h2 className="text-2xl font-bold text-white mb-4">4. Data Protection</h2>
            <p>
              We implement a variety of security measures to maintain the safety of your personal information. Your sensitive data is stored behind secured networks and is only accessible by a limited number of persons who have special access rights to such systems.
            </p>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-slate-900 px-4 text-center">
        <p className="text-slate-600 text-sm">
          © 2026 BounceBack SMS. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
