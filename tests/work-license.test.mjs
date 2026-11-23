// node --test tests/   (Node 20+). Pure logic plus the function end to end with fake Blobs, Resend and Gumroad.
import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import {
  PRODUCTS, parseDomains, isEligible, domainOf, looksLikeEmail, makeCode, makeOfferName,
  sendWindow, checkCode, checkoutUrl, cleanCode, MAX_TRIES,
} from "../netlify/lib/work-license-core.mjs";

const bytes = (vals) => (n) => Uint8Array.from({ length: n }, (_, i) => vals[i % vals.length]);

test("domains come only from the setting, exact match", () => {
  const d = parseDomains(" Example.com, @second.org ,, not a domain, ");
  assert.deepEqual([...d], ["example.com", "second.org"]);
  assert.equal(isEligible("Pat@EXAMPLE.com ", d), true);
  assert.equal(isEligible("pat@mail.example.com", d), false);
  assert.equal(isEligible("pat@example.com.evil.net", d), false);
  assert.equal(isEligible("pat@example.co", d), false);
  assert.equal(isEligible("example.com", d), false);
  assert.equal(isEligible("pat@example.com", parseDomains("")), false);
  assert.equal(isEligible("pat@example.com", parseDomains(undefined)), false);
  assert.equal(domainOf("a@b@c.com"), "c.com");
  assert.equal(looksLikeEmail("a@b@c.com"), false);
});

test("codes and offer names", () => {
  assert.equal(makeCode(bytes([0, 0, 0, 7])), "000007");
  assert.match(makeCode(bytes([255, 255, 255, 255])), /^\d{6}$/);
  const name = makeOfferName(bytes([1, 2, 3]));
  assert.match(name, /^WE[A-Z2-9]{10}$/);
  assert.equal(cleanCode(" 12 34-56 "), "123456");
});

test("send window keeps the last hour and caps it", () => {
  const now = 10 * 3600 * 1000;
  const w = sendWindow([now - 4000 * 1000, now - 10, now - 20, now - 30], now);
  assert.equal(w.recent.length, 3);
  assert.equal(w.allowed, false);
  assert.equal(sendWindow(null, now).allowed, true);
});

test("code check: match, expiry, wrong tries", () => {
  const p = { hash: "h", expires: 100, tries: 0 };
  assert.equal(checkCode(null, "h", 1).ok, false);
  assert.deepEqual(checkCode(p, "h", 50), { ok: true, reason: "", next: null });
  assert.equal(checkCode(p, "h", 101).next, null);
  let cur = p;
  for (let i = 1; i < MAX_TRIES; i++) { const r = checkCode(cur, "x", 50); assert.equal(r.ok, false); assert.equal(r.next.tries, i); cur = r.next; }
  assert.equal(checkCode(cur, "x", 50).next, null);
});

test("checkout links go to the tool's own Gumroad page", () => {
  assert.equal(checkoutUrl("navisworks", "WEABC"), "https://jgriffithtech.gumroad.com/l/jgt-navisworks/WEABC");
  assert.deepEqual(Object.keys(PRODUCTS), ["navisworks", "forma-tools", "clash-export"]);
});

// ---- end to end with fakes ----
register("data:text/javascript," + encodeURIComponent(`
  export async function resolve(spec, ctx, next) {
    if (spec === "@netlify/blobs") return { url: "data:text/javascript," + encodeURIComponent(
      "const m = globalThis.__blobs; const s = { get: async (k) => m.has(k) ? JSON.parse(m.get(k)) : null, setJSON: async (k, v) => { m.set(k, JSON.stringify(v)); }, delete: async (k) => { m.delete(k); } };" +
      "export const getStore = () => s; export const getDeployStore = () => s;"), shortCircuit: true };
    return next(spec, ctx);
  }`));

