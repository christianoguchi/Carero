import { format, parseISO } from 'date-fns';

/**
 * Normalise a phone number to international digits (no +), assuming UK for local numbers.
 * "07700 900123" -> "447700900123", "+44 7700 900123" -> "447700900123". Returns null if unusable.
 */
export function toInternational(phone: string | undefined | null): string | null {
  if (!phone) return null;
  let digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = '44' + digits.slice(1);
  digits = digits.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export const coverLink = (origin: string, token: string) => `${origin}/cover/${token}`;

/** Deliberately minimal: no service user name or care details leave the system in the message. */
export function coverMessage(opts: {
  staffFirstName: string;
  centre: string;
  date: string;
  start: string;
  end: string;
  link: string;
}) {
  const day = format(parseISO(opts.date), 'EEEE d MMMM');
  return (
    `Hi ${opts.staffFirstName}, can you cover a shift at ${opts.centre} on ${day}, ${opts.start}–${opts.end}? ` +
    `Tap to accept or decline: ${opts.link}`
  );
}

export const whatsappUrl = (phone: string | null, text: string) =>
  phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;

export const smsUrl = (phone: string, text: string) => `sms:+${phone}?&body=${encodeURIComponent(text)}`;
