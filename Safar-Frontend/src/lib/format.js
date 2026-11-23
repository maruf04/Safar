// Formatting helpers shared across pages. They follow the current UI language,
// which the LangProvider sets via setFormatLang().

let LANG = 'en';
export const setFormatLang = (lang) => { LANG = lang === 'bn' ? 'bn' : 'en'; };

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export const localizeDigits = (str, lang = LANG) =>
  lang === 'bn' ? String(str).replace(/[0-9]/g, (d) => BN_DIGITS[d]) : String(str);

// Number with digits in the current language: 12 -> "১২"
export const num = (n) => localizeDigits(n);

const locale = () => (LANG === 'bn' ? 'bn-BD' : 'en-GB');

// "14:05:00" -> "2:05 PM" / "২:০৫ অপরাহ্ণ"
export const formatTime = (time) => {
  if (!time || typeof time !== 'string') return '';
  const [h, m] = time.split(':');
  const hours = parseInt(h, 10);
  if (Number.isNaN(hours)) return time;
  const pm = hours >= 12;
  const period = LANG === 'bn' ? (pm ? 'অপরাহ্ণ' : 'পূর্বাহ্ণ') : (pm ? 'PM' : 'AM');
  return localizeDigits(`${hours % 12 || 12}:${m} ${period}`);
};

const toMinutes = (time) => {
  if (!time || typeof time !== 'string') return null;
  const [h, m] = time.split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

export const durationMinutes = (dep, arr) => {
  const a = toMinutes(dep);
  const b = toMinutes(arr);
  if (a === null || b === null) return Infinity;
  let diff = b - a;
  if (diff < 0) diff += 24 * 60;
  return diff;
};

// Duration between two "HH:MM" times, wrapping past midnight. -> "5h 20m" / "৫ঘ ২০মি"
export const formatDuration = (dep, arr) => {
  const diff = durationMinutes(dep, arr);
  if (diff === Infinity) return '';
  const h = Math.floor(diff / 60);
  const m = `${diff % 60}`.padStart(2, '0');
  const [hu, mu] = LANG === 'bn' ? ['ঘ', 'মি'] : ['h', 'm'];
  return localizeDigits(h ? `${h}${hu} ${m}${mu}` : `${m}${mu}`);
};

export const hourOf = (time) => {
  const mins = toMinutes(time);
  return mins === null ? null : Math.floor(mins / 60);
};

// Date -> "2026-11-27" in local time (what the backend expects for doj). Never localized.
export const toISODate = (date) => {
  const d = new Date(date);
  const mm = `${d.getMonth() + 1}`.padStart(2, '0');
  const dd = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

// "2026-11-27" or a Date -> "Fri, 27 Nov 2026" / "শুক্র, ২৭ নভে, ২০২৬"
export const formatDate = (value, opts = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!value) return '';
  const d = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return localizeDigits(d.toLocaleDateString(locale(), opts));
};

export const formatMonth = (date) =>
  localizeDigits(new Date(date).toLocaleDateString(locale(), { month: 'long', year: 'numeric' }));

export const taka = (amount) => {
  const n = Number(amount);
  if (Number.isNaN(n)) return '৳—';
  return localizeDigits(`৳${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
};

// Database station names use underscores ("Dhaka_Airport") -> "Dhaka Airport"
export const stationName = (name) => (name ? String(name).replace(/_/g, ' ') : '');

// Phone numbers are stored as integers, so the leading 0 is lost (1700000000 -> 01700000000)
export const phoneNumber = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const s = String(value);
  return localizeDigits(/^\d{10}$/.test(s) ? `0${s}` : s);
};

export const initials = (first, last) =>
  `${(first || '').trim().charAt(0)}${(last || '').trim().charAt(0)}`.toUpperCase() || '?';
