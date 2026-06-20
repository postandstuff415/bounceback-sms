import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that should NOT require authentication
const PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/checkout",
  "/api/webhooks/stripe",
  "/api/webhooks/twilio-voice",
  "/api/webhooks/twilio-status",
  "/api/intake/",
  "/_next/",
  "/favicon.ico",
  "/privacy",
  "/terms",
  "/onboard",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return applySecurityHeaders(NextResponse.next());
  }

  // For API routes that require auth, apply security headers
  if (pathname.startsWith("/api/")) {
    return applySecurityHeaders(NextResponse.next());
  }

  return applySecurityHeaders(NextResponse.next());
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "frame-src 'self' https://js.stripe.com https://*.stripe.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.stripe.com https://*.stripe.com https://fcm.googleapis.com",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; ")
  );

  // Strict Transport Security (HSTS)
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  // X-Frame-Options
  response.headers.set("X-Frame-Options", "DENY");

  // X-Content-Type-Options
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Referrer-Policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions-Policy
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  // X-XSS-Protection (deprecated but still widely supported)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Remove Server header (information disclosure)
  response.headers.delete("Server");

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static files
    "/((?!_next/static|_next/image|out/).*)",
  ],
};
