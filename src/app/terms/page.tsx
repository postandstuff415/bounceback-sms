import Link from "next/link";

export default function TermsAndConditions() {
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
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-8">Terms & Conditions</h1>
        <p className="text-slate-500 mb-12 text-sm italic">Last Updated: June 17, 2026</p>

        <section className="space-y-12">
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800">
            <h2 className="text-2xl font-bold text-emerald-400 mb-6">1. SMS Disclosure & Consent</h2>
            <p className="text-lg leading-relaxed text-white mb-6">
              By providing your phone number, you agree to receive automated text messages from BounceBack SMS. Consent is not a condition of purchase. Message and data rates may apply. Message frequency varies.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="block text-emerald-500 font-bold mb-1">To Opt-Out:</span>
                <p className="text-white font-medium">Reply STOP to cancel at any time.</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="block text-emerald-500 font-bold mb-1">To Get Help:</span>
                <p className="text-white font-medium">Reply HELP for help.</p>
              </div>
            </div>
          </div>

          <div className="prose prose-invert max-w-none">
            <h2 className="text-2xl font-bold text-white mb-4">2. Acceptance of Terms</h2>
            <p>
              By accessing or using BounceBack SMS, you agree to be bound by these Terms and Conditions. If you do not agree to all of the terms, do not access or use the service.
            </p>
          </div>

          <div className="prose prose-invert max-w-none">
            <h2 className="text-2xl font-bold text-white mb-4">3. Description of Service</h2>
            <p>
              BounceBack SMS provides missed-call text-back automation for local businesses. This includes call monitoring, SMS dispatch, and a native mobile console for analytics and ROI tracking.
            </p>
          </div>

          <div className="prose prose-invert max-w-none">
            <h2 className="text-2xl font-bold text-white mb-4">4. Account Responsibilities</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate, current, and complete information during the onboarding process.
            </p>
          </div>

          <div className="prose prose-invert max-w-none">
            <h2 className="text-2xl font-bold text-white mb-4">5. Limitation of Liability</h2>
            <p>
              BounceBack SMS shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.
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
