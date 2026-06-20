/**
 * Utility for input sanitization and XSS prevention.
 */

/**
 * Sanitize a string for safe HTML display by escaping HTML entities.
 */
export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };
  return str.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Sanitize a string for use in SQL queries (Prisma parameterizes, 
 * so this is just an extra defense layer).
 */
export function sanitizeInput(str: string, maxLength: number = 1000): string {
  return str
    .trim()
    .substring(0, maxLength)
    .replace(/[\0\x08\x09\x1a\n\r"'\\%_;]/g, "")
    .trim();
}

/**
 * Validate and sanitize an email address.
 */
export function sanitizeEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return null;
  return trimmed.substring(0, 254);
}

/**
 * Validate and sanitize a phone number.
 */
export function sanitizePhone(phone: string): string | null {
  const cleaned = phone.replace(/[^0-9+]/g, "");
  if (cleaned.length < 10 || cleaned.length > 16) return null;
  return cleaned;
}

/**
 * Sanitize a URL for safety (prevent javascript: etc).
 */
export function sanitizeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return null;
  // Remove any potential XSS via data URIs or javascript:
  if (/[<>"'\\]/.test(trimmed)) return null;
  return trimmed.substring(0, 2048);
}
