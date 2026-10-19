// Player-name filter for public leaderboards. Server-side only, so the list is never shipped to browsers.
//
// What it catches:
//   - leetspeak and look-alikes (N1GG3R, SH1T, FVCK, B00B, 5LUT, PHUCK, @$$ ...)
//   - stretched letters (FUUUUCK, SHIIIT)
//   - spaced-out words (F U C K) and words hidden inside a name (XXFUCKXX)
//   - names spelled backwards (KCUF)
//   - calculator words read upside down (5318008, 58008)
//   - number codes anywhere in a name (69, 420, 666, 1488 ...) and on their own (88, 14)
//
// Words are stored rot13-encoded so the source isn't a wall of slurs. To add one, rot13 it
// (e.g. on rot13.com) and append it to the right list.

const rot13 = w => w.replace(/[a-z]/g, c => String.fromCharCode(((c.charCodeAt(0) - 84) % 26) + 97));

// Blocked anywhere in the name.
const WORDS = [
  // profanity / sexual
  "shpx", "fuvg", "phag", "gjng", "jnax", "ovgpu", "ovngpu", "onfgneq", "qvpx", "pbpx", "cevpx", "chffl", "cravf",
  "intvan", "intva", "pyvg", "obbo", "gvgf", "gvggl", "gvg", "qvyqb", "wvmm", "phz", "fcrez", "frzra", "fzhg", "cbea",
  "fyhg", "juber", "jube", "unaqwbo", "oybjwbo", "oybjvr", "nany", "nahf", "nefr", "nff", "nffubyr", "chor", "rerpg",
  "betl", "betnfz", "fdhveg", "gjrex", "obyybpx", "ohgg", "cvff", "erpghz", "qbhpur", "frkl", "frk", "encr", "encvfg",
  "zbyrfg", "crqb", "snc", "srgvfu", "ubeal", "ahqr", "obare", "uneqba", "kkk", "grfgvp", "fpebg", "onyyfnpx",
  "ahgfnpx", "cbbc", "gheq", "penc", "zbgures",
  // slurs / hate
  "avtt", "avtn", "avttre", "avttn", "arteb", "pbba", "fcvp", "puvax", "tbbx", "xvxr", "jrgonpx", "ornare", "snt",
  "snttbg", "qlxr", "genaal", "furznyr", "ergneq", "erqfxva", "tlccb", "tlcfl", "enturnq", "gbjryurnq", "anmv",
  "uvgyre", "ervpu", "xxx", "fvrturvy", "urvy", "jcjj", "vfvf", "wvunq",
  // abuse / shorthand
  "xlf", "xvyylbhefrys", "fgsh", "tgsb", "jgs", "fhvpvqr",
  // short spellings and phrases
  "shx", "spx", "fhpxzl", "rngzl", "oybjzr", "yvpxzl", "pahg", "zbsb", "gubg",
  "avoo", "ajbeq", "ubzb", "yrfob", "fxnax", "zvys", "oryyraq", "chfl", "chff",
].map(rot13);

// Also checked spelled backwards. Kept to strong words: short ones reversed (ASS -> SSA) hit real names.
const REVERSE = [
  "shpx", "fuvg", "phag", "ovgpu", "qvpx", "pbpx", "fyhg", "juber", "cravf", "cbea", "chffl", "avtt", "avtn",
  "snttbg", "anmv", "uvgyre", "gjng", "jnax", "qvyqb", "wvmm", "nffubyr", "onfgneq", "ergneq", "obbo",
].map(rot13);

// Matched as plain letters only (no look-alikes): look-alikes would catch MEDIC, PREDICT, ...
const LITERAL = ["qvx"].map(rot13);

// Blocked only when the whole name (spaces removed) is this word, look-alikes included (G4Y, H0E).
const EXACT = ["hoe", "hoes", "gay", "gays", "fml", "omfg", "dilf"];
// Number codes: blocked anywhere in the name (PLAYER69, 420BLAZE) ...
const NUMBERS_ANYWHERE = ["69", "420", "666", "1488", "8008", "80085", "5318008", "58008", "177013"];
// ... or only as the whole name, where they are too common to block inside other numbers.
const NUMBERS_EXACT = ["88", "14", "311"];

