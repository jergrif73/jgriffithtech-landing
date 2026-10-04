// Aggregated page-view stats. If a STATS_TOKEN environment variable is set on the site, ?t=<token> is required.
import { getStore, getDeployStore } from "@netlify/blobs";

function store() {
  const prod = Netlify.context?.deploy?.context === "production";
  return prod ? getStore({ name: "hits", consistency: "strong" }) : getDeployStore({ name: "hits", consistency: "strong" });
}

export default async (req) => {
  const url = new URL(req.url);
  const token = Netlify.env.get("STATS_TOKEN");
  if (token && url.searchParams.get("t") !== token) return new Response("forbidden", { status: 403 });
  const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get("days") || "30", 10)));
  const s = store();
  const { blobs } = await s.list({ prefix: "day/" });
  const keys = blobs.map((b) => b.key).sort().slice(-days);
  const daily = [];
  const pages = {}; const refs = {}; const countries = {}; const cities = {}; let total = 0;
  for (const key of keys) {
    const d = await s.get(key, { type: "json" });
    if (!d) continue;
    daily.push({ day: key.slice(4), total: d.total });
    total += d.total;
    for (const [p, v] of Object.entries(d.pages)) {
      const pg = pages[p] || { n: 0, refs: {}, countries: {} };
      pg.n += v.n;
      for (const [r, n] of Object.entries(v.refs)) pg.refs[r] = (pg.refs[r] || 0) + n;
      for (const [c, n] of Object.entries(v.countries || {})) pg.countries[c] = (pg.countries[c] || 0) + n;
      pages[p] = pg;
    }
    for (const [r, n] of Object.entries(d.refs)) refs[r] = (refs[r] || 0) + n;
    for (const [c, n] of Object.entries(d.countries || {})) countries[c] = (countries[c] || 0) + n;
    for (const [c, n] of Object.entries(d.cities || {})) cities[c] = (cities[c] || 0) + n;
  }
  return Response.json({ days, total, daily, pages, refs, countries, cities, generated: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } });
};

export const config = { path: "/api/stats" };