test("function: start emails a code, verify mints one offer, again returns the same link", async () => {
  globalThis.__blobs = new Map();
  const envs = { FREE_EMAIL_DOMAINS: "example.com", GUMROAD_ACCESS_TOKEN: "t", RESEND_API_KEY: "r", LICENSE_MAIL_FROM: "x <a@b.com>", WORK_LICENSE_SECRET: "s".repeat(40) };
  globalThis.Netlify = { env: { get: (k) => envs[k] }, context: { deploy: { context: "production" } } };
  const sent = [], offers = [];
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith("https://api.resend.com")) { sent.push(JSON.parse(init.body)); return { ok: true }; }
    if (String(url).includes("/offer_codes")) { const p = new URLSearchParams(init.body); offers.push({ url: String(url), p: Object.fromEntries(p) }); return { ok: true, json: async () => ({ success: true }) }; }
    throw new Error("unexpected fetch " + url);
  };
  const { default: fn } = await import("../netlify/functions/work-license.mjs");
  const post = async (b) => { const r = await fn(new Request("https://x/api/work-license", { method: "POST", body: JSON.stringify(b) }), { ip: "1.2.3.4" }); return { status: r.status, body: await r.json() }; };

  assert.equal((await post({ action: "start", email: "pat@other.com", product: "navisworks" })).status, 403);
  assert.equal((await post({ action: "start", email: "pat@example.com", product: "nope" })).status, 400);
  assert.equal(sent.length, 0);

  const s = await post({ action: "start", email: "Pat@Example.com", product: "navisworks" });
  assert.deepEqual(s, { status: 200, body: { sent: true } });
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].to, ["pat@example.com"]);
  const code = sent[0].text.match(/\b(\d{6})\b/)[1];
  assert.ok(![...globalThis.__blobs.entries()].some(([k, v]) => k !== "config/secret" && v.includes(code)), "code is stored only as a hash");
  assert.ok(![...globalThis.__blobs.keys()].some((k) => k.includes("example")), "keys hold no email");

  const wrong = await post({ action: "verify", email: "pat@example.com", product: "navisworks", code: code === "000000" ? "111111" : "000000" });
  assert.equal(wrong.status, 400);
  assert.equal(offers.length, 0);

  const ok = await post({ action: "verify", email: "pat@example.com", product: "navisworks", code });
  assert.equal(ok.status, 200);
  assert.match(ok.body.checkout, /^https:\/\/jgriffithtech\.gumroad\.com\/l\/jgt-navisworks\/WE[A-Z2-9]{10}$/);
  assert.equal(offers.length, 1);
  assert.ok(offers[0].url.endsWith("/products/" + encodeURIComponent(PRODUCTS.navisworks.productId) + "/offer_codes"));
  assert.equal(offers[0].p.amount_off, "100");
  assert.equal(offers[0].p.offer_type, "percent");
  assert.equal(offers[0].p.max_purchase_count, "1");

  assert.equal((await post({ action: "verify", email: "pat@example.com", product: "navisworks", code })).status, 400, "a used code is gone");

  await post({ action: "start", email: "pat@example.com", product: "navisworks" });
  const code2 = sent[1].text.match(/\b(\d{6})\b/)[1];
  const again = await post({ action: "verify", email: "pat@example.com", product: "navisworks", code: code2 });
  assert.equal(again.body.checkout, ok.body.checkout);
  assert.equal(again.body.again, true);
  assert.equal(offers.length, 1, "no second offer for the same person and tool");

  await post({ action: "start", email: "pat@example.com", product: "navisworks" });
  assert.equal((await post({ action: "start", email: "pat@example.com", product: "navisworks" })).status, 429, "three emails an hour per address");
});

test("function: answers 503 until every setting exists", async () => {
  globalThis.Netlify = { env: { get: () => "" }, context: {} };
  const { default: fn } = await import("../netlify/functions/work-license.mjs?unset");
  const r = await fn(new Request("https://x/api/work-license", { method: "POST", body: "{}" }), {});
  assert.equal(r.status, 503);
});

test("function: with no secret setting, makes one once and keeps using it", async () => {
  globalThis.__blobs.clear(); // the fake Blobs module holds the Map from the first test
  const envs = { FREE_EMAIL_DOMAINS: "example.com", GUMROAD_ACCESS_TOKEN: "t", RESEND_API_KEY: "r", LICENSE_MAIL_FROM: "x <a@b.com>" };
  globalThis.Netlify = { env: { get: (k) => envs[k] }, context: { deploy: { context: "production" } } };
  const sent = [];
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith("https://api.resend.com")) { sent.push(JSON.parse(init.body)); return { ok: true }; }
    if (String(url).includes("/offer_codes")) return { ok: true, json: async () => ({ success: true }) };
    throw new Error("unexpected fetch " + url);
  };
  const { default: fn } = await import("../netlify/functions/work-license.mjs?nosecret");
  const post = async (b) => { const r = await fn(new Request("https://x/api/work-license", { method: "POST", body: JSON.stringify(b) }), { ip: "1.2.3.4" }); return { status: r.status, body: await r.json() }; };
  assert.equal((await post({ action: "start", email: "pat@example.com", product: "clash-export" })).status, 200);
  const first = JSON.parse(globalThis.__blobs.get("config/secret")).secret;
  assert.match(first, /^[0-9a-f]{64}$/);
  const code = sent[0].text.match(/\b(\d{6})\b/)[1];
  const ok = await post({ action: "verify", email: "pat@example.com", product: "clash-export", code });
  assert.equal(ok.status, 200, "the code made before still checks out, so the same secret was reused");
  assert.equal(JSON.parse(globalThis.__blobs.get("config/secret")).secret, first);
});
