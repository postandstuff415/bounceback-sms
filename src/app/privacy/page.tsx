import Link from "next/link";

const currentVersion = "2026-06-17-v1";
const effectiveDate = "June 17, 2026";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-emerald-500/30">
      {/* Navigation */}
      <nav className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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

      {/* Version Badge */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
            Policy Version: {currentVersion}
          </span>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
        {/* Header */}
        <div className="border-b border-slate-900 pb-8 mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Privacy Policy
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-slate-500 text-sm">
            <p className="italic">Effective Date: {effectiveDate}</p>
            <span className="hidden sm:inline">|</span>
            <p className="italic">Last Updated: {effectiveDate}</p>
          </div>
        </div>

        {/* TOC */}
        <div className="mb-16 p-8 rounded-3xl bg-slate-900/50 border border-slate-900">
          <h2 className="text-xl font-bold text-white mb-4">Table of Contents</h2>
          <ol className="space-y-2 text-sm">
            <li className="flex gap-3 text-slate-400"><span className="text-emerald-500 font-bold min-w-[1.5rem]">1.</span> Information We Collect &amp; Why</li>
            <li className="flex gap-3 text-slate-400"><span className="text-emerald-500 font-bold min-w-[1.5rem]">2.</span> Application-Level Data Encryption (AES-256-GCM)</li>
            <li className="flex gap-3 text-slate-400"><span className="text-emerald-500 font-bold min-w-[1.5rem]">3.</span> Data Retention &amp; Deletion Policy</li>
            <li className="flex gap-3 text-slate-400"><span className="text-emerald-500 font-bold min-w-[1.5rem]">4.</span> International Data Transfers</li>
            <li className="flex gap-3 text-slate-400"><span className="text-emerald-500 font-bold min-w-[1.5rem]">5.</span> SMS Compliance &amp; Carrier Policies</li>
            <li className="flex gap-3 text-slate-400"><span className="text-emerald-500 font-bold min-w-[1.5rem]">6.</span> GDPR Compliance (EU / EEA / UK Users)</li>
            <li className="flex gap-3 text-slate-400"><span className="text-emerald-500 font-bold min-w-[1.5rem]">7.</span> CCPA / CPRA Compliance (California Users)</li>
            <li className="flex gap-3 text-slate-400"><span className="text-emerald-500 font-bold min-w-[1.5rem]">8.</span> Cookie Policy &amp; Local Storage</li>
            <li className="flex gap-3 text-slate-400"><span className="text-emerald-500 font-bold min-w-[1.5rem]">9.</span> Third-Party Subprocessors</li>
            <li className="flex gap-3 text-slate-400"><span className="text-emerald-500 font-bold min-w-[1.5rem]">10.</span> Security Incident Response Protocol</li>
            <li className="flex gap-3 text-slate-400"><span className="text-emerald-500 font-bold min-w-[1.5rem]">11.</span> Children&apos;s Privacy</li>
            <li className="flex gap-3 text-slate-400"><span className="text-emerald-500 font-bold min-w-[1.5rem]">12.</span> Data Processing Agreement (DPA)</li>
            <li className="flex gap-3 text-slate-400"><span className="text-emerald-500 font-bold min-w-[1.5rem]">13.</span> Policy Versioning &amp; Change Notification</li>
            <li className="flex gap-3 text-slate-400"><span className="text-emerald-500 font-bold min-w-[1.5rem]">14.</span> Contact &amp; Data Protection Officer</li>
          </ol>
        </div>

        <div className="space-y-16">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-white border-l-4 border-emerald-500 pl-4 mb-6">1. Information We Collect &amp; Why</h2>
            <p className="mb-6 text-lg leading-relaxed">
              At <strong>BounceBack SMS</strong> (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), we automatically recover lost revenue for small businesses by intercepting missed calls and triggering an immediate text-back response with a booking link. To provide this service, we process data on behalf of our users, acting as a <strong>Data Processor</strong> under the GDPR and a <strong>Service Provider</strong> under the CCPA/CPRA.
            </p>
            <p className="mb-6">
              Our legal bases for processing personal data under GDPR include <strong>contractual necessity</strong> (Article 6(1)(b) — to deliver the service you subscribed to), <strong>legitimate interests</strong> (Article 6(1)(f) — operational analytics and fraud prevention), and <strong>explicit consent</strong> (Article 6(1)(a) — where required by applicable law).
            </p>
          </section>

          {/* Section 2 */}
          <section className="p-8 rounded-3xl bg-slate-900/50 border border-emerald-500/20">
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">2. Application-Level Data Encryption (AES-256-GCM)</h2>
            <p className="mb-6 text-slate-300 leading-relaxed">
              We employ strict application-level encryption for all sensitive user and customer information before it is written to our persistent databases. Our encryption follows industry-standard best practices designed to protect data at rest.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800">
                <h3 className="text-lg font-bold text-white mb-3">🔒 Cryptographic Standard</h3>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li><strong>Algorithm:</strong> AES-256-GCM (Advanced Encryption Standard, 256-bit key, Galois/Counter Mode)</li>
                  <li><strong>Authentication:</strong> GCM provides authenticated encryption — ciphertext integrity is verified on decryption, preventing tampering.</li>
                  <li><strong>IVs:</strong> Cryptographically random 128-bit initialization vector per record, ensuring identical plaintexts produce unique ciphertexts.</li>
                </ul>
              </div>
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800">
                <h3 className="text-lg font-bold text-white mb-3">🛡️ Key Management</h3>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li><strong>Key Derivation:</strong> SHA-256 normalization from a cryptographically random 256-bit master secret (ENCRYPTION_KEY).</li>
                  <li><strong>Secrets Management:</strong> The master key is stored in environment variables or a secrets management platform.</li>
                  <li><strong>Key Rotation:</strong> Supported via <code>scripts/generate-encryption-key.js</code>.</li>
                </ul>
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800">
              <h3 className="text-lg font-bold text-white mb-3">📋 Encrypted Fields</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>✓ <code>Account.realPhoneNumber</code> — Business owner&apos;s real phone line</li>
                <li>✓ <code>CallLog.callerNumber</code> — Caller&apos;s phone number from missed calls</li>
                <li>✓ <code>IntakeTicket.customerPhone</code> — Emergency intake customer phone numbers</li>
              </ul>
              <p className="text-xs text-slate-500 mt-3">
                Backward compatibility is maintained for data encrypted under the previous AES-256-CBC standard. All new encryptions use AES-256-GCM exclusively.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-white border-l-4 border-emerald-500 pl-4 mb-4">3. Data Retention &amp; Deletion Policy</h2>
            <div className="overflow-x-auto border border-slate-900 rounded-2xl bg-slate-900/50">
              <table className="min-w-full divide-y divide-slate-900">
                <thead><tr className="bg-slate-950">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-200 uppercase">Data Category</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-200 uppercase">Retention Period</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-200 uppercase">Rationale</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-900">
                  <tr><td className="px-6 py-4 font-medium text-white">Account Information</td><td className="px-6 py-4">Subscription duration + 90 days post-cancellation</td><td className="px-6 py-4 text-sm">Billing records, legal obligations, potential reactivation.</td></tr>
                  <tr><td className="px-6 py-4 font-medium text-white">Call Logs</td><td className="px-6 py-4">12 months from creation</td><td className="px-6 py-4 text-sm">Analytics, ROI tracking, dispute resolution.</td></tr>
                  <tr><td className="px-6 py-4 font-medium text-white">Intake Tickets</td><td className="px-6 py-4">12 months from creation</td><td className="px-6 py-4 text-sm">Service history, audit compliance.</td></tr>
                  <tr><td className="px-6 py-4 font-medium text-white">Payment Data</td><td className="px-6 py-4">Stored by Stripe per their retention policy</td><td className="px-6 py-4 text-sm">PCI-DSS compliance; managed by subprocessor.</td></tr>
                  <tr><td className="px-6 py-4 font-medium text-white">Usage Analytics</td><td className="px-6 py-4">26 months</td><td className="px-6 py-4 text-sm">Industry standard for product improvement.</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-white border-l-4 border-emerald-500 pl-4 mb-4">4. International Data Transfers</h2>
            <p className="mb-4">BounceBack SMS primarily hosts data within the United States. For users in the EEA, UK, or Switzerland, we ensure appropriate safeguards:</p>
            <ul className="list-disc pl-6 space-y-3">
              <li><strong>Standard Contractual Clauses (SCCs):</strong> We rely on the European Commission&apos;s SCCs for data transfers to third countries.</li>
              <li><strong>Subprocessor Safeguards:</strong> Each subprocessor is contractually bound to maintain equivalent data protection standards.</li>
              <li><strong>Data Localization:</strong> Region-locked deployment options available for enterprise customers.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-white border-l-4 border-emerald-500 pl-4 mb-4">5. SMS Compliance &amp; Carrier Policies</h2>
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-900 text-slate-300 italic mb-4">
              &ldquo;Mobile information will not be shared with third parties/affiliates for marketing/promotional purposes. All the above categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties.&rdquo;
            </div>
            <p>Your opt-in data is kept strictly confidential. Recipients can reply <strong>STOP</strong> to opt out or <strong>HELP</strong> for assistance at any time.</p>
          </section>

          {/* Section 6 - GDPR */}
          <section>
            <h2 className="text-2xl font-bold text-white border-l-4 border-emerald-500 pl-4 mb-4">6. GDPR Compliance (EU / EEA / UK Users)</h2>
            <p className="mb-4">Under the GDPR, EU/EEA/UK users hold specific rights:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <h3 className="text-lg font-bold text-emerald-400 mb-2">Right to Access</h3>
                <p className="text-sm">Request a copy of the personal data we hold about you. Response within 30 days.</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <h3 className="text-lg font-bold text-emerald-400 mb-2">Right to Rectification</h3>
                <p className="text-sm">Request corrections to inaccurate personal information.</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <h3 className="text-lg font-bold text-emerald-400 mb-2">Right to Erasure</h3>
                <p className="text-sm">Request deletion of all personal records, subject to legal obligations.</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <h3 className="text-lg font-bold text-emerald-400 mb-2">Right to Data Portability</h3>
                <p className="text-sm">Receive a structured JSON export of your account data and call statistics.</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <h3 className="text-lg font-bold text-emerald-400 mb-2">Right to Restrict Processing</h3>
                <p className="text-sm">Request restriction of processing in certain circumstances.</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <h3 className="text-lg font-bold text-emerald-400 mb-2">Right to Object</h3>
                <p className="text-sm">Object to processing based on legitimate interests, including direct marketing.</p>
              </div>
            </div>
            <p className="text-sm text-slate-400">Contact: <span className="text-emerald-400">privacy@bounceback-sms.com</span>. Response within 30 days. You may also lodge a complaint with your local DPA.</p>
          </section>

          {/* Section 7 - CCPA */}
          <section>
            <h2 className="text-2xl font-bold text-white border-l-4 border-emerald-500 pl-4 mb-4">7. CCPA / CPRA Compliance (California Users)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <h3 className="font-bold text-white mb-2">Notice of Collection</h3>
                <p className="text-sm">We collect business owner details and customer missed-call telemetry solely to facilitate automated text-back responses.</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <h3 className="font-bold text-white mb-2">No Sale of Personal Information</h3>
                <p className="text-sm">We do not sell, rent, or share personal information with third parties or data brokers.</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <h3 className="font-bold text-white mb-2">Right to Know &amp; Access</h3>
                <p className="text-sm">Request the categories and specific pieces of personal information we have collected.</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <h3 className="font-bold text-white mb-2">Right to Delete</h3>
                <p className="text-sm">Request deletion of personal information, subject to legal exceptions.</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <h3 className="font-bold text-white mb-2">Right to Correct</h3>
                <p className="text-sm">Request correction of inaccurate personal information.</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <h3 className="font-bold text-white mb-2">Non-Discrimination</h3>
                <p className="text-sm">We will not discriminate against you for exercising your CCPA/CPRA rights.</p>
              </div>
            </div>
            <p className="text-sm text-slate-400">Submit verifiable requests to <span className="text-emerald-400">privacy@bounceback-sms.com</span>. We respond within 45 days.</p>
          </section>

          {/* Section 8 - Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-white border-l-4 border-emerald-500 pl-4 mb-4">8. Cookie Policy &amp; Local Storage</h2>
            <p className="mb-4">Our website and dashboard use cookies and browser technologies to enhance functionality and maintain sessions.</p>
            <div className="overflow-x-auto mb-4 border border-slate-900 rounded-2xl bg-slate-900/50">
              <table className="min-w-full divide-y divide-slate-900">
                <thead><tr className="bg-slate-950">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-200 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-200 uppercase">Purpose</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-200 uppercase">Opt-Out</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-900">
                  <tr><td className="px-6 py-4 font-medium text-white">Essential</td><td className="px-6 py-4 text-sm">Authentication sessions, CSRF tokens, persistent login via <code>@capacitor/preferences</code>.</td><td className="px-6 py-4 text-sm">Cannot disable. Rejecting will require re-authentication.</td></tr>
                  <tr><td className="px-6 py-4 font-medium text-white">Functional</td><td className="px-6 py-4 text-sm">Dashboard preferences, theme selection, UI customizations.</td><td className="px-6 py-4 text-sm">Browser setting; some features may degrade.</td></tr>
                  <tr><td className="px-6 py-4 font-medium text-white">Analytics</td><td className="px-6 py-4 text-sm">Page views, feature usage metrics to optimize UX.</td><td className="px-6 py-4 text-sm">Browser setting or cookie consent banner.</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-white border-l-4 border-emerald-500 pl-4 mb-4">9. Third-Party Subprocessors</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <h3 className="font-bold text-white mb-2">📞 Twilio</h3>
                <p className="text-sm text-slate-400">Routes calls, processes telemetry, executes SMS dispatches.</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <h3 className="font-bold text-white mb-2">💳 Stripe</h3>
                <p className="text-sm text-slate-400">PCI-DSS Level 1 compliant subscription payment processing.</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                <h3 className="font-bold text-white mb-2">📧 Resend</h3>
                <p className="text-sm text-slate-400">Administrative and transactional email routing.</p>
              </div>
            </div>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-white border-l-4 border-emerald-500 pl-4 mb-4">10. Security Incident Response Protocol</h2>
            <ol className="list-decimal pl-6 space-y-3">
              <li><strong>Detection (within 1 hour):</strong> Automated monitoring alerts the on-call security engineer.</li>
              <li><strong>Assessment (within 4 hours):</strong> Determine scope, impact, and data categories.</li>
              <li><strong>Notification (within 48 hours):</strong> Notify affected data subjects and supervisory authorities per GDPR Article 33.</li>
              <li><strong>Remediation (within 14 days):</strong> Address root cause and implement preventive measures.</li>
              <li><strong>Post-Mortem (within 30 days):</strong> Full report filed, security controls reviewed.</li>
            </ol>
            <p className="mt-4 text-sm">Report vulnerabilities: <span className="text-emerald-400">security@bounceback-sms.com</span></p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-white border-l-4 border-emerald-500 pl-4 mb-4">11. Children&apos;s Privacy</h2>
            <p>We do not knowingly collect personal information from children under 16. If you believe a child has submitted data, contact <span className="text-emerald-400">privacy@bounceback-sms.com</span>.</p>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-2xl font-bold text-white border-l-4 border-emerald-500 pl-4 mb-4">12. Data Processing Agreement (DPA)</h2>
            <p>We provide a DPA reflecting GDPR Article 28 requirements. Request it at <span className="text-emerald-400">privacy@bounceback-sms.com</span>.</p>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-2xl font-bold text-white border-l-4 border-emerald-500 pl-4 mb-4">13. Policy Versioning &amp; Change Notification</h2>
            <p className="mb-4">Current version: <strong>{currentVersion}</strong>. When material changes occur, we notify active account holders via email at least 14 days in advance and update version tracking on each account.</p>
          </section>

          {/* Section 14 */}
          <section className="p-8 rounded-3xl bg-slate-900/50 border border-slate-900">
            <h2 className="text-2xl font-bold text-white border-l-4 border-emerald-500 pl-4 mb-6">14. Contact &amp; Data Protection Officer</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="font-bold text-white">Data Protection Officer</p>
                <p className="text-sm">Email: <span className="text-emerald-400">privacy@bounceback-sms.com</span></p>
                <p className="text-sm">Security: <span className="text-emerald-400">security@bounceback-sms.com</span></p>
                <p className="text-sm">Response: 24h for security, 30 days for data rights requests.</p>
              </div>
              <div className="space-y-3">
                <p className="font-bold text-white">EU Representative</p>
                <p className="text-sm">For GDPR Article 27: <span className="text-emerald-400">privacy@bounceback-sms.com</span> (subject: &ldquo;GDPR Representative&rdquo;)</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="py-12 border-t border-slate-900 px-4 text-center">
        <div className="max-w-7xl mx-auto space-y-2">
          <p className="text-slate-600 text-sm">© 2026 BounceBack SMS. All rights reserved.</p>
          <p className="text-slate-700 text-xs">Policy Version: {currentVersion} | Effective: {effectiveDate}</p>
          <p className="text-slate-700 text-xs">Protected by AES-256-GCM encryption • Registered under strict data compliance policies</p>
        </div>
      </footer>
    </div>
  );
}
