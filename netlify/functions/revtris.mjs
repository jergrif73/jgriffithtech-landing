// Revtris leaderboard. One board per starting level + command pool, stored in Netlify Blobs.
// GET  /api/revtris?l=1&p=14            -> { scores: [{ name, score }] } (top 10)
// POST /api/revtris { name, score, l, p } -> same, after inserting
// Stores only the name the player types, the score and the time. No IPs, no cookies.
import { getStore, getDeployStore } from "@netlify/blobs";
import { isNameAllowed } from "../lib/name-filter.mjs";

const LEVELS = new Set([1, 5, 10]);
const POOLS = new Set([14, 20, 30, 40]);
const KEEP = 50;
const SHOW = 10;
const MAX_SCORE = 10000000;

function store() {
  const prod = Netlify.context?.deploy?.context === "production";
  return prod ? getStore({ name: "revtris", consistency: "strong" }) : getDeployStore({ name: "revtris", consistency: "strong" });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export default async (req) => {
  const url = new URL(req.url);
  let body = {};
  if (req.method === "POST") {
    try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  } else if (req.method !== "GET") {
    return new Response(null, { status: 405 });
  }

  const l = parseInt(body.l ?? url.searchParams.get("l"), 10);
  const p = parseInt(body.p ?? url.searchParams.get("p"), 10);
  if (!LEVELS.has(l) || !POOLS.has(p)) return json({ error: "unknown board" }, 400);

  const key = `board/L${l}_P${p}`;
  const s = store();
  let list = (await s.get(key, { type: "json" })) || [];

  if (req.method === "POST") {
    const name = String(body.name || "").trim().toUpperCase().slice(0, 10);
    const score = Number(body.score);
    if (!isNameAllowed(name)) return json({ error: "name" }, 400);
    if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) return json({ error: "score" }, 400);
    list.push({ name, score, t: Date.now() });
    list.sort((a, b) => b.score - a.score || a.t - b.t);
    list = list.slice(0, KEEP);
    await s.setJSON(key, list);
  }

  return json({ scores: list.slice(0, SHOW).map(({ name, score }) => ({ name, score })) });
};

export const config = { path: "/api/revtris" };
