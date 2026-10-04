// Page-view beacon. Receives {p: path, r: referrer} and increments daily counters in Netlify Blobs.
// No cookies, no IP storage: only path, referrer host and the day.
import { getStore, getDeployStore } from "@netlify/blobs";

const OWN_HOSTS = new Set(["jgriffithtech.com", "www.jgriffithtech.com", "jgriffithtech.netlify.app"]);

function store() {
  const prod = Netlify.context?.deploy?.context === "production";
  return prod ? getStore({ name: "hits", consistency: "strong" }) : getDeployStore({ name: "hits", consistency: "strong" });
}

function refHost(r) {
  if (!r) return "direct";
  try {
    const h = new URL(r).hostname.replace(/^www\./, "");
    if (OWN_HOSTS.has(h) || OWN_HOSTS.has("www." + h)) return "internal";
    return h.slice(0, 80);
  } catch {
    return "direct";
  }
}

export default async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  let body = {};
  try { body = await req.json(); } catch { return new Response(null, { status: 400 }); }
  let p = typeof body.p === "string" ? body.p : "/";
  if (!p.startsWith("/") || p.length > 200) p = "/";
  p = p.replace(/\.html$/, "").replace(/\/index$/, "/") || "/";
  if (p === "/stats") return new Response(null, { status: 204 });
  const ref = refHost(body.r);
  const day = new Date().toISOString().slice(0, 10);
  const key = "day/" + day;
  const s = store();
  const d = (await s.get(key, { type: "json" })) || { total: 0, pages: {}, refs: {} };
  d.total += 1;
  const pg = d.pages[p] || { n: 0, refs: {} };
  pg.n += 1; pg.refs[ref] = (pg.refs[ref] || 0) + 1; d.pages[p] = pg;
  d.refs[ref] = (d.refs[ref] || 0) + 1;
  await s.setJSON(key, d);
  return new Response(null, { status: 204 });
};

export const config = { path: "/api/hit" };
