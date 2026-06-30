import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

// Decodes the base64-encoded service-account JSON from FIREBASE_SERVICE_ACCOUNT_B64
// and lazily initializes a single Firebase Admin app (guarded against hot-reload
// re-initialization in dev). Returns null when the credential is not configured so
// callers can fall back to console-only telemetry.
let cachedMessaging: Messaging | null = null;

function getServiceAccount(): Record<string, unknown> | null {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64 || b64.trim() === "" || b64 === "your_firebase_service_account_b64_here") {
    return null;
  }

  try {
    const json = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(json);
  } catch (err: any) {
    console.error(
      "[Firebase Admin] Failed to decode/parse FIREBASE_SERVICE_ACCOUNT_B64:",
      err.message
    );
    return null;
  }
}

function getFirebaseApp(): App | null {
  if (getApps().length > 0) {
    return getApp();
  }

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    return null;
  }

  try {
    return initializeApp({
      credential: cert(serviceAccount as any),
    });
  } catch (err: any) {
    console.error("[Firebase Admin] Failed to initialize app:", err.message);
    return null;
  }
}

/**
 * Returns a Firebase Cloud Messaging instance, or null when no service-account
 * credential is configured. Cached so initialization only happens once.
 */
export function getFcmMessaging(): Messaging | null {
  if (cachedMessaging) {
    return cachedMessaging;
  }

  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  cachedMessaging = getMessaging(app);
  return cachedMessaging;
}