// Ordinary words that contain a blocked word. Removed (raw spelling only) before checking.
const ALLOW = [
  "class", "bass", "brass", "glass", "grass", "pass", "mass", "lass", "sass", "assist", "asset", "assassin", "assault",
  "assign", "assume", "assure", "massive", "embassy", "harass", "compass", "cassie", "cassidy", "jassen", "hassan",
  "cucumber", "cumulus", "document", "circum", "accum", "scum", "cumming",
  "title", "titan", "titus", "petit", "attitude", "entitle", "constitut", "tithe", "titch", "stitch", "titanium",
  "analys", "canal", "banal", "analog", "manal", "panal",
  "grape", "drape", "scrape", "trape", "therapist",
  "cockpit", "peacock", "hancock", "cockatoo", "babcock", "cockburn",
  "spice", "spicy", "hispanic", "conspic",
  "raccoon", "cocoon", "tycoon",
  "scunthorpe", "dickens", "dickson", "dickinson", "dickey", "benedict", "medick",
  "butter", "button", "butte", "buttress", "abbott", "rebut",
  "shitake", "shiitake", "mishit",
  "sexton", "essex", "sussex", "middlesex", "sextant",
  "pubescent", "public", "pubs",
  "fagan", "fagin", "shoe", "phoenix", "saturday", "tito", "cassius", "cassandra", "analis", "annalis", "scrap", "fuchs",
  "torped", "speedo", "pedometer", "crisis", "acumen", "cummin", "nibbl", "pussycat", "octopus", "platypus",
  "skyscraper", "assess", "passion", "classic", "bassist",
  "matrix", "detailer", "revit", "griffith",
];

// Characters that can stand in for each letter, after the name is lower-cased.
const LOOK = {
  a: "a4@", b: "b86", c: "ckq(", d: "d", e: "e3", f: "f", g: "g96", h: "h#", i: "i1!|y", j: "j", k: "kcq",
  l: "l1|7", m: "m", n: "n", o: "o0q", p: "p", q: "qkc", r: "r", s: "s5z$2", t: "t7+", u: "uvw", v: "vu", w: "w",
  x: "x", y: "y", z: "z2s",
};
const MULTI = { f: ["ph"], w: ["vv", "uu"], k: ["ck"], u: ["oo"], x: ["ks", "cks"], o: ["()"] };

const esc = s => s.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");

function letterPattern(ch) {
  const cls = "[" + esc(LOOK[ch] || ch) + "]";
  const alts = (MULTI[ch] || []).map(esc);
  const one = alts.length ? `(?:${cls}|${alts.join("|")})` : cls;
  return `${one}+`; // + lets stretched letters (fuuuck) still match
}

const toRegex = w => new RegExp([...w].map(letterPattern).join(""));
const PATTERNS = [...new Set(WORDS)].map(toRegex);
const REVERSE_PATTERNS = REVERSE.map(toRegex);
const EXACT_PATTERNS = EXACT.map(w => new RegExp("^" + toRegex(w).source + "$"));

// Calculator digits read upside down, applied to the reversed string.
const UPSIDE = { 0: "o", 1: "i", 2: "z", 3: "e", 4: "h", 5: "s", 6: "g", 7: "l", 8: "b", 9: "g" };

const hits = s => PATTERNS.some(re => re.test(s));
const hitsReversed = s => REVERSE_PATTERNS.some(re => re.test([...s].reverse().join("")));

export function isNameAllowed(raw) {
  const name = String(raw || "").toUpperCase().trim();
  if (!/^[A-Z0-9 ]{3,10}$/.test(name)) return false;

  const lower = name.toLowerCase();
  const joined = lower.replace(/[^a-z0-9]/g, "");
  if (!joined) return false;
  if (EXACT_PATTERNS.some(re => re.test(joined)) || NUMBERS_EXACT.includes(joined)) return false;
  if (NUMBERS_ANYWHERE.some(n => joined.includes(n))) return false;

  // Strip known-innocent words (raw spelling only), then look for blocked words.
  const strip = s => ALLOW.reduce((acc, a) => acc.split(a).join(""), s);
  // Whole name with spaces removed ("F U C K"), plus each word on its own.
  const pieces = [strip(joined), ...lower.split(/\s+/).filter(Boolean).map(strip)];

  for (const p of pieces) {
    if (hits(p) || hitsReversed(p) || LITERAL.some(w => p.includes(w))) return false;
  }

  // Upside-down calculator words: only meaningful when the name is mostly digits.
  const digits = joined.replace(/\D/g, "");
  if (digits.length >= 4 && digits.length >= joined.length - 1) {
    const flipped = [...joined].reverse().map(c => UPSIDE[c] || c).join("");
    if (hits(flipped)) return false;
  }

  return true;
}
