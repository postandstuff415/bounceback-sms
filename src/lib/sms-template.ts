/**
 * Missed-call text-back copy.
 *
 * Two shapes, decided by whether the contractor supplied a booking link:
 *  - link present -> the account's smsTemplate, with {booking_link} substituted
 *  - no link      -> a conversational fallback that opens a reply thread rather
 *                    than pointing the lead at a scheduler that doesn't exist
 */

export const DEFAULT_SMS_TEMPLATE =
  "Hi, we missed your call. Here is our booking link to secure your spot: {booking_link}";

export const NO_LINK_FALLBACK_SMS =
  "Hey, sorry I missed your call, I'm tied up on a job right now. How can I help you, and what area or neighborhood are you located in?";

const PLACEHOLDER = "{booking_link}";

export function buildMissedCallSms(account: {
  bookingLink?: string | null;
  smsTemplate?: string | null;
}): string {
  const link = account.bookingLink?.trim();

  // No link on file: the booking-link copy would read as a broken promise.
  if (!link) return NO_LINK_FALLBACK_SMS;

  const template = account.smsTemplate?.trim() || DEFAULT_SMS_TEMPLATE;
  const body = template.split(PLACEHOLDER).join(link).trim();

  // A custom template that never referenced the placeholder would silently drop
  // the link, so append it to keep the message actionable.
  return template.includes(PLACEHOLDER) ? body : `${body} ${link}`.trim();
}
