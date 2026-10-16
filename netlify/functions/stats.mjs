// Aggregated page-view stats, plus file downloads counted by /dl/* (dl.mjs). If a STATS_TOKEN environment variable is set on the site, ?t=<token> is required.
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
  // Downloads: kept under "dl/YYYY-MM-DD" only on days with a download, so the window is by date, not by count.
  const since = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const dlList = await s.list({ prefix: "dl/" });
  const dlKeys = dlList.blobs.map((b) => b.key).filter((k) => k.slice(3) >= since).sort();
  const downloads = { total: 0, files: {}, daily: [] };
  for (const key of dlKeys) {
    const d = await s.get(key, { type: "json" });
    if (!d) continue;
    downloads.daily.push({ day: key.slice(3), total: d.total });
    downloads.total += d.total;
    for (const [f, v] of Object.entries(d.files || {})) {
      const t = downloads.files[f] || { n: 0, refs: {}, countries: {} };
      t.n += v.n;
      for (const [r, n] of Object.entries(v.refs || {})) t.refs[r] = (t.refs[r] || 0) + n;
      for (const [c, n] of Object.entries(v.countries || {})) t.countries[c] = (t.countries[c] || 0) + n;
      downloads.files[f] = t;
    }
  }
  return Response.json({ days, total, daily, pages, refs, countries, cities, downloads, generated: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } });
};

export const config = { path: "/api/stats" };
