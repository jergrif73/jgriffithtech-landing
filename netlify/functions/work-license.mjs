// Free tool licenses for verified work emails. Logic lives in ../lib/work-license-core.mjs.
//
// POST /api/work-license { action: "start",  email, product }        -> emails a 6-digit code if the domain is free
// POST /api/work-license { action: "verify", email, product, code }  -> { checkout } a one-use $0 Gumroad link
//
// Netlify environment variables (none of these are in the repo):
//   FREE_EMAIL_DOMAINS    comma-separated domains that get the tools free (exact match)
//   GUMROAD_ACCESS_TOKEN  Gumroad application token, used only to create one-use offer codes
//   RESEND_API_KEY        sends the code email
//   LICENSE_MAIL_FROM     sender, e.g. "JGriffith Tech <licenses@jgriffithtech.com>"
//   WORK_LICENSE_SECRET   long random string; emails, IPs and codes are stored only as HMACs of it
// Until all five are set, every request answers 503 "not set up", so the page is safe to deploy early.
//
// Stored in Netlify Blobs ("work-license"): pending codes and send counts keyed by HMAC, and one record per
// issued offer code {email, product, offer, at} so Jeremiah can see who claimed what.
import { getStore, getDeployStore } from "@netlify/blobs";
import {
  PRODUCTS, CODE_TTL_MS, IP_STARTS_PER_HOUR,
  cleanEmail, looksLikeEmail, parseDomains, isEligible, makeCode, makeOfferName, cleanCode,
  sendWindow, checkCode, checkoutUrl, codeEmail,
} from "../lib/work-license-core.mjs";

const NEEDED = ["FREE_EMAIL_DOMAINS", "GUMROAD_ACCESS_TOKEN", "RESEND_API_KEY", "LICENSE_MAIL_FROM", "WORK_LICENSE_SECRET"];

const env = (k) => (typeof Netlify !== "undefined" ? Netlify.env.get(k) : process.env[k]) || "";

function store() {
  const prod = Netlify.context?.deploy?.context === "production";
  return prod ? getStore({ name: "work-license", consistency: "strong" }) : getDeployStore({ name: "work-license", consistency: "strong" });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));

async function hmac(text) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env("WORK_LICENSE_SECRET")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendCode(email, code, productName) {
  const { subject, text } = codeEmail(code, productName);
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + env("RESEND_API_KEY"), "Content-Type": "application/json" },
    body: JSON.stringify({ from: env("LICENSE_MAIL_FROM"), to: [email], subject, text }),
  });
  return r.ok;
}

async function makeOffer(productId) {
  const name = makeOfferName(randomBytes);
  const body = new URLSearchParams({
    access_token: env("GUMROAD_ACCESS_TOKEN"),
    name,
    amount_off: "100",
    offer_type: "percent",
    max_purchase_count: "1",
  });
  const r = await fetch("https://api.gumroad.com/v2/products/" + encodeURIComponent(productId) + "/offer_codes", { method: "POST", body });
  const d = await r.json().catch(() => null);
  return d && d.success ? name : null;
}

export default async (req, context) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  if (NEEDED.some((k) => !env(k))) return json({ error: "Free work-email licenses aren't set up yet." }, 503);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Bad request." }, 400); }
  const email = cleanEmail(body.email);
  const product = String(body.product || "");
  if (!PRODUCTS[product]) return json({ error: "Pick a tool." }, 400);
  if (!looksLikeEmail(email)) return json({ error: "That doesn't look like an email address." }, 400);
  if (!isEligible(email, parseDomains(env("FREE_EMAIL_DOMAINS")))) {
    return json({ error: "That email isn't on the free list. You can still try any tool free for 30 days." }, 403);
  }

  const s = store();
  const now = Date.now();
  const who = await hmac("email:" + email);
  const pendingKey = "pending/" + who + "/" + product;

  if (body.action === "start") {
    const ipKey = "ip/" + (await hmac("ip:" + (context?.ip || req.headers.get("x-nf-client-connection-ip") || "unknown")));
    const ipWin = sendWindow(await s.get(ipKey, { type: "json" }), now, IP_STARTS_PER_HOUR);
    const sendKey = "sends/" + who;
    const win = sendWindow(await s.get(sendKey, { type: "json" }), now);
    if (!ipWin.allowed || !win.allowed) return json({ error: "Too many requests. Wait an hour and try again." }, 429);

    const code = makeCode(randomBytes);
    await s.setJSON(pendingKey, { hash: await hmac("code:" + code), expires: now + CODE_TTL_MS, tries: 0 });
    await s.setJSON(sendKey, [...win.recent, now]);
    await s.setJSON(ipKey, [...ipWin.recent, now]);
    if (!(await sendCode(email, code, PRODUCTS[product].name))) return json({ error: "The email didn't send. Try again in a minute." }, 502);
    return json({ sent: true });
  }

  if (body.action === "verify") {
    const result = checkCode(await s.get(pendingKey, { type: "json" }), await hmac("code:" + cleanCode(body.code)), now);
    if (result.next) await s.setJSON(pendingKey, result.next); else await s.delete(pendingKey);
    if (!result.ok) return json({ error: result.reason }, 400);

    // One offer code per email per tool: asking again hands back the same link.
    const issuedKey = "issued/" + who + "/" + product;
    const issued = await s.get(issuedKey, { type: "json" });
    if (issued?.offer) return json({ checkout: checkoutUrl(product, issued.offer), again: true });

    const offer = await makeOffer(PRODUCTS[product].productId);
    if (!offer) return json({ error: "Couldn't make your free code just now. Try again, or email jeremiah@jgriffithtech.com." }, 502);
    await s.setJSON(issuedKey, { email, product, offer, at: now });
    return json({ checkout: checkoutUrl(product, offer) });
  }

  return json({ error: "Bad request." }, 400);
};

export const config = { path: "/api/work-license" };
