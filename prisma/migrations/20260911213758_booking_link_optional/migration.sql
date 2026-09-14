-- Booking/Scheduling link is now optional. Contractors who skip it get the
-- conversational missed-call fallback copy instead of a booking-link message.
-- Widening NOT NULL -> NULL: non-destructive, existing rows are unaffected.
ALTER TABLE "Account" ALTER COLUMN "bookingLink" DROP NOT NULL;
