# 📲 BounceBack SMS

**Recover lost revenue for small businesses by automatically texting customers the moment a call is missed.**

BounceBack SMS is a Micro-SaaS platform designed for local service providers (plumbers, salons, detailers) and marketing agencies. It intercepts missed calls and immediately sends a text-back with a booking link, ensuring leads don't go to competitors.

## 🚀 Key Features

- **Automated Lead Recovery:** Intercepts missed calls (busy/no-answer) and sends an immediate SMS response.
- **Native Mobile Dashboard:** High-fidelity, mobile-optimized dashboard built with CapacitorJS for real-time monitoring and push notifications.
- **Automated Onboarding:** 3-step setup flow with Stripe Checkout integration and automated Twilio number provisioning.
- **ROI Tracking:** Real-time analytics on recovery rates and estimated revenue saved ($60/lead).
- **Growth Engine:** Built-in Google Maps scraper for automated lead generation and personalized 1-click onboarding.
- **Proof-of-Value Reports:** Automated monthly SMS reports sent to business owners summarizing their saved revenue.

## 🛠 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** Prisma + PostgreSQL (Turso compatible)
- **Styling:** Tailwind CSS (Dark Mode optimized)
- **Mobile:** CapacitorJS (Native iOS/Android shell)
- **Integrations:** Twilio (SMS/Voice), Stripe (Billing), Resend (Email), Firebase (Push Notifications)

## 📁 Project Structure

- `/src/app/api/webhooks`: Twilio and Stripe webhook handlers.
- `/src/app/onboard`: Step-by-Step subscription and setup flow.
- `/src/app/page.tsx`: Native-optimized Analytics Dashboard.
- `/scripts/maps-scraper.ts`: Automated lead generation and nurturing script.
- `/scripts/monthly-report.ts`: ROI reporting worker.
- `/scripts/build-mobile.js`: Build pipeline for Next.js/Capacitor hybrid.

## ⚙️ Setup & Installation

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Database Setup:**
   Configure `DATABASE_URL` in `.env` and run migrations:
   ```bash
   npx prisma db push
   ```

3. **Run Development Server:**
   ```bash
   npm run dev
   ```

4. **Mobile Build (iOS/Android):**
   ```bash
   node scripts/build-mobile.js
   npx cap sync
   ```

## 📈 Marketing & Growth Scripts

### Google Maps Lead Generation
Searches for qualified local businesses (Ratings >= 4.0, 15+ reviews) and sends personalized 1-click activation emails.
```bash
npx tsx scripts/maps-scraper.ts "Plumbers, Austin TX"
```

### Monthly ROI Report
Analyzes call telemetry and dispatches proof-of-value SMS to all active accounts.
```bash
npx tsx scripts/monthly-report.ts
```

---
Built by Team BounceBack SMS.

## 🤖 AI FrontDesk (Add-on)
BounceBack SMS now includes an AI-powered FrontDesk intake system.
- **Automated Intake:** Captures customer emergency details via a public portal.
- **AI Triage:** Uses Google Gemini to analyze issues and compute urgency levels (LOW to CRITICAL).
- **Dispatch Integration:** Mocks a handshake with field dispatch systems (ServiceTitan/Jobber).
- **Push Telemetry:** Alerts owners via native app when a high-urgency ticket is created.

**Intake Portal URL:** `/intake/[accountId]`
