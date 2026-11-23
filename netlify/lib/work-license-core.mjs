// Free licenses for verified work emails: pure logic, no network or storage, tested by tests/work-license.test.mjs.
//
// How it works: someone enters a work email on /work-email. If its domain is on the free list, the site emails a
// 6-digit code to that address. Entering the code proves they own the address, and the site then makes a one-use
// 100%-off Gumroad offer code for the tool they picked, so they check out at $0 and get a normal Gumroad license key.
// The tools themselves don't change: they keep verifying Gumroad keys as before.
//
// The list of free domains is NOT in this repo. It comes from the FREE_EMAIL_DOMAINS environment variable set in
// Netlify (comma separated), so no company name is ever committed.

export const PRODUCTS = {
  navisworks: {
    name: "JGT Navisworks Tools (all three)",
    productId: "jM6JoHb4n7p3rsr8tBU6YA==",
    url: "https://jgriffithtech.gumroad.com/l/jgt-navisworks",
  },
  "forma-tools": {
    name: "JGT Forma Model Coordination Tools Pro",
    productId: "2aFWC6EbmUPmULrzIuvc2w==",
    url: "https://jgriffithtech.gumroad.com/l/forma-tools",
  },
  "clash-export": {
    name: "JGT Forma Clash Export Pro",
    productId: "7ZHRmKrAhBQPMSRy8rv3yw==",
    url: "https://jgriffithtech.gumroad.com/l/clash-export",
  },
};

export const CODE_TTL_MS = 15 * 60 * 1000;      // an emailed code works for 15 minutes
export const MAX_TRIES = 5;                       // wrong guesses before the code is thrown away
export const SENDS_PER_HOUR = 3;                  // emails to one address per hour
export const IP_STARTS_PER_HOUR = 10;             // start requests from one IP per hour

const EMAIL = /^[A-Za-z0-9._%+-]{1,64}@([A-Za-z0-9-]{1,63}\.)+[A-Za-z]{2,24}$/;

export function cleanEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

export function looksLikeEmail(email) {
  const e = cleanEmail(email);
  return e.length <= 254 && EMAIL.test(e);
}

export function domainOf(email) {
  const e = cleanEmail(email);
  const at = e.lastIndexOf("@");
  return at < 0 ? "" : e.slice(at + 1);
}

/** "a.com, B.com ,,c.com" -> Set {a.com, b.com, c.com}. Blank or missing -> empty set (nothing is free). */
export function parseDomains(value) {
  return new Set(
    String(value ?? "")
      .split(",")
      .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
      .filter((d) => /^([a-z0-9-]{1,63}\.)+[a-z]{2,24}$/.test(d)),
  );
}

/** Exact domain match only: a listed "example.com" does not cover "mail.example.com" or "example.com.evil.net". */
export function isEligible(email, domains) {
  return looksLikeEmail(email) && domains.has(domainOf(email));
}

/** Six digits, from a source of random bytes (crypto.getRandomValues in production, fixed bytes in tests). */
export function makeCode(randomBytes) {
  const b = randomBytes(4);
  const n = ((b[0] << 24) >>> 0) + (b[1] << 16) + (b[2] << 8) + b[3];
  return String(n % 1000000).padStart(6, "0");
}

/** Gumroad offer code name: letters and digits only, nothing about the person or their company. */
export function makeOfferName(randomBytes) {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = randomBytes(10);
  let s = "";
  for (let i = 0; i < 10; i++) s += abc[b[i] % abc.length];
  return "WE" + s;
}

export function cleanCode(code) {
  return String(code ?? "").replace(/\D/g, "");
}

/** Keep only the sends from the last hour, and say whether another is allowed. */
export function sendWindow(times, now, limit = SENDS_PER_HOUR) {
  const recent = (Array.isArray(times) ? times : []).filter((t) => now - t < 3600 * 1000);
  return { recent, allowed: recent.length < limit };
}

/**
 * A pending code record {hash, expires, tries} checked against a guess's hash.
 * Returns { ok, reason, next } where next is the record to store (null = delete it).
 */
export function checkCode(pending, guessHash, now) {
  if (!pending) return { ok: false, reason: "No code is waiting for this email. Ask for a new one.", next: null };
  if (now > pending.expires) return { ok: false, reason: "That code has expired. Ask for a new one.", next: null };
  if (pending.hash === guessHash) return { ok: true, reason: "", next: null };
  const tries = (pending.tries || 0) + 1;
  if (tries >= MAX_TRIES) return { ok: false, reason: "Too many wrong tries. Ask for a new code.", next: null };
  return { ok: false, reason: "That code doesn't match. Check the email and try again.", next: { ...pending, tries } };
}

export function checkoutUrl(product, offerName) {
  return PRODUCTS[product].url + "/" + encodeURIComponent(offerName);
}

export function codeEmail(code, productName) {
  const subject = "Your JGriffith Tech code: " + code;
  const text =
    "Your code is " + code + ".\n\n" +
    "Enter it on the JGriffith Tech page you just used to get " + productName + " free. It works for 15 minutes.\n\n" +
    "If you didn't ask for this, you can ignore this email.\n\nJeremiah Griffith\nJGriffith Tech";
  return { subject, text };
}
