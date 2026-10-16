// Download counter. /dl/<file>.zip counts one download, then redirects to /downloads/<file>.zip.
// Like the page-view beacon: no cookies, no IP stored; only the file, the day, the referrer host and the country.
// Counts are kept per day under "dl/YYYY-MM-DD" in the same "hits" store, so /api/stats can add them up.
import { getStore, getDeployStore } from "@netlify/blobs";

const SAFE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}\.zip$/;
// Link checkers, crawlers and scripted fetches (including my own release checks) aren't people downloading.
const NOT_A_PERSON = /bot|crawl|spider|slurp|preview|facebookexternalhit|curl|wget|python|httpclient|headless|powershell|go-http|java\//i;
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

export default async (req, context) => {
  const url = new URL(req.url);
  let file = "";
  try { file = decodeURIComponent(url.pathname.replace(/^\/dl\//, "")); } catch { /* bad escape */ }
  if (!SAFE.test(file)) return new Response("Not found", { status: 404 });
  const target = new URL("/downloads/" + file, url);

  // Only count files that exist, so a mistyped link doesn't add a row.
  const head = await fetch(target, { method: "HEAD" }).catch(() => null);
  if (!head || !head.ok) return new Response("Not found", { status: 404 });

  const ua = req.headers.get("user-agent") || "";
  if (req.method === "GET" && ua && !NOT_A_PERSON.test(ua)) {
    try {
      const g = context?.geo || {};
      const country = (g.country?.code || "??") + (g.country?.name ? " " + g.country.name : "");
      const ref = refHost(req.headers.get("referer"));
      const key = "dl/" + new Date().toISOString().slice(0, 10);
      const s = store();
      const d = (await s.get(key, { type: "json" })) || { total: 0, files: {} };
      d.total += 1;
      const f = d.files[file] || { n: 0, refs: {}, countries: {} };
      f.n += 1;
      f.refs[ref] = (f.refs[ref] || 0) + 1;
      f.countries[country] = (f.countries[country] || 0) + 1;
      d.files[file] = f;
      await s.setJSON(key, d);
    } catch { /* a counting failure never blocks the download */ }
  }
  return new Response(null, { status: 302, headers: { Location: target.pathname, "Cache-Control": "no-store" } });
};

export const config = { path: "/dl/*" };
