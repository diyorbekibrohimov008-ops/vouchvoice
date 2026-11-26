// netlify/lib/store.ts
import { getStore } from "@netlify/blobs";
import { del, get, list, put } from "@vercel/blob";
var MemoryStoreBackend = class {
  buckets = /* @__PURE__ */ new Map();
  getBucket(storeName) {
    let bucket = this.buckets.get(storeName);
    if (!bucket) {
      bucket = /* @__PURE__ */ new Map();
      this.buckets.set(storeName, bucket);
    }
    return bucket;
  }
  async getJSON(storeName, key) {
    const entry = this.getBucket(storeName).get(key);
    if (!entry) return null;
    return structuredClone(entry.value);
  }
  async setJSON(storeName, key, value, options) {
    const bucket = this.getBucket(storeName);
    if (options?.onlyIfNew && bucket.has(key)) {
      return { modified: false };
    }
    bucket.set(key, { value: structuredClone(value) });
    return { modified: true };
  }
  async getBinary(storeName, key) {
    const entry = this.getBucket(storeName).get(key);
    if (!entry) return null;
    const raw = entry.value;
    const copy = new Uint8Array(raw.byteLength);
    copy.set(raw);
    return { data: copy.buffer, metadata: entry.metadata ?? {} };
  }
  async setBinary(storeName, key, data, metadata) {
    const bytes = data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array(data);
    this.getBucket(storeName).set(key, { value: bytes, metadata });
  }
  async deleteKey(storeName, key) {
    this.getBucket(storeName).delete(key);
  }
  async listKeys(storeName, prefix) {
    const bucket = this.getBucket(storeName);
    return Array.from(bucket.keys()).filter((k) => k.startsWith(prefix)).sort();
  }
};
var NetlifyBlobBackend = class {
  store(name) {
    return getStore({ name, consistency: "strong" });
  }
  async getJSON(storeName, key) {
    const data = await this.store(storeName).get(key, { type: "json" });
    return data ?? null;
  }
  async setJSON(storeName, key, value, options) {
    const res = await this.store(storeName).setJSON(key, value, {
      onlyIfNew: options?.onlyIfNew
    });
    return { modified: Boolean(res?.modified) };
  }
  async getBinary(storeName, key) {
    const entry = await this.store(storeName).getWithMetadata(key, { type: "arrayBuffer" });
    if (!entry) return null;
    return {
      data: entry.data,
      metadata: entry.metadata ?? {}
    };
  }
  async setBinary(storeName, key, data, metadata) {
    const buf = data instanceof Uint8Array ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : data;
    await this.store(storeName).set(key, buf, {
      metadata
    });
  }
  async deleteKey(storeName, key) {
    await this.store(storeName).delete(key);
  }
  async listKeys(storeName, prefix) {
    const { blobs } = await this.store(storeName).list({ prefix });
    return blobs.map((b) => b.key).sort();
  }
};
function isBlobNotFoundError(err) {
  if (!(err instanceof Error)) return false;
  return err.name === "BlobNotFoundError" || /\b404\b|not found/i.test(err.message);
}
var VercelBlobBackend = class {
  blobPath(storeName, key) {
    return storeName === DATA_STORE ? `${storeName}/${key}.json` : `${storeName}/${key}`;
  }
  async getJSON(storeName, key) {
    try {
      const res = await get(this.blobPath(storeName, key), {
        access: "private",
        useCache: false
      });
      if (!res || res.statusCode !== 200 || !res.stream) return null;
      const text = await new Response(res.stream).text();
      return JSON.parse(text);
    } catch (err) {
      if (isBlobNotFoundError(err)) return null;
      throw err;
    }
  }
  async setJSON(storeName, key, value, options) {
    const pathname = this.blobPath(storeName, key);
    const body = JSON.stringify(value);
    if (options?.onlyIfNew) {
      try {
        await put(pathname, body, {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: false,
          contentType: "application/json",
          cacheControlMaxAge: 60
        });
        return { modified: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (/already exists|overwrite|precondition|409/i.test(msg)) {
          return { modified: false };
        }
        throw err;
      }
    }
    await put(pathname, body, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60
    });
    return { modified: true };
  }
  async getBinary(storeName, key) {
    try {
      const res = await get(this.blobPath(storeName, key), {
        access: "private",
        useCache: false
      });
      if (!res || res.statusCode !== 200 || !res.stream) return null;
      const data = await new Response(res.stream).arrayBuffer();
      return {
        data,
        metadata: { contentType: res.blob.contentType || "audio/wav" }
      };
    } catch (err) {
      if (isBlobNotFoundError(err)) return null;
      throw err;
    }
  }
  async setBinary(storeName, key, data, metadata) {
    const buf = data instanceof Uint8Array ? Buffer.from(data.buffer, data.byteOffset, data.byteLength) : Buffer.from(data);
    await put(this.blobPath(storeName, key), buf, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: String(metadata?.contentType || "audio/wav"),
      cacheControlMaxAge: 86400
    });
  }
  async deleteKey(storeName, key) {
    try {
      await del(this.blobPath(storeName, key));
    } catch (err) {
      if (!isBlobNotFoundError(err)) throw err;
    }
  }
  async listKeys(storeName, prefix) {
    const fullPrefix = `${storeName}/${prefix}`;
    const keys = [];
    let cursor;
    do {
      const page = await list({ prefix: fullPrefix, cursor, limit: 1e3 });
      for (const b of page.blobs) {
        let k = b.pathname.startsWith(`${storeName}/`) ? b.pathname.slice(storeName.length + 1) : b.pathname;
        if (storeName === DATA_STORE && k.endsWith(".json")) {
          k = k.slice(0, -5);
        }
        keys.push(k);
      }
      cursor = page.hasMore ? page.cursor : void 0;
    } while (cursor);
    return keys.sort();
  }
};
var DATA_STORE = "vouchvoice-data";
var AUDIO_STORE = "vouchvoice-audio";
var activeBackend = null;
var memorySingleton = new MemoryStoreBackend();
function isTestBackendActive() {
  return activeBackend !== null;
}
function getStorage() {
  if (activeBackend) return activeBackend;
  if (typeof process !== "undefined" && process.env.BLOB_READ_WRITE_TOKEN) {
    activeBackend = new VercelBlobBackend();
    return activeBackend;
  }
  const hasNetlifyBlobsContext = typeof process !== "undefined" && Boolean(process.env.NETLIFY_BLOBS_CONTEXT || globalThis.Netlify);
  if (hasNetlifyBlobsContext) {
    try {
      getStore({ name: DATA_STORE, consistency: "strong" });
      activeBackend = new NetlifyBlobBackend();
      return activeBackend;
    } catch {
      return memorySingleton;
    }
  }
  return memorySingleton;
}

// netlify/lib/auth.ts
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
var SESSION_COOKIE_NAME = "vv_session";
var SESSION_TTL_MS = 1e3 * 60 * 60 * 24 * 14;
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}
function verifyPassword(password, stored) {
  const [salt, keyHex] = stored.split(":");
  if (!salt || !keyHex) return false;
  const keyBuf = Buffer.from(keyHex, "hex");
  const derivedBuf = scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return timingSafeEqual(keyBuf, derivedBuf);
}
function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
function parseCookieHeader(header) {
  if (!header) return {};
  const cookies = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    cookies[key] = val;
  }
  return cookies;
}
function extractSessionToken(req) {
  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    const t = auth.slice(7).trim();
    if (t) return t;
  }
  const cookies = parseCookieHeader(req.headers.get("cookie"));
  return cookies[SESSION_COOKIE_NAME] || null;
}
function buildSessionCookieHeader(token, req, clear = false) {
  const isHttps = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  const parts = [
    `${SESSION_COOKIE_NAME}=${clear ? "" : encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    clear ? "Max-Age=0" : `Max-Age=${Math.floor(SESSION_TTL_MS / 1e3)}`
  ];
  if (isHttps) parts.push("Secure");
  return parts.join("; ");
}
var EPHEMERAL_FALLBACK_SECRET = randomBytes(32).toString("hex");
var SESSION_SECRET = typeof process !== "undefined" && process.env?.SESSION_SECRET || EPHEMERAL_FALLBACK_SECRET;
function signSessionRecord(record) {
  const payload = Buffer.from(JSON.stringify(record), "utf8").toString("base64url");
  const sig = createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
function verifySignedSessionToken(token) {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
async function createSession(user) {
  const record = {
    userId: user.id,
    workspaceId: user.workspaceId,
    email: user.email,
    name: user.name,
    isDemo: Boolean(user.isDemo),
    expiresAt: Date.now() + SESSION_TTL_MS
  };
  const token = signSessionRecord(record);
  await getStorage().setJSON(DATA_STORE, `sessions/${hashToken(token)}`, record);
  return token;
}
async function getSessionUser(req) {
  const token = extractSessionToken(req);
  if (!token) return null;
  const store = getStorage();
  const tokenHash = hashToken(token);
  const revoked = await store.getJSON(DATA_STORE, `revoked/${tokenHash}`);
  if (revoked) return null;
  const key = `sessions/${tokenHash}`;
  let session = await store.getJSON(DATA_STORE, key);
  if (!session && !isTestBackendActive()) {
    session = verifySignedSessionToken(token);
  }
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    await store.deleteKey(DATA_STORE, key);
    return null;
  }
  return {
    id: session.userId,
    email: session.email,
    name: session.name,
    workspaceId: session.workspaceId,
    isDemo: session.isDemo
  };
}
async function destroySession(req) {
  const token = extractSessionToken(req);
  if (!token) return;
  const tokenHash = hashToken(token);
  await getStorage().deleteKey(DATA_STORE, `sessions/${tokenHash}`);
  await getStorage().setJSON(DATA_STORE, `revoked/${tokenHash}`, { revoked: true });
}
function sanitizeWorkspace(ws) {
  return {
    id: ws.id,
    name: ws.name,
    ownerUserId: ws.ownerUserId,
    plan: "free",
    licenseKey: null,
    hasCustomAiKey: Boolean(ws.customAiKey),
    aiProvider: ws.aiProvider,
    createdAt: ws.createdAt
  };
}

// shared/transcriptAi.ts
var HESITATION_FILLERS = /\b(?:um+|uh+|uhh+|uhm+|erm+|er+|hmm+|mhm+|ah+)\b[,.\s]*/gi;
var PHRASE_FILLERS = /\b(?:you know what i mean|you know|i mean|to be completely honest|to be honest|honestly speaking|kind of like|sort of like|sort of|kind of|at the end of the day|like i said)\b[,.\s]*/gi;
var ADVERB_CRUTCHES = /(?:^|[\s,])\b(?:basically|literally|actually)\b(?=[,\s]|$)/gi;
var CONTEXTUAL_LIKE = /(?:,\s*like\s*,|\blike,\s+|(?<=\b(?:was|is|are|were|felt|feels|spent|took|saved))\s+like\s+(?=(?:super|really|so|totally|way|very|pretty|kind|sort|um|uh|\d)\b))/gi;
var STUTTER_WORDS = /\b(i|we|you|they|it|he|she|the|a|an|is|was|are|were|very|really|so|to|and|that|this|in|on|for|my|our)\s+\1\b/gi;
var LEAD_IN_NOISE = /^(?:so\s+yeah[,.\s]*|yeah[,.\s]+|well[,.\s]+|okay\s+so[,.\s]+|okay[,.\s]+|so[,.\s]+|anyway[,.\s]+)+/i;
var TAG_RULES = [
  { tag: "Speed", pattern: /\b(fast|quick|seconds|minutes|instant|speed|rapid|hours)\b/i },
  { tag: "Ease of Use", pattern: /\b(easy|simple|intuitive|clean|one[- ]tap|effortless|smooth)\b/i },
  { tag: "ROI & Growth", pattern: /\b(roi|revenue|sales|conversions?|customers?|leads?|clients?|doubled|tripled|\dx|\d+%|\$\d+)\b/i },
  { tag: "Voice-First", pattern: /\b(voice|audio|mic|microphone|speak|talking|camera|video)\b/i },
  { tag: "Pricing", pattern: /\b(price|pricing|cheap|affordable|worth|lifetime|subscription|save[sd]?\s+\$)\b/i },
  { tag: "Support", pattern: /\b(support|team|helpful|responsive|onboarding)\b/i }
];
function countMatches(text, regex) {
  let count = 0;
  regex.lastIndex = 0;
  if (!regex.global) {
    return regex.test(text) ? 1 : 0;
  }
  while (regex.exec(text) !== null) {
    count += 1;
  }
  regex.lastIndex = 0;
  return count;
}
function normalizePunctuation(input) {
  let out = input.replace(/\s+/g, " ").replace(/\s*,\s*,+/g, ",").replace(/\s+([,.!?])/g, "$1").replace(/([,.!?]){2,}/g, "$1").replace(/^[,.\s]+/, "").trim();
  out = out.replace(/\bi(?=(?:'(?:m|ve|ll|d|re))?\b)/g, "I");
  out = out.replace(/,\s+(and honestly|and then|so now|so overall|plus|and now)\s+/gi, ". $1 ");
  const sentences = out.split(/(?<=[.!?])\s+|\s*;\s*/).map((s) => s.trim()).filter((s) => s.length > 0).map((s) => {
    const cleaned = s.replace(/^[,.\s]+/, "");
    if (!cleaned) return "";
    const capped = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return /[.!?]$/.test(capped) ? capped : `${capped}.`;
  }).filter(Boolean);
  return sentences.join(" ").replace(/\s+/g, " ").trim();
}
function extractOutcomeMetric(text) {
  const patterns = [
    /\b\d+(?:\.\d+)?x(?:\s+(?:more|faster|higher|better|lift|increase|growth))?/i,
    /\b\d+%(?:\s+(?:more|faster|higher|increase|boost|drop|reduction|lift|saved))?/i,
    /\$\d[\d,]*(?:\.\d+)?(?:\s*(?:\/mo|\/month|a month|saved|in revenue|MRR))?/i,
    /\b(?:saves?|saved|saving|cut|cutting|reduced?|reduces?|spent|eliminated?)\s+(?:over\s+|around\s+|nearly\s+)?\d+(?:\.\d+)?\s+(?:hours?|hrs?|minutes?|mins?|days?|weeks?)(?:\s+(?:a|per)\s+(?:week|day|month))?/i,
    /\b(?:in|under)\s+\d+\s+(?:seconds?|minutes?|mins?|hours?)\b/i,
    /\b(?:half the time|twice as fast|10x faster)\b/i
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) return m[0].trim();
  }
  return null;
}
function extractTags(text) {
  const tags = [];
  for (const rule of TAG_RULES) {
    if (rule.pattern.test(text)) {
      tags.push(rule.tag);
    }
  }
  return tags.length > 0 ? tags.slice(0, 4) : ["Customer Story"];
}
function extractPullQuote(text) {
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length === 0) return "";
  let best = sentences[0];
  let bestScore = -1;
  for (const s of sentences) {
    const words = s.split(/\s+/).length;
    let score = 0;
    if (words >= 5 && words <= 18) score += 4;
    else if (words <= 24) score += 2;
    if (/\d|%|\$|x\b/i.test(s)) score += 3;
    if (/\b(love|best|saved|changed|game[- ]?changer|recommend|instant|finally|zero|effortless|worth)\b/i.test(s)) {
      score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best.replace(/[.]+$/, "").trim();
}
function makeCrispVariant(authentic) {
  const sentences = authentic.split(/(?<=[.!?])\s+/).map((s) => s.replace(LEAD_IN_NOISE, "").trim()).map((s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "").filter(Boolean);
  if (sentences.length <= 2) return sentences.join(" ");
  const picked = [sentences[0]];
  const metricIdx = sentences.findIndex((s, i) => i > 0 && /\d|%|\$|x\b/i.test(s));
  if (metricIdx > 0) {
    picked.push(sentences[metricIdx]);
  }
  const last = sentences[sentences.length - 1];
  if (!picked.includes(last) && picked.length < 3) {
    picked.push(last);
  }
  return picked.join(" ");
}
function makeResultsVariant(authentic) {
  const sentences = authentic.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length <= 1) return authentic;
  const outcomeIdx = sentences.findIndex(
    (s) => /\d|%|\$|x\b|\b(saved|doubled|tripled|cut|faster|conversions?|revenue|approved)\b/i.test(s)
  );
  if (outcomeIdx <= 0) return makeCrispVariant(authentic);
  const reordered = [
    sentences[outcomeIdx],
    ...sentences.filter((_, idx) => idx !== outcomeIdx)
  ];
  return reordered.slice(0, 3).join(" ");
}
function cleanTranscriptLocally(rawTranscript, brandName) {
  const raw = rawTranscript.trim();
  const originalWordCount = raw ? raw.split(/\s+/).length : 0;
  if (!raw) {
    return {
      rawTranscript: "",
      cleanedByTone: { authentic: "", crisp: "", results: "" },
      recommendedTone: "authentic",
      pullQuote: "",
      outcomeMetric: null,
      tags: ["Customer Story"],
      fillersRemovedCount: 0,
      originalWordCount: 0,
      cleanedWordCount: 0,
      engine: "built_in"
    };
  }
  let fillersCount = 0;
  let working = raw;
  fillersCount += countMatches(working, HESITATION_FILLERS);
  working = working.replace(HESITATION_FILLERS, " ");
  fillersCount += countMatches(working, PHRASE_FILLERS);
  working = working.replace(PHRASE_FILLERS, " ");
  fillersCount += countMatches(working, CONTEXTUAL_LIKE);
  working = working.replace(CONTEXTUAL_LIKE, " ");
  fillersCount += countMatches(working, ADVERB_CRUTCHES);
  working = working.replace(ADVERB_CRUTCHES, " ");
  for (let pass = 0; pass < 2; pass++) {
    const stutters = countMatches(working, STUTTER_WORDS);
    fillersCount += stutters;
    working = working.replace(STUTTER_WORDS, "$1");
  }
  working = working.replace(LEAD_IN_NOISE, "");
  if (brandName && brandName.trim().length > 2) {
    const cleanBrand = brandName.trim();
    const targetLower = cleanBrand.toLowerCase();
    const lowerWorking = working.toLowerCase();
    let idx = lowerWorking.indexOf(targetLower);
    while (idx !== -1) {
      const prevChar = idx > 0 ? working[idx - 1] : " ";
      const nextChar = idx + cleanBrand.length < working.length ? working[idx + cleanBrand.length] : " ";
      const isBoundaryBefore = !/[A-Za-z0-9_]/.test(prevChar);
      const isBoundaryAfter = !/[A-Za-z0-9_]/.test(nextChar);
      if (isBoundaryBefore && isBoundaryAfter) {
        working = working.slice(0, idx) + cleanBrand + working.slice(idx + cleanBrand.length);
      }
      idx = lowerWorking.indexOf(targetLower, idx + cleanBrand.length);
    }
  }
  const authentic = normalizePunctuation(working);
  const crisp = makeCrispVariant(authentic);
  const results = makeResultsVariant(authentic);
  const outcomeMetric = extractOutcomeMetric(authentic);
  const recommendedTone = outcomeMetric ? "results" : "authentic";
  const pullQuote = extractPullQuote(authentic);
  const tags = extractTags(authentic);
  const cleanedWordCount = authentic ? authentic.split(/\s+/).length : 0;
  return {
    rawTranscript: raw,
    cleanedByTone: {
      authentic,
      crisp,
      results
    },
    recommendedTone,
    pullQuote,
    outcomeMetric,
    tags,
    fillersRemovedCount: fillersCount,
    originalWordCount,
    cleanedWordCount,
    engine: "built_in"
  };
}

// shared/demoAudio.ts
function synthesizeDemoWav(seed = 1, durationSec = 2) {
  const sampleRate = 8e3;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  const baseFreqs = [220, 261.63, 293.66, 329.63, 392];
  const baseFreq = baseFreqs[Math.abs(seed) % baseFreqs.length];
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, t / 0.08) * Math.min(1, (durationSec - t) / 0.15) * (0.55 + 0.45 * Math.sin(2 * Math.PI * 3.2 * t));
    const formant = Math.sin(2 * Math.PI * (baseFreq + 14 * Math.sin(2 * Math.PI * 2.1 * t)) * t) * 0.55 + Math.sin(2 * Math.PI * baseFreq * 1.5 * t) * 0.25 + Math.sin(2 * Math.PI * baseFreq * 2 * t) * 0.12;
    const sample = Math.max(-1, Math.min(1, formant * envelope * 0.35));
    view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
  }
  return new Uint8Array(buffer);
}

// netlify/lib/seed.ts
var DEMO_WORKSPACE_ID = "ws_demo_vouchvoice";
var DEMO_USER_ID = "usr_demo_founder";
var DEMO_USER_EMAIL = "demo@vouchvoice.app";
var seededBackends = /* @__PURE__ */ new WeakSet();
async function seedDemoWorkspace(forceReset = false) {
  const store = getStorage();
  if (!forceReset && seededBackends.has(store)) return;
  const wsKey = `workspaces/${DEMO_WORKSPACE_ID}`;
  if (!forceReset) {
    const existing = await store.getJSON(DATA_STORE, wsKey);
    if (existing) {
      seededBackends.add(store);
      return;
    }
  }
  const now = /* @__PURE__ */ new Date();
  const daysAgo = (d) => new Date(now.getTime() - d * 864e5).toISOString();
  const demoUser = {
    id: DEMO_USER_ID,
    email: DEMO_USER_EMAIL,
    name: "Maya Chen (Demo Founder)",
    passwordHash: hashPassword("vouchvoice-demo-2026"),
    workspaceId: DEMO_WORKSPACE_ID,
    createdAt: daysAgo(18)
  };
  const demoWorkspace = {
    id: DEMO_WORKSPACE_ID,
    name: "Maya Studio (2 Brands)",
    ownerUserId: DEMO_USER_ID,
    plan: "free",
    licenseKey: null,
    customAiKey: null,
    aiProvider: "built_in",
    createdAt: daysAgo(18)
  };
  await store.setJSON(DATA_STORE, `users/${DEMO_USER_EMAIL}`, demoUser);
  await store.setJSON(DATA_STORE, wsKey, demoWorkspace);
  const spaces = [
    {
      id: "spc_acme_ai",
      workspaceId: DEMO_WORKSPACE_ID,
      slug: "acme-ai",
      name: "PulseDeck AI",
      tagline: "Turn messy customer calls into crisp product roadmaps in 30 seconds.",
      brandColor: "#0d7480",
      theme: "paper",
      layout: "masonry",
      cardRadius: "soft",
      showRatings: true,
      showVoiceBadge: true,
      showMetrics: true,
      showCompany: true,
      hidePoweredBy: false,
      prompts: {
        step1: "What was taking you the longest before PulseDeck AI?",
        step2: "What changed once you started using it?",
        step3: "Who would you tell to try it?"
      },
      googleMapsPlaceUrl: "https://www.google.com/maps/search/?api=1&query=PulseDeck+AI",
      productHuntSlug: "pulsedeck-ai",
      linkedinHandle: "pulsedeck-ai",
      webhookUrl: "",
      createdAt: daysAgo(16)
    },
    {
      id: "spc_pixelcraft",
      workspaceId: DEMO_WORKSPACE_ID,
      slug: "pixelcraft-kit",
      name: "PixelCraft UI Kit",
      tagline: "Production-ready Framer & React blocks for indie SaaS launches.",
      brandColor: "#0f766e",
      theme: "cream",
      layout: "grid",
      cardRadius: "soft",
      showRatings: true,
      showVoiceBadge: true,
      showMetrics: true,
      showCompany: true,
      hidePoweredBy: true,
      prompts: {
        step1: "How long did landing pages take before PixelCraft?",
        step2: "What made this kit worth it?",
        step3: "Would you recommend it to another indie maker?"
      },
      googleMapsPlaceUrl: "https://www.google.com/maps/search/?api=1&query=PixelCraft+UI",
      productHuntSlug: "pixelcraft-ui-kit",
      linkedinHandle: "pixelcraft-ui",
      webhookUrl: "",
      createdAt: daysAgo(12)
    }
  ];
  for (const sp of spaces) {
    await store.setJSON(DATA_STORE, `spaces/${sp.slug}`, sp);
    await store.setJSON(DATA_STORE, `workspace-spaces/${DEMO_WORKSPACE_ID}/${sp.slug}`, { slug: sp.slug });
  }
  const rawItems = [
    {
      id: "t_voice_1",
      spaceSlug: "acme-ai",
      authorName: "Daniel Park",
      authorRole: "Founder",
      authorCompany: "LedgerLoop",
      color: "#0d7480",
      rating: 5,
      rawTranscript: "Um, so before PulseDeck AI, I was like spending literally 4 hours every Friday reading Zoom notes, you know? Honestly, once we switched, our team cut synthesis down to 12 minutes and shipped 3x more customer fixes.",
      source: "voice",
      durationSec: 19,
      hasAudio: true,
      status: "approved",
      featured: true,
      syndicatedTargets: ["linkedin", "google_maps"],
      daysAgo: 9
    },
    {
      id: "t_voice_2",
      spaceSlug: "acme-ai",
      authorName: "Priya Nair",
      authorRole: "Head of Product",
      authorCompany: "ShipFast Ops",
      color: "#059669",
      rating: 5,
      rawTranscript: "I actually hate recording webcam videos, um, so when you sent a 20-second voice link I just spoke from my phone while walking. It cleaned up my rambling into a crisp quote and boosted our trial conversion by 34%.",
      source: "voice",
      durationSec: 17,
      hasAudio: true,
      status: "approved",
      featured: true,
      syndicatedTargets: ["product_hunt"],
      daysAgo: 6
    },
    {
      id: "t_voice_3",
      spaceSlug: "acme-ai",
      authorName: "Tom\xE1s Rivera",
      authorRole: "Indie Maker",
      authorCompany: "FormNest",
      color: "#d97706",
      rating: 5,
      rawTranscript: "Basically we moved all our testimonials over from Testimonial.to because paying $50 a month just to show existing reviews felt crazy. Saved $600 a year and got double the reply rate using voice notes.",
      source: "voice",
      durationSec: 21,
      hasAudio: true,
      status: "approved",
      featured: false,
      syndicatedTargets: ["x"],
      daysAgo: 4
    },
    {
      id: "t_import_1",
      spaceSlug: "acme-ai",
      authorName: "Hannah Brooks",
      authorRole: "Growth Lead",
      authorCompany: "KiteCRM",
      color: "#0e7490",
      rating: 5,
      rawTranscript: "PulseDeck turned 40 messy onboarding interviews into an actionable priority board before lunch. Every early-stage PM needs this.",
      source: "senja_import",
      durationSec: null,
      hasAudio: false,
      status: "approved",
      featured: false,
      syndicatedTargets: ["linkedin"],
      daysAgo: 11
    },
    {
      id: "t_import_2",
      spaceSlug: "acme-ai",
      authorName: "Marcus Vance",
      authorRole: "CTO",
      authorCompany: "GridMetrics",
      color: "#0284c7",
      rating: 5,
      rawTranscript: "Cleanest workflow we have adopted this year. Setup took under 5 minutes and our support team loves it.",
      source: "google_import",
      durationSec: null,
      hasAudio: false,
      status: "approved",
      featured: false,
      syndicatedTargets: ["google_maps"],
      daysAgo: 7
    },
    {
      id: "t_pending_1",
      spaceSlug: "acme-ai",
      authorName: "Elena Rostova",
      authorRole: "Solo Consultant",
      authorCompany: "BrightOps",
      color: "#db2777",
      rating: 5,
      rawTranscript: "Uh, yeah, so I was kind of nervous about leaving a review on camera, you know, but the 20-second voice prompt took me literally 15 seconds and made me sound way sharper.",
      source: "voice",
      durationSec: 15,
      hasAudio: true,
      status: "pending",
      featured: false,
      syndicatedTargets: [],
      daysAgo: 1
    },
    {
      id: "t_pixel_1",
      spaceSlug: "pixelcraft-kit",
      authorName: "Samir Patel",
      authorRole: "Design Engineer",
      authorCompany: "LaunchPad Studio",
      color: "#0f766e",
      rating: 5,
      rawTranscript: "Um, I built our entire SaaS marketing page in under 2 hours with PixelCraft instead of hiring an agency for $3,000. Worth every single penny.",
      source: "voice",
      durationSec: 16,
      hasAudio: true,
      status: "approved",
      featured: true,
      syndicatedTargets: ["linkedin", "product_hunt"],
      daysAgo: 5
    },
    {
      id: "t_pixel_2",
      spaceSlug: "pixelcraft-kit",
      authorName: "Claire Dubois",
      authorRole: "Founder",
      authorCompany: "MailSpark",
      color: "#2563eb",
      rating: 5,
      rawTranscript: "Having both of my brands inside one VouchVoice workspace without paying per-space fees is a breath of fresh air. PixelCraft components feel handcrafted.",
      source: "testimonial_to_import",
      durationSec: null,
      hasAudio: false,
      status: "approved",
      featured: false,
      syndicatedTargets: [],
      daysAgo: 3
    }
  ];
  const writes = [];
  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    const spaceName = item.spaceSlug === "acme-ai" ? "PulseDeck AI" : "PixelCraft UI Kit";
    const analysis = cleanTranscriptLocally(item.rawTranscript, spaceName);
    let audioKey = null;
    if (item.hasAudio) {
      audioKey = `audio/${item.id}.wav`;
      const wav = synthesizeDemoWav(i + 1, 1.8);
      writes.push(
        store.setBinary(AUDIO_STORE, audioKey, wav, {
          contentType: "audio/wav",
          durationSec: item.durationSec ?? 18
        })
      );
    }
    const record = {
      id: item.id,
      spaceSlug: item.spaceSlug,
      authorName: item.authorName,
      authorRole: item.authorRole,
      authorCompany: item.authorCompany,
      authorAvatarColor: item.color,
      rating: item.rating,
      rawTranscript: item.rawTranscript,
      cleanedText: analysis.cleanedByTone[analysis.recommendedTone],
      pullQuote: analysis.pullQuote,
      tone: analysis.recommendedTone,
      outcomeMetric: analysis.outcomeMetric,
      source: item.source,
      durationSec: item.durationSec,
      hasAudio: item.hasAudio,
      audioKey,
      status: item.status,
      featured: item.featured,
      syndicatedTargets: item.syndicatedTargets,
      tags: analysis.tags,
      fillersRemovedCount: analysis.fillersRemovedCount,
      createdAt: daysAgo(item.daysAgo),
      approvedAt: item.status === "approved" ? daysAgo(item.daysAgo) : null
    };
    writes.push(store.setJSON(DATA_STORE, `testimonials/${item.spaceSlug}/${item.id}`, record));
  }
  const seedEvents = [
    {
      id: "syn_1",
      spaceSlug: "acme-ai",
      testimonialId: "t_voice_1",
      target: "linkedin",
      status: "intent_opened",
      detail: "Formatted LinkedIn founder proof post + SVG quote card for Daniel Park",
      createdAt: daysAgo(8)
    },
    {
      id: "syn_2",
      spaceSlug: "acme-ai",
      testimonialId: "t_voice_2",
      target: "product_hunt",
      status: "handoff_copied",
      detail: "Customer 1-tap copied review & opened Product Hunt reviews tab",
      createdAt: daysAgo(6)
    }
  ];
  for (const ev of seedEvents) {
    writes.push(store.setJSON(DATA_STORE, `syndication-events/${ev.spaceSlug}/${ev.id}`, ev));
  }
  await Promise.all(writes);
  seededBackends.add(store);
}

// netlify/lib/embedHandler.ts
var WIDGET_SCRIPT = `(function(){
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var scriptEl = document.currentScript;
  var scriptOrigin = '';
  try {
    if (scriptEl && scriptEl.src) {
      scriptOrigin = new URL(scriptEl.src).origin;
    }
  } catch (e) {}
  if (!scriptOrigin) scriptOrigin = window.location.origin;

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function themeVars(theme) {
    if (theme === 'midnight') {
      return { bg: '#0b1120', card: '#111827', border: '#1e293b', text: '#f8fafc', muted: '#94a3b8', pillBg: 'rgba(16,185,129,0.16)', pillText: '#34d399' };
    }
    if (theme === 'cream') {
      return { bg: '#fbf7ef', card: '#fffdf8', border: '#eadfcd', text: '#1c1917', muted: '#78716c', pillBg: '#ecfdf5', pillText: '#047857' };
    }
    if (theme === 'indigo') {
      return { bg: '#f0fdfa', card: 'rgba(255,255,255,0.95)', border: '#99f6e4', text: '#0f172a', muted: '#0f766e', pillBg: '#ccfbf1', pillText: '#115e59' };
    }
    return { bg: 'transparent', card: '#ffffff', border: '#e2e8f0', text: '#0f172a', muted: '#64748b', pillBg: '#ecfdf5', pillText: '#047857' };
  }

  function renderWidget(host) {
    var slug = host.getAttribute('data-vouch-wall');
    if (!slug || host.__vouchLoaded) return;
    host.__vouchLoaded = true;
    var root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    root.innerHTML = '<div style="font-family:system-ui,sans-serif;padding:16px;color:#64748b;font-size:13px;">Loading Wall of Love\u2026</div>';

    fetch(scriptOrigin + '/api/public/spaces/' + encodeURIComponent(slug))
      .then(function(r){ return r.json(); })
      .then(function(data) {
        if (!data || !data.space) {
          root.innerHTML = '<div style="font-family:system-ui,sans-serif;padding:12px;color:#ef4444;font-size:13px;">Wall not found.</div>';
          return;
        }
        var sp = data.space;
        var items = data.testimonials || [];
        var layout = host.getAttribute('data-vouch-layout') || sp.layout || 'masonry';
        var theme = host.getAttribute('data-vouch-theme') || sp.theme || 'paper';
        var pal = themeVars(theme);
        var radius = sp.cardRadius === 'sharp' ? '6px' : sp.cardRadius === 'pill' ? '22px' : '16px';
        var rawAccent = typeof sp.brandColor === 'string' ? sp.brandColor.trim() : '';
        var accent = /^#[0-9a-fA-F]{3,8}$/.test(rawAccent) ? rawAccent : '#0d7480';

        var gridClass = layout === 'marquee' ? 'vv-marquee' : layout === 'spotlight' ? 'vv-spotlight' : layout === 'badge' ? 'vv-badge-wrap' : layout === 'grid' ? 'vv-grid' : 'vv-masonry';

        var cards = items.map(function(t) {
          var initials = (t.authorName || 'C').split(/\\s+/).map(function(p){ return p[0] || ''; }).join('').slice(0,2).toUpperCase();
          var ratingNum = Math.max(1, Math.min(5, Math.round(Number(t.rating) || 5)));
          var stars = sp.showRatings ? '<span class="vv-stars">' + '\u2605'.repeat(ratingNum) + '</span>' : '';
          var voiceBtn = (sp.showVoiceBadge && t.hasAudio && t.audioUrl)
            ? '<button type="button" class="vv-audio-btn" data-audio="' + esc(scriptOrigin + t.audioUrl) + '">\u25B6 ' + esc(t.durationSec || 20) + 's voice</button>'
            : '';
          var metric = (sp.showMetrics && t.outcomeMetric)
            ? '<span class="vv-metric">' + esc(t.outcomeMetric) + '</span>'
            : '';
          var role = sp.showCompany ? [t.authorRole, t.authorCompany].filter(Boolean).join(' \xB7 ') : (t.authorRole || '');

          return '<article class="vv-card">' +
            '<div class="vv-top">' + stars + '<div class="vv-pills">' + voiceBtn + metric + '</div></div>' +
            (t.pullQuote ? '<h4 class="vv-quote">\u201C' + esc(t.pullQuote) + '\u201D</h4>' : '') +
            '<p class="vv-text">' + esc(t.cleanedText) + '</p>' +
            '<div class="vv-foot">' +
              '<div class="vv-av" style="background:' + esc(t.authorAvatarColor || accent) + '">' + esc(initials) + '</div>' +
              '<div><div class="vv-name">' + esc(t.authorName) + '</div>' +
              (role ? '<div class="vv-role">' + esc(role) + '</div>' : '') + '</div>' +
            '</div>' +
          '</article>';
        }).join('');

        var bodyHtml = '';
        if (layout === 'badge') {
          var avg = (data.stats && data.stats.averageRating) || 5.0;
          var cnt = (data.stats && data.stats.totalApproved) || items.length;
          bodyHtml = '<a class="vv-badge-pill" href="' + esc(scriptOrigin + '/wall/' + sp.slug) + '" target="_blank" rel="noopener">' +
            '<span class="vv-stars">\u2605\u2605\u2605\u2605\u2605</span>' +
            '<strong>' + esc(avg) + '/5</strong>' +
            '<span>from ' + esc(cnt) + ' verified customer reviews</span>' +
            '<span class="vv-cta">Read \u2192</span>' +
          '</a>';
        } else {
          bodyHtml = '<div class="' + gridClass + '">' + cards + '</div>';
        }

        var footer = sp.hidePoweredBy ? '' :
          '<div class="vv-powered">Verified voice social proof by <a href="' + esc(scriptOrigin) + '" target="_blank" rel="noopener">VouchVoice</a> \xB7 <a href="' + esc(scriptOrigin + '/collect/' + sp.slug) + '" target="_blank" rel="noopener">Leave a 20s voice review</a></div>';

        root.innerHTML =
          '<style>' +
            ':host{display:block;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}' +
            '.vv-shell{background:' + pal.bg + ';color:' + pal.text + ';padding:' + (pal.bg === 'transparent' ? '4px 0' : '24px') + ';border-radius:18px;}' +
            '.vv-masonry{column-count:3;column-gap:16px;}' +
            '@media(max-width:900px){.vv-masonry{column-count:2;}}' +
            '@media(max-width:600px){.vv-masonry{column-count:1;}}' +
            '.vv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:16px;align-items:start;}' +
            '.vv-marquee{display:flex;gap:16px;overflow-x:auto;padding-bottom:8px;scroll-snap-type:x mandatory;}' +
            '.vv-marquee .vv-card{min-width:300px;max-width:320px;flex-shrink:0;scroll-snap-align:start;}' +
            '.vv-spotlight{max-width:680px;margin:0 auto;display:grid;gap:16px;}' +
            '.vv-card{break-inside:avoid;margin-bottom:16px;background:' + pal.card + ';border:1px solid ' + pal.border + ';border-radius:' + radius + ';padding:18px;box-shadow:0 4px 18px rgba(15,23,42,0.05);}' +
            '.vv-grid .vv-card,.vv-marquee .vv-card{margin-bottom:0;}' +
            '.vv-top{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;}' +
            '.vv-stars{color:#f59e0b;font-size:14px;letter-spacing:1px;}' +
            '.vv-pills{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}' +
            '.vv-audio-btn{cursor:pointer;border:1px solid ' + pal.border + ';background:' + pal.pillBg + ';color:' + pal.pillText + ';border-radius:999px;padding:3px 9px;font-size:11px;font-weight:700;}' +
            '.vv-metric{background:' + pal.pillBg + ';color:' + pal.pillText + ';border-radius:999px;padding:3px 9px;font-size:11px;font-weight:700;}' +
            '.vv-quote{margin:0 0 8px;font-size:15px;line-height:1.38;font-weight:700;color:' + pal.text + ';}' +
            '.vv-text{margin:0 0 14px;font-size:13.5px;line-height:1.58;color:' + pal.text + ';opacity:0.88;}' +
            '.vv-foot{display:flex;align-items:center;gap:10px;}' +
            '.vv-av{width:32px;height:32px;border-radius:999px;color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center;flex-shrink:0;}' +
            '.vv-name{font-size:13px;font-weight:700;color:' + pal.text + ';}' +
            '.vv-role{font-size:11.5px;color:' + pal.muted + ';}' +
            '.vv-badge-wrap{display:flex;justify-content:center;}' +
            '.vv-badge-pill{display:inline-flex;align-items:center;gap:10px;padding:10px 18px;border-radius:999px;background:' + pal.card + ';border:1px solid ' + pal.border + ';color:' + pal.text + ';text-decoration:none;font-size:13px;box-shadow:0 4px 16px rgba(15,23,42,0.08);}' +
            '.vv-cta{color:' + accent + ';font-weight:700;}' +
            '.vv-powered{margin-top:12px;text-align:center;font-size:11.5px;color:' + pal.muted + ';}' +
            '.vv-powered a{color:' + accent + ';text-decoration:none;font-weight:600;}' +
          '</style>' +
          '<div class="vv-shell">' + bodyHtml + footer + '</div>';

        var activeAudio = null;
        var activeBtn = null;
        root.querySelectorAll('.vv-audio-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var src = btn.getAttribute('data-audio');
            if (!src) return;
            if (activeAudio && activeBtn === btn && !activeAudio.paused) {
              activeAudio.pause();
              btn.textContent = btn.getAttribute('data-label') || '\u25B6 Voice';
              return;
            }
            if (activeAudio) {
              activeAudio.pause();
              if (activeBtn) activeBtn.textContent = activeBtn.getAttribute('data-label') || '\u25B6 Voice';
            }
            if (!btn.getAttribute('data-label')) btn.setAttribute('data-label', btn.textContent);
            var audio = new Audio(src);
            activeAudio = audio;
            activeBtn = btn;
            btn.textContent = '\u275A\u275A Playing\u2026';
            audio.play().catch(function(){
              btn.textContent = btn.getAttribute('data-label') || '\u25B6 Voice';
            });
            audio.onended = function() {
              btn.textContent = btn.getAttribute('data-label') || '\u25B6 Voice';
            };
          });
        });
      })
      .catch(function() {
        root.innerHTML = '<div style="font-family:system-ui,sans-serif;padding:12px;color:#64748b;font-size:13px;">Could not load Wall of Love.</div>';
      });
  }

  function scan() {
    document.querySelectorAll('[data-vouch-wall]').forEach(renderWidget);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }
})();`;
function handleEmbedRequest(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS"
      }
    });
  }
  return new Response(WIDGET_SCRIPT, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300"
    }
  });
}

// netlify/lib/routerHelpers.ts
var PUBLIC_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
var AVATAR_COLORS = [
  "#0d7480",
  "#0f766e",
  "#d97706",
  "#0e7490",
  "#0284c7",
  "#db2777",
  "#059669"
];
function json(data, status = 200, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders
    }
  });
}
async function parseJsonBody(req, extraHeaders) {
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false,
        errorResponse: json({ error: "Request body must be a JSON object." }, 400, extraHeaders)
      };
    }
    return { ok: true, data: parsed };
  } catch {
    return {
      ok: false,
      errorResponse: json({ error: "Invalid JSON request body." }, 400, extraHeaders)
    };
  }
}
function slugify(input) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}
function isSafeWebhookUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    if (parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (host === "localhost" || host === "0.0.0.0" || host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80") || host.startsWith("::ffff:") || host.endsWith(".local") || host.endsWith(".internal") || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
function decodeBase64Audio(raw) {
  const cleaned = raw.includes(",") ? raw.split(",")[1] ?? "" : raw;
  if (!cleaned) return null;
  const bytes = Buffer.from(cleaned, "base64");
  if (bytes.byteLength === 0 || bytes.byteLength > 5 * 1024 * 1024) {
    return null;
  }
  return new Uint8Array(bytes);
}
async function listWorkspaceSpaces(workspaceId) {
  const store = getStorage();
  const markerKeys = await store.listKeys(DATA_STORE, `workspace-spaces/${workspaceId}/`);
  const markers = await Promise.all(
    markerKeys.map((mk) => store.getJSON(DATA_STORE, mk))
  );
  const slugs = markers.map((m) => m?.slug).filter((s) => Boolean(s));
  const spaces = await Promise.all(
    slugs.map((slug) => store.getJSON(DATA_STORE, `spaces/${slug}`))
  );
  return spaces.filter((sp) => Boolean(sp)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
async function listSpaceTestimonials(spaceSlug) {
  const store = getStorage();
  const keys = await store.listKeys(DATA_STORE, `testimonials/${spaceSlug}/`);
  const items = await Promise.all(
    keys.map((key) => store.getJSON(DATA_STORE, key))
  );
  return items.filter((item) => Boolean(item)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
async function listSyndicationEvents(spaceSlug) {
  const store = getStorage();
  const keys = await store.listKeys(DATA_STORE, `syndication-events/${spaceSlug}/`);
  const events = await Promise.all(
    keys.map((key) => store.getJSON(DATA_STORE, key))
  );
  return events.filter((ev) => Boolean(ev)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
async function dispatchWebhook(space, testimonial) {
  if (!space.webhookUrl || !isSafeWebhookUrl(space.webhookUrl)) {
    return { ok: false, detail: "No valid public webhook URL configured on this space." };
  }
  try {
    const res = await fetch(space.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "VouchVoice-Syndicator/1.0" },
      body: JSON.stringify({
        event: "testimonial.approved",
        space: { slug: space.slug, name: space.name },
        testimonial: {
          id: testimonial.id,
          authorName: testimonial.authorName,
          authorRole: testimonial.authorRole,
          authorCompany: testimonial.authorCompany,
          rating: testimonial.rating,
          cleanedText: testimonial.cleanedText,
          pullQuote: testimonial.pullQuote,
          outcomeMetric: testimonial.outcomeMetric,
          source: testimonial.source,
          approvedAt: testimonial.approvedAt
        }
      })
    });
    return {
      ok: res.ok,
      detail: res.ok ? `Webhook delivered (HTTP ${res.status})` : `Webhook returned HTTP ${res.status}`
    };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? `Webhook error: ${err.message}` : "Webhook delivery failed"
    };
  }
}
async function requireAuthSpace(req, slug) {
  const user = await getSessionUser(req);
  if (!user) return { errorResponse: json({ error: "Authentication required" }, 401) };
  const store = getStorage();
  const workspace = await store.getJSON(DATA_STORE, `workspaces/${user.workspaceId}`);
  const space = await store.getJSON(DATA_STORE, `spaces/${slug}`);
  if (!workspace || !space) return { errorResponse: json({ error: "Space not found" }, 404) };
  if (space.workspaceId !== user.workspaceId) {
    return { errorResponse: json({ error: "Forbidden" }, 403) };
  }
  return { user, workspace, space };
}

// netlify/lib/routesAuth.ts
import { randomBytes as randomBytes2, randomUUID } from "node:crypto";
var ALLOWED_AI_PROVIDERS = /* @__PURE__ */ new Set(["built_in", "openai", "gemini"]);
async function handleAuthAndWorkspaceRoutes(req, path, method) {
  if (path === "/api/auth/register" && method === "POST") {
    const parsed = await parseJsonBody(req);
    if (!parsed.ok) return parsed.errorResponse;
    const body = parsed.data;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!name || !email.includes("@") || password.length < 6) {
      return json({ error: "Provide your name, valid email, and a password of at least 6 characters." }, 400);
    }
    const store = getStorage();
    const existingUser = await store.getJSON(DATA_STORE, `users/${email}`);
    if (existingUser) {
      return json({ error: "An account with this email already exists." }, 409);
    }
    const userId = `usr_${randomUUID().slice(0, 12)}`;
    const workspaceId = `ws_${randomUUID().slice(0, 12)}`;
    const brandName = (typeof body.firstBrandName === "string" && body.firstBrandName.trim() ? body.firstBrandName : `${name.split(" ")[0]}'s Product`).trim();
    const baseSlug = slugify(brandName) || "my-product";
    const existingSpace = await store.getJSON(DATA_STORE, `spaces/${baseSlug}`);
    const slug = existingSpace ? `${baseSlug}-${randomBytes2(2).toString("hex")}` : baseSlug;
    const userRecord = {
      id: userId,
      email,
      name,
      passwordHash: hashPassword(password),
      workspaceId,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const workspaceRecord = {
      id: workspaceId,
      name: (typeof body.workspaceName === "string" && body.workspaceName.trim() ? body.workspaceName : `${name.split(" ")[0]}'s Studio`).trim(),
      ownerUserId: userId,
      plan: "free",
      licenseKey: null,
      customAiKey: null,
      aiProvider: "built_in",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const space = {
      id: `spc_${randomUUID().slice(0, 10)}`,
      workspaceId,
      slug,
      name: brandName,
      tagline: `Share a quick 20-second voice note about ${brandName}.`,
      brandColor: "#2142e7",
      theme: "paper",
      layout: "masonry",
      cardRadius: "soft",
      showRatings: true,
      showVoiceBadge: true,
      showMetrics: true,
      showCompany: true,
      hidePoweredBy: false,
      prompts: {
        step1: `What problem were you trying to solve before ${brandName}?`,
        step2: `What changed once you started using ${brandName}?`,
        step3: "Who would you recommend it to?"
      },
      googleMapsPlaceUrl: "",
      productHuntSlug: "",
      linkedinHandle: "",
      webhookUrl: "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await store.setJSON(DATA_STORE, `users/${email}`, userRecord);
    await store.setJSON(DATA_STORE, `workspaces/${workspaceId}`, workspaceRecord);
    await store.setJSON(DATA_STORE, `spaces/${slug}`, space);
    await store.setJSON(DATA_STORE, `workspace-spaces/${workspaceId}/${slug}`, { slug });
    const profile = { id: userId, email, name, workspaceId, isDemo: false };
    const token = await createSession(profile);
    return json(
      {
        user: profile,
        workspace: sanitizeWorkspace(workspaceRecord),
        spaces: [space]
      },
      201,
      { "Set-Cookie": buildSessionCookieHeader(token, req) }
    );
  }
  if (path === "/api/auth/login" && method === "POST") {
    const parsed = await parseJsonBody(req);
    if (!parsed.ok) return parsed.errorResponse;
    const body = parsed.data;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const store = getStorage();
    const userRecord = await store.getJSON(DATA_STORE, `users/${email}`);
    if (!userRecord || !verifyPassword(password, userRecord.passwordHash)) {
      return json({ error: "Invalid email or password." }, 401);
    }
    const profile = {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      workspaceId: userRecord.workspaceId,
      isDemo: userRecord.id === DEMO_USER_ID
    };
    const token = await createSession(profile);
    const ws = await store.getJSON(
      DATA_STORE,
      `workspaces/${userRecord.workspaceId}`
    );
    const spaces = await listWorkspaceSpaces(userRecord.workspaceId);
    return json(
      {
        user: profile,
        workspace: ws ? sanitizeWorkspace(ws) : null,
        spaces
      },
      200,
      { "Set-Cookie": buildSessionCookieHeader(token, req) }
    );
  }
  if (path === "/api/auth/logout" && method === "POST") {
    await destroySession(req);
    return json({ ok: true }, 200, { "Set-Cookie": buildSessionCookieHeader("", req, true) });
  }
  if (path === "/api/workspace" && method === "PATCH") {
    const user = await getSessionUser(req);
    if (!user) return json({ error: "Authentication required" }, 401);
    const store = getStorage();
    const key = `workspaces/${user.workspaceId}`;
    const ws = await store.getJSON(DATA_STORE, key);
    if (!ws) return json({ error: "Workspace not found" }, 404);
    const parsed = await parseJsonBody(req);
    if (!parsed.ok) return parsed.errorResponse;
    const body = parsed.data;
    if (body.aiProvider !== void 0 && !ALLOWED_AI_PROVIDERS.has(body.aiProvider)) {
      return json({ error: "Invalid AI provider." }, 400);
    }
    const updated = {
      ...ws,
      name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : ws.name,
      plan: "free",
      licenseKey: null,
      aiProvider: body.aiProvider ?? ws.aiProvider,
      customAiKey: body.customAiKey !== void 0 ? typeof body.customAiKey === "string" ? body.customAiKey.trim() || null : null : ws.customAiKey
    };
    await store.setJSON(DATA_STORE, key, updated);
    return json({ workspace: sanitizeWorkspace(updated) });
  }
  return null;
}

// netlify/lib/routesSpaces.ts
import { randomBytes as randomBytes3, randomUUID as randomUUID2 } from "node:crypto";
var ALLOWED_THEMES = /* @__PURE__ */ new Set(["paper", "midnight", "cream", "indigo"]);
var ALLOWED_LAYOUTS = /* @__PURE__ */ new Set(["masonry", "grid", "marquee", "spotlight", "badge"]);
var ALLOWED_RADII = /* @__PURE__ */ new Set(["sharp", "soft", "pill"]);
function sanitizeHexColor(input, fallback) {
  const trimmed = (input ?? "").trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(trimmed) ? trimmed : fallback;
}
function sanitizePrompts(input, fallback) {
  if (!input || typeof input !== "object") return fallback;
  const p = input;
  return {
    step1: typeof p.step1 === "string" && p.step1.trim() ? p.step1.trim() : fallback.step1,
    step2: typeof p.step2 === "string" && p.step2.trim() ? p.step2.trim() : fallback.step2,
    step3: typeof p.step3 === "string" && p.step3.trim() ? p.step3.trim() : fallback.step3
  };
}
async function handleSpaceRoutes(req, path, method) {
  if (path === "/api/spaces" && method === "GET") {
    const user = await getSessionUser(req);
    if (!user) return json({ error: "Authentication required" }, 401);
    const spaces = await listWorkspaceSpaces(user.workspaceId);
    return json({ spaces });
  }
  if (path === "/api/spaces" && method === "POST") {
    const user = await getSessionUser(req);
    if (!user) return json({ error: "Authentication required" }, 401);
    const parsed = await parseJsonBody(req);
    if (!parsed.ok) return parsed.errorResponse;
    const body = parsed.data;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return json({ error: "Brand space name is required" }, 400);
    const store = getStorage();
    const desiredSlug = slugify(typeof body.slug === "string" && body.slug.trim() ? body.slug : name) || `brand-${randomBytes3(2).toString("hex")}`;
    const taken = await store.getJSON(DATA_STORE, `spaces/${desiredSlug}`);
    const slug = taken ? `${desiredSlug}-${randomBytes3(2).toString("hex")}` : desiredSlug;
    const defaultPrompts = {
      step1: `What was slowing you down before ${name}?`,
      step2: `What changed after switching to ${name}?`,
      step3: `Who would you recommend ${name} to?`
    };
    const space = {
      id: `spc_${randomUUID2().slice(0, 10)}`,
      workspaceId: user.workspaceId,
      slug,
      name,
      tagline: typeof body.tagline === "string" && body.tagline.trim() ? body.tagline.trim() : `Tell us what you think about ${name} in 20 seconds.`,
      brandColor: sanitizeHexColor(body.brandColor, "#2142e7"),
      theme: body.theme && ALLOWED_THEMES.has(body.theme) ? body.theme : "paper",
      layout: body.layout && ALLOWED_LAYOUTS.has(body.layout) ? body.layout : "masonry",
      cardRadius: body.cardRadius && ALLOWED_RADII.has(body.cardRadius) ? body.cardRadius : "soft",
      showRatings: typeof body.showRatings === "boolean" ? body.showRatings : true,
      showVoiceBadge: typeof body.showVoiceBadge === "boolean" ? body.showVoiceBadge : true,
      showMetrics: typeof body.showMetrics === "boolean" ? body.showMetrics : true,
      showCompany: typeof body.showCompany === "boolean" ? body.showCompany : true,
      hidePoweredBy: typeof body.hidePoweredBy === "boolean" ? body.hidePoweredBy : false,
      prompts: sanitizePrompts(body.prompts, defaultPrompts),
      googleMapsPlaceUrl: typeof body.googleMapsPlaceUrl === "string" ? body.googleMapsPlaceUrl.trim() : "",
      productHuntSlug: typeof body.productHuntSlug === "string" ? body.productHuntSlug.trim() : "",
      linkedinHandle: typeof body.linkedinHandle === "string" ? body.linkedinHandle.trim() : "",
      webhookUrl: typeof body.webhookUrl === "string" && isSafeWebhookUrl(body.webhookUrl.trim()) ? body.webhookUrl.trim() : "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await store.setJSON(DATA_STORE, `spaces/${slug}`, space);
    await store.setJSON(DATA_STORE, `workspace-spaces/${user.workspaceId}/${slug}`, { slug });
    return json({ space }, 201);
  }
  const spacePatchMatch = path.match(/^\/api\/spaces\/([a-z0-9-]+)$/);
  if (spacePatchMatch && method === "PATCH") {
    const auth = await requireAuthSpace(req, spacePatchMatch[1]);
    if ("errorResponse" in auth) return auth.errorResponse;
    const parsed = await parseJsonBody(req);
    if (!parsed.ok) return parsed.errorResponse;
    const body = parsed.data;
    if (typeof body.webhookUrl === "string" && body.webhookUrl.trim() && !isSafeWebhookUrl(body.webhookUrl.trim())) {
      return json({ error: "Webhook URL must be a valid public https:// endpoint." }, 400);
    }
    const updated = {
      ...auth.space,
      name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : auth.space.name,
      tagline: typeof body.tagline === "string" ? body.tagline.trim() : auth.space.tagline,
      brandColor: sanitizeHexColor(body.brandColor, auth.space.brandColor),
      theme: body.theme && ALLOWED_THEMES.has(body.theme) ? body.theme : auth.space.theme,
      layout: body.layout && ALLOWED_LAYOUTS.has(body.layout) ? body.layout : auth.space.layout,
      cardRadius: body.cardRadius && ALLOWED_RADII.has(body.cardRadius) ? body.cardRadius : auth.space.cardRadius,
      showRatings: typeof body.showRatings === "boolean" ? body.showRatings : auth.space.showRatings,
      showVoiceBadge: typeof body.showVoiceBadge === "boolean" ? body.showVoiceBadge : auth.space.showVoiceBadge,
      showMetrics: typeof body.showMetrics === "boolean" ? body.showMetrics : auth.space.showMetrics,
      showCompany: typeof body.showCompany === "boolean" ? body.showCompany : auth.space.showCompany,
      hidePoweredBy: typeof body.hidePoweredBy === "boolean" ? body.hidePoweredBy : auth.space.hidePoweredBy,
      prompts: body.prompts !== void 0 ? sanitizePrompts(body.prompts, auth.space.prompts) : auth.space.prompts,
      googleMapsPlaceUrl: typeof body.googleMapsPlaceUrl === "string" ? body.googleMapsPlaceUrl.trim() : auth.space.googleMapsPlaceUrl,
      productHuntSlug: typeof body.productHuntSlug === "string" ? body.productHuntSlug.trim() : auth.space.productHuntSlug,
      linkedinHandle: typeof body.linkedinHandle === "string" ? body.linkedinHandle.trim() : auth.space.linkedinHandle,
      webhookUrl: typeof body.webhookUrl === "string" ? body.webhookUrl.trim() : auth.space.webhookUrl
    };
    await getStorage().setJSON(DATA_STORE, `spaces/${auth.space.slug}`, updated);
    return json({ space: updated });
  }
  return null;
}

// netlify/lib/routesPublic.ts
import { randomUUID as randomUUID3 } from "node:crypto";

// netlify/lib/ai.ts
function getEnvVar(name) {
  const netlifyGlobal = globalThis.Netlify;
  return netlifyGlobal?.env?.get(name) ?? (typeof process !== "undefined" ? process.env[name] : void 0);
}
async function transcribeAudioWithOpenAI(audioBuffer, mimeType, apiKey) {
  try {
    const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("wav") ? "wav" : mimeType.includes("mpeg") ? "mp3" : "webm";
    const form = new FormData();
    form.append("file", new Blob([audioBuffer], { type: mimeType }), `voice-note.${ext}`);
    form.append("model", "whisper-1");
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.text?.trim() || null;
  } catch {
    return null;
  }
}
async function polishTranscriptWithLLM(params) {
  const local = cleanTranscriptLocally(params.rawTranscript, params.brandName);
  if (!params.rawTranscript.trim()) return local;
  const openAiKey = params.preferredProvider === "openai" && params.customKey || getEnvVar("OPENAI_API_KEY") || (params.customKey?.startsWith("sk-") ? params.customKey : void 0);
  if (openAiKey) {
    try {
      const prompt = `Clean up this raw spoken customer voice-note transcript for "${params.brandName || "our product"}".
Remove filler words (um, uh, like, you know), stutters, and false starts while preserving 100% of the customer's factual claims and authentic tone. Never invent numbers or claims.
Return strict JSON:
{
  "authentic": "...",
  "crisp": "tight 2-sentence version",
  "results": "leads with measurable outcome if any, else crisp version",
  "pullQuote": "best 6-14 word punchy headline quote",
  "outcomeMetric": "exact metric mentioned or null",
  "recommendedTone": "authentic" | "crisp" | "results"
}
Transcript:
"""${params.rawTranscript}"""`;
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (res.ok) {
        const json2 = await res.json();
        const content = json2.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed.authentic) {
            return {
              ...local,
              cleanedByTone: {
                authentic: parsed.authentic,
                crisp: parsed.crisp || local.cleanedByTone.crisp,
                results: parsed.results || local.cleanedByTone.results
              },
              pullQuote: parsed.pullQuote || local.pullQuote,
              outcomeMetric: parsed.outcomeMetric ?? local.outcomeMetric,
              recommendedTone: parsed.recommendedTone || local.recommendedTone,
              cleanedWordCount: parsed.authentic.split(/\s+/).length,
              engine: "openai"
            };
          }
        }
      }
    } catch {
    }
  }
  return local;
}

// shared/syndication.ts
function buildSyndicationDrafts(testimonial, space, originUrl) {
  const attribution = [
    testimonial.authorName,
    testimonial.authorRole,
    testimonial.authorCompany
  ].filter(Boolean).join(", ");
  const metricLine = testimonial.outcomeMetric ? `

Result highlighted: ${testimonial.outcomeMetric}` : "";
  const voiceTag = testimonial.hasAudio ? ` (captured from a ${testimonial.durationSec ?? 20}s voice note)` : "";
  const wallLink = `${originUrl.replace(/\/$/, "")}/wall/${space.slug}`;
  const linkedinPost = [
    `What ${testimonial.authorName} told us after trying ${space.name}${voiceTag}:`,
    "",
    `"${testimonial.cleanedText}"`,
    `\u2014 ${attribution}${metricLine}`,
    "",
    `No scripted sales copy\u2014just real customer proof.`,
    `See our Wall of Love: ${wallLink}`
  ].join("\n");
  const xText = `"${testimonial.pullQuote || testimonial.cleanedText.slice(0, 140)}" \u2014 ${testimonial.authorName} on ${space.name} ${wallLink}`;
  const googleMapsUrl = space.googleMapsPlaceUrl?.trim() ? space.googleMapsPlaceUrl.trim() : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(space.name)}`;
  const productHuntSlug = space.productHuntSlug?.trim() || space.slug;
  const productHuntUrl = `https://www.producthunt.com/products/${encodeURIComponent(productHuntSlug)}/reviews`;
  return {
    linkedinPost,
    linkedinShareUrl: `https://www.linkedin.com/feed/?shareActive=true&mini=true&text=${encodeURIComponent(linkedinPost)}`,
    xPost: xText,
    xShareUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}`,
    googleMapsUrl,
    productHuntUrl
  };
}

// shared/embedTemplate.ts
function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function getThemePalette(theme) {
  switch (theme) {
    case "midnight":
      return {
        bg: "#090d16",
        cardBg: "#111827",
        border: "#1f2937",
        text: "#f8fafc",
        muted: "#94a3b8",
        badgeBg: "rgba(16, 185, 129, 0.14)",
        badgeText: "#34d399"
      };
    case "cream":
      return {
        bg: "#fbf7ef",
        cardBg: "#fffdf8",
        border: "#eadfcd",
        text: "#1c1917",
        muted: "#78716c",
        badgeBg: "#ecfdf5",
        badgeText: "#047857"
      };
    case "indigo":
      return {
        bg: "#eef2ff",
        cardBg: "rgba(255,255,255,0.9)",
        border: "#c7d2fe",
        text: "#1e1b4b",
        muted: "#4338ca",
        badgeBg: "#e0e7ff",
        badgeText: "#3730a3"
      };
    case "paper":
    default:
      return {
        bg: "transparent",
        cardBg: "#ffffff",
        border: "#e2e8f0",
        text: "#0f172a",
        muted: "#64748b",
        badgeBg: "#ecfdf5",
        badgeText: "#047857"
      };
  }
}
function safeHexColor(color, fallback = "#2142e7") {
  const trimmed = (color ?? "").trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(trimmed) ? trimmed : fallback;
}
function buildStandaloneLifetimeHtml(space, testimonials, originUrl) {
  const approved = testimonials.filter((t) => t.status === "approved");
  const palette = getThemePalette(space.theme);
  const accent = safeHexColor(space.brandColor);
  const radius = space.cardRadius === "sharp" ? "6px" : space.cardRadius === "pill" ? "24px" : "16px";
  const cardsHtml = approved.map((item) => {
    const clampedRating = Math.max(0, Math.min(5, Math.round(item.rating || 5)));
    const stars = space.showRatings ? `<div class="vv-stars" aria-label="${clampedRating} out of 5 stars">${"\u2605".repeat(clampedRating)}${"\u2606".repeat(5 - clampedRating)}</div>` : "";
    const metric = space.showMetrics && item.outcomeMetric ? `<span class="vv-metric">${escapeHtml(item.outcomeMetric)}</span>` : "";
    const voiceBadge = space.showVoiceBadge && item.hasAudio ? `<span class="vv-voice">${item.durationSec ?? 20}s voice note</span>` : "";
    const roleLine = space.showCompany ? [item.authorRole, item.authorCompany].filter(Boolean).join(", ") : item.authorRole;
    const initials = item.authorName.split(/\s+/).map((p) => p[0] || "").join("").slice(0, 2).toUpperCase();
    return `
      <article class="vv-card">
        <div class="vv-top">
          ${stars}
          <div class="vv-badges">${voiceBadge}${metric}</div>
        </div>
        ${item.pullQuote ? `<h3 class="vv-quote">\u201C${escapeHtml(item.pullQuote)}\u201D</h3>` : ""}
        <p class="vv-body">${escapeHtml(item.cleanedText)}</p>
        <footer class="vv-author">
          <div class="vv-avatar" style="background:${safeHexColor(item.authorAvatarColor, accent)}">${escapeHtml(initials)}</div>
          <div>
            <div class="vv-name">${escapeHtml(item.authorName)}</div>
            ${roleLine ? `<div class="vv-role">${escapeHtml(roleLine)}</div>` : ""}
          </div>
        </footer>
      </article>`;
  }).join("\n");
  const poweredBy = space.hidePoweredBy ? "" : `<div class="vv-footer">Powered by <a href="${escapeHtml(originUrl)}" target="_blank" rel="noopener">VouchVoice</a></div>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(space.name)} \u2014 Wall of Love (Self-Hosted Standalone Embed)</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 28px 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: ${palette.bg === "transparent" ? "#f8fafc" : palette.bg};
      color: ${palette.text};
    }
    .vv-wrap { max-width: 1120px; margin: 0 auto; }
    .vv-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 18px;
      align-items: start;
    }
    .vv-card {
      background: ${palette.cardBg};
      border: 1px solid ${palette.border};
      border-radius: ${radius};
      padding: 20px;
      box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
    }
    .vv-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .vv-stars { color: #f59e0b; font-size: 14px; letter-spacing: 1px; }
    .vv-badges { display: flex; gap: 6px; flex-wrap: wrap; }
    .vv-voice, .vv-metric {
      font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px;
      background: ${palette.badgeBg}; color: ${palette.badgeText};
    }
    .vv-quote { margin: 0 0 8px; font-size: 15px; line-height: 1.4; font-weight: 700; }
    .vv-body { margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: ${palette.text}; opacity: 0.9; }
    .vv-author { display: flex; align-items: center; gap: 10px; }
    .vv-avatar {
      width: 34px; height: 34px; border-radius: 999px; color: #fff;
      font-size: 12px; font-weight: 700; display: grid; place-items: center; flex-shrink: 0;
    }
    .vv-name { font-size: 13px; font-weight: 700; }
    .vv-role { font-size: 12px; color: ${palette.muted}; }
    .vv-footer { margin-top: 18px; text-align: center; font-size: 12px; color: ${palette.muted}; }
    .vv-footer a { color: ${accent}; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <section class="vv-wrap">
    <div class="vv-grid">${cardsHtml}</div>
    ${poweredBy}
  </section>
</body>
</html>`;
}

// netlify/lib/routesPublic.ts
async function handlePublicRoutes(req, url, path, method) {
  if (path === "/api/public/ai/polish" && method === "POST") {
    const parsed = await parseJsonBody(req, PUBLIC_CORS);
    if (!parsed.ok) return parsed.errorResponse;
    const body = parsed.data;
    const store = getStorage();
    let brandName = typeof body.brandName === "string" ? body.brandName.trim() : void 0;
    let customAiKey;
    let aiProvider = "built_in";
    if (typeof body.spaceSlug === "string" && body.spaceSlug.trim()) {
      const sp = await store.getJSON(DATA_STORE, `spaces/${body.spaceSlug.trim()}`);
      if (sp) {
        brandName = brandName || sp.name;
        const ws = await store.getJSON(
          DATA_STORE,
          `workspaces/${sp.workspaceId}`
        );
        customAiKey = ws?.customAiKey;
        aiProvider = ws?.aiProvider ?? "built_in";
      }
    }
    let transcriptText = typeof body.rawTranscript === "string" ? body.rawTranscript.trim() : "";
    if (!transcriptText && typeof body.audioBase64 === "string" && customAiKey) {
      const bytes = decodeBase64Audio(body.audioBase64);
      if (bytes) {
        const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        const whisperText = await transcribeAudioWithOpenAI(
          buf,
          typeof body.audioMimeType === "string" && body.audioMimeType ? body.audioMimeType : "audio/webm",
          customAiKey
        );
        if (whisperText) transcriptText = whisperText;
      }
    }
    const analysis = await polishTranscriptWithLLM({
      rawTranscript: transcriptText,
      brandName,
      customKey: customAiKey,
      preferredProvider: aiProvider
    });
    return json(analysis, 200, PUBLIC_CORS);
  }
  const publicSpaceMatch = path.match(/^\/api\/public\/spaces\/([a-z0-9-]+)$/);
  if (publicSpaceMatch && method === "GET") {
    const slug = publicSpaceMatch[1];
    const store = getStorage();
    const space = await store.getJSON(DATA_STORE, `spaces/${slug}`);
    if (!space) return json({ error: "Space not found" }, 404, PUBLIC_CORS);
    const all = await listSpaceTestimonials(slug);
    const approved = all.filter((t) => t.status === "approved");
    const avgRating = approved.length > 0 ? Number((approved.reduce((sum, t) => sum + t.rating, 0) / approved.length).toFixed(1)) : 5;
    return json(
      {
        space: {
          id: space.id,
          slug: space.slug,
          name: space.name,
          tagline: space.tagline,
          brandColor: space.brandColor,
          theme: space.theme,
          layout: space.layout,
          cardRadius: space.cardRadius,
          showRatings: space.showRatings,
          showVoiceBadge: space.showVoiceBadge,
          showMetrics: space.showMetrics,
          showCompany: space.showCompany,
          hidePoweredBy: space.hidePoweredBy,
          prompts: space.prompts,
          googleMapsPlaceUrl: space.googleMapsPlaceUrl,
          productHuntSlug: space.productHuntSlug
        },
        testimonials: approved.map((t) => ({
          ...t,
          audioUrl: t.hasAudio ? `/api/audio/${t.id}` : null
        })),
        stats: {
          totalApproved: approved.length,
          voiceCount: approved.filter((t) => t.source === "voice" || t.hasAudio).length,
          averageRating: avgRating
        }
      },
      200,
      PUBLIC_CORS
    );
  }
  const publicSubmitMatch = path.match(/^\/api\/public\/spaces\/([a-z0-9-]+)\/submit$/);
  if (publicSubmitMatch && method === "POST") {
    const slug = publicSubmitMatch[1];
    const store = getStorage();
    const space = await store.getJSON(DATA_STORE, `spaces/${slug}`);
    if (!space) return json({ error: "Space not found" }, 404, PUBLIC_CORS);
    const parsed = await parseJsonBody(req, PUBLIC_CORS);
    if (!parsed.ok) return parsed.errorResponse;
    const body = parsed.data;
    const authorName = typeof body.authorName === "string" ? body.authorName.trim() : "";
    const rawTranscript = typeof body.rawTranscript === "string" ? body.rawTranscript.trim() : "";
    const cleanedText = (typeof body.cleanedText === "string" ? body.cleanedText.trim() : "") || cleanTranscriptLocally(rawTranscript, space.name).cleanedByTone.authentic;
    if (!authorName || !cleanedText) {
      return json({ error: "Please provide your name and approved review text." }, 400, PUBLIC_CORS);
    }
    const id = `t_${randomUUID3().slice(0, 10)}`;
    let hasAudio = false;
    let audioKey = null;
    if (typeof body.audioBase64 === "string" && body.audioBase64) {
      const bytes = decodeBase64Audio(body.audioBase64);
      if (bytes) {
        audioKey = `audio/${id}`;
        await store.setBinary(AUDIO_STORE, audioKey, bytes, {
          contentType: typeof body.audioMimeType === "string" && body.audioMimeType ? body.audioMimeType : "audio/webm",
          durationSec: typeof body.durationSec === "number" && Number.isFinite(body.durationSec) ? body.durationSec : 20
        });
        hasAudio = true;
      }
    }
    const fallbackAnalysis = cleanTranscriptLocally(cleanedText, space.name);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const rating = Math.max(1, Math.min(5, Math.round(Number(body.rating ?? 5) || 5)));
    const validTone = body.tone === "authentic" || body.tone === "crisp" || body.tone === "results" ? body.tone : "authentic";
    const testimonial = {
      id,
      spaceSlug: slug,
      authorName,
      authorRole: (typeof body.authorRole === "string" ? body.authorRole.trim() : "") || "Customer",
      authorCompany: typeof body.authorCompany === "string" ? body.authorCompany.trim() : "",
      authorAvatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      rating,
      rawTranscript: rawTranscript || cleanedText,
      cleanedText,
      pullQuote: (typeof body.pullQuote === "string" ? body.pullQuote.trim() : "") || fallbackAnalysis.pullQuote,
      tone: validTone,
      outcomeMetric: body.outcomeMetric !== void 0 ? typeof body.outcomeMetric === "string" ? body.outcomeMetric.trim() || null : null : fallbackAnalysis.outcomeMetric,
      source: hasAudio ? "voice" : "text",
      durationSec: typeof body.durationSec === "number" && Number.isFinite(body.durationSec) ? Math.max(1, Math.min(180, Math.round(body.durationSec))) : hasAudio ? 20 : null,
      hasAudio,
      audioKey,
      status: "approved",
      featured: false,
      syndicatedTargets: [],
      tags: Array.isArray(body.tags) && body.tags.every((t) => typeof t === "string") && body.tags.length > 0 ? body.tags.slice(0, 8) : fallbackAnalysis.tags,
      fillersRemovedCount: typeof body.fillersRemovedCount === "number" && Number.isFinite(body.fillersRemovedCount) ? Math.max(0, Math.round(body.fillersRemovedCount)) : 0,
      createdAt: nowIso,
      approvedAt: nowIso
    };
    await store.setJSON(DATA_STORE, `testimonials/${slug}/${id}`, testimonial);
    if (space.webhookUrl && isSafeWebhookUrl(space.webhookUrl)) {
      const res = await dispatchWebhook(space, testimonial);
      const ev = {
        id: `syn_${randomUUID3().slice(0, 8)}`,
        spaceSlug: slug,
        testimonialId: id,
        target: "webhook",
        status: res.ok ? "sent" : "failed",
        detail: res.detail,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await store.setJSON(DATA_STORE, `syndication-events/${slug}/${ev.id}`, ev);
      if (res.ok) {
        testimonial.syndicatedTargets.push("webhook");
        await store.setJSON(DATA_STORE, `testimonials/${slug}/${id}`, testimonial);
      }
    }
    const drafts = buildSyndicationDrafts(testimonial, space, url.origin);
    return json(
      {
        testimonial: { ...testimonial, audioUrl: hasAudio ? `/api/audio/${id}` : null },
        handoff: {
          googleMapsUrl: space.googleMapsPlaceUrl ? drafts.googleMapsUrl : null,
          productHuntUrl: space.productHuntSlug ? drafts.productHuntUrl : null
        }
      },
      201,
      PUBLIC_CORS
    );
  }
  const audioMatch = path.match(/^\/api\/audio\/([a-zA-Z0-9_-]+)$/);
  if (audioMatch && method === "GET") {
    const id = audioMatch[1];
    const store = getStorage();
    let entry = await store.getBinary(AUDIO_STORE, `audio/${id}`);
    if (!entry) {
      entry = await store.getBinary(AUDIO_STORE, `audio/${id}.wav`);
    }
    if (!entry) return json({ error: "Audio not found" }, 404, PUBLIC_CORS);
    const contentType = String(entry.metadata?.contentType || "audio/wav");
    return new Response(entry.data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(entry.data.byteLength),
        "Cache-Control": "public, max-age=86400",
        ...PUBLIC_CORS
      }
    });
  }
  const exportWallMatch = path.match(/^\/api\/public\/walls\/([a-z0-9-]+)\/export$/);
  if (exportWallMatch && method === "GET") {
    const slug = exportWallMatch[1];
    const store = getStorage();
    const space = await store.getJSON(DATA_STORE, `spaces/${slug}`);
    if (!space) return json({ error: "Space not found" }, 404);
    const testimonials = await listSpaceTestimonials(slug);
    const html = buildStandaloneLifetimeHtml(space, testimonials, url.origin);
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}-wall-of-love.html"`
      }
    });
  }
  return null;
}

// netlify/lib/routesTestimonials.ts
import { randomUUID as randomUUID4 } from "node:crypto";

// shared/importer.ts
function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}
function detectImportSource(raw) {
  const lower = raw.toLowerCase();
  if (lower.includes("senja") || lower.includes("customer_name") || lower.includes("approved_at")) {
    return "senja_import";
  }
  if (lower.includes("testimonial.to") || lower.includes("testimonialtext") || lower.includes("customercompany")) {
    return "testimonial_to_import";
  }
  if (lower.includes("google") && lower.includes("maps")) return "google_import";
  if (lower.includes("producthunt") || lower.includes("product hunt")) return "producthunt_import";
  if (lower.includes("linkedin")) return "linkedin_import";
  return "csv_import";
}
function parseImportPayload(rawInput, preferredSource, brandName) {
  const trimmed = rawInput.trim();
  if (!trimmed) return [];
  const detectedSource = preferredSource ?? detectImportSource(trimmed);
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const list2 = Array.isArray(parsed) ? parsed : parsed.testimonials ?? parsed.reviews ?? parsed.items ?? parsed.data ?? [];
      if (Array.isArray(list2)) {
        return list2.map((item) => {
          const text = String(
            item.cleanedText ?? item.text ?? item.quote ?? item.testimonialText ?? item.content ?? item.comment ?? item.body ?? ""
          ).trim();
          if (!text) return null;
          const authorName = String(
            item.authorName ?? item.author ?? item.customer_name ?? item.customerName ?? item.name ?? "Verified Customer"
          ).trim();
          const authorRole = String(
            item.authorRole ?? item.role ?? item.title ?? item.customerTitle ?? "Customer"
          ).trim();
          const authorCompany = String(
            item.authorCompany ?? item.company ?? item.customerCompany ?? ""
          ).trim();
          const ratingNum = Number(item.rating ?? item.stars ?? item.score ?? 5);
          const rating = Number.isFinite(ratingNum) ? Math.max(1, Math.min(5, Math.round(ratingNum))) : 5;
          const cleaned = cleanTranscriptLocally(text, brandName).cleanedByTone.authentic;
          return {
            authorName,
            authorRole,
            authorCompany,
            rating,
            text: cleaned || text,
            source: detectedSource
          };
        }).filter((x) => x !== null);
      }
    } catch {
    }
  }
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2 && lines[0].includes(",")) {
    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const looksLikeHeader = headers.some(
      (h) => ["name", "author", "customer", "text", "quote", "review", "testimonial", "content"].some(
        (k) => h.includes(k)
      )
    );
    if (looksLikeHeader) {
      const findIdx = (keys) => headers.findIndex((h) => keys.some((k) => h.includes(k)));
      const nameIdx = findIdx(["name", "author", "customer"]);
      const roleIdx = findIdx(["role", "title", "job"]);
      const companyIdx = findIdx(["company", "org", "brand"]);
      const ratingIdx = findIdx(["rating", "star", "score"]);
      const textIdx = findIdx(["text", "quote", "review", "testimonial", "content", "comment", "body"]);
      const results = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const text = (textIdx >= 0 ? cols[textIdx] : cols[cols.length - 1] ?? "").trim();
        if (!text) continue;
        const ratingNum = ratingIdx >= 0 ? Number(cols[ratingIdx]) : 5;
        results.push({
          authorName: (nameIdx >= 0 ? cols[nameIdx] : "") || "Verified Customer",
          authorRole: (roleIdx >= 0 ? cols[roleIdx] : "") || "Customer",
          authorCompany: companyIdx >= 0 ? cols[companyIdx] || "" : "",
          rating: Number.isFinite(ratingNum) && ratingNum > 0 ? Math.max(1, Math.min(5, Math.round(ratingNum))) : 5,
          text: cleanTranscriptLocally(text, brandName).cleanedByTone.authentic || text,
          source: detectedSource
        });
      }
      if (results.length > 0) return results;
    }
  }
  return lines.map((line) => {
    const dashSplit = line.match(/^["“]?(.+?)["”]?\s+[—–-]\s+([^,@]+?)(?:,\s*([^@]+?))?(?:\s*@\s*(.+))?$/);
    if (dashSplit) {
      return {
        authorName: dashSplit[2].trim(),
        authorRole: (dashSplit[3] ?? "Customer").trim(),
        authorCompany: (dashSplit[4] ?? "").trim(),
        rating: 5,
        text: cleanTranscriptLocally(dashSplit[1].trim(), brandName).cleanedByTone.authentic,
        source: detectedSource
      };
    }
    return {
      authorName: "Imported Reviewer",
      authorRole: "Customer",
      authorCompany: "",
      rating: 5,
      text: cleanTranscriptLocally(line, brandName).cleanedByTone.authentic,
      source: detectedSource
    };
  }).filter((item) => item.text.length > 0);
}

// netlify/lib/routesTestimonials.ts
async function handleTestimonialRoutes(req, url, path, method) {
  const spaceItemsMatch = path.match(/^\/api\/spaces\/([a-z0-9-]+)\/testimonials$/);
  if (spaceItemsMatch && method === "GET") {
    const auth = await requireAuthSpace(req, spaceItemsMatch[1]);
    if ("errorResponse" in auth) return auth.errorResponse;
    const testimonials = await listSpaceTestimonials(auth.space.slug);
    const events = await listSyndicationEvents(auth.space.slug);
    return json({
      space: auth.space,
      testimonials: testimonials.map((t) => ({
        ...t,
        audioUrl: t.hasAudio ? `/api/audio/${t.id}` : null
      })),
      events
    });
  }
  const itemPatchMatch = path.match(/^\/api\/spaces\/([a-z0-9-]+)\/testimonials\/([a-zA-Z0-9_-]+)$/);
  if (itemPatchMatch && method === "PATCH") {
    const [, slug, id] = itemPatchMatch;
    const auth = await requireAuthSpace(req, slug);
    if ("errorResponse" in auth) return auth.errorResponse;
    const store = getStorage();
    const key = `testimonials/${slug}/${id}`;
    const existing = await store.getJSON(DATA_STORE, key);
    if (!existing) return json({ error: "Testimonial not found" }, 404);
    const parsed = await parseJsonBody(req);
    if (!parsed.ok) return parsed.errorResponse;
    const body = parsed.data;
    if (body.status !== void 0 && body.status !== "approved" && body.status !== "pending" && body.status !== "archived") {
      return json({ error: "Invalid review status." }, 400);
    }
    const nextStatus = body.status ?? existing.status;
    const updated = {
      ...existing,
      status: nextStatus,
      featured: typeof body.featured === "boolean" ? body.featured : existing.featured,
      cleanedText: typeof body.cleanedText === "string" && body.cleanedText.trim() ? body.cleanedText.trim() : existing.cleanedText,
      pullQuote: typeof body.pullQuote === "string" ? body.pullQuote.trim() : existing.pullQuote,
      tone: body.tone === "authentic" || body.tone === "crisp" || body.tone === "results" ? body.tone : existing.tone,
      outcomeMetric: body.outcomeMetric !== void 0 ? typeof body.outcomeMetric === "string" ? body.outcomeMetric.trim() || null : null : existing.outcomeMetric,
      authorName: typeof body.authorName === "string" && body.authorName.trim() ? body.authorName.trim() : existing.authorName,
      authorRole: typeof body.authorRole === "string" ? body.authorRole.trim() : existing.authorRole,
      authorCompany: typeof body.authorCompany === "string" ? body.authorCompany.trim() : existing.authorCompany,
      rating: typeof body.rating === "number" && Number.isFinite(body.rating) ? Math.max(1, Math.min(5, Math.round(body.rating))) : existing.rating,
      approvedAt: nextStatus === "approved" && !existing.approvedAt ? (/* @__PURE__ */ new Date()).toISOString() : existing.approvedAt
    };
    await store.setJSON(DATA_STORE, key, updated);
    return json({
      testimonial: { ...updated, audioUrl: updated.hasAudio ? `/api/audio/${updated.id}` : null }
    });
  }
  if (itemPatchMatch && method === "DELETE") {
    const [, slug, id] = itemPatchMatch;
    const auth = await requireAuthSpace(req, slug);
    if ("errorResponse" in auth) return auth.errorResponse;
    const store = getStorage();
    await store.deleteKey(DATA_STORE, `testimonials/${slug}/${id}`);
    await store.deleteKey(AUDIO_STORE, `audio/${id}`);
    await store.deleteKey(AUDIO_STORE, `audio/${id}.wav`);
    return json({ ok: true });
  }
  const importMatch = path.match(/^\/api\/spaces\/([a-z0-9-]+)\/import$/);
  if (importMatch && method === "POST") {
    const auth = await requireAuthSpace(req, importMatch[1]);
    if ("errorResponse" in auth) return auth.errorResponse;
    const parsedBody = await parseJsonBody(req);
    if (!parsedBody.ok) return parsedBody.errorResponse;
    const body = parsedBody.data;
    const parsed = parseImportPayload(
      typeof body.rawInput === "string" ? body.rawInput : "",
      body.preferredSource,
      auth.space.name
    );
    if (parsed.length === 0) {
      return json({ error: "No recognizable testimonials found in input." }, 400);
    }
    const store = getStorage();
    const created = [];
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    for (let i = 0; i < Math.min(parsed.length, 50); i++) {
      const row = parsed[i];
      const analysis = cleanTranscriptLocally(row.text, auth.space.name);
      const id = `t_imp_${randomUUID4().slice(0, 8)}`;
      const record = {
        id,
        spaceSlug: auth.space.slug,
        authorName: row.authorName,
        authorRole: row.authorRole,
        authorCompany: row.authorCompany,
        authorAvatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
        rating: row.rating,
        rawTranscript: row.text,
        cleanedText: analysis.cleanedByTone.authentic || row.text,
        pullQuote: analysis.pullQuote,
        tone: "authentic",
        outcomeMetric: analysis.outcomeMetric,
        source: row.source,
        durationSec: null,
        hasAudio: false,
        audioKey: null,
        status: "approved",
        featured: false,
        syndicatedTargets: [],
        tags: analysis.tags,
        fillersRemovedCount: analysis.fillersRemovedCount,
        createdAt: nowIso,
        approvedAt: nowIso
      };
      await store.setJSON(DATA_STORE, `testimonials/${auth.space.slug}/${id}`, record);
      created.push(record);
    }
    return json({ importedCount: created.length, testimonials: created }, 201);
  }
  const syndicateMatch = path.match(/^\/api\/spaces\/([a-z0-9-]+)\/syndicate$/);
  if (syndicateMatch && method === "POST") {
    const auth = await requireAuthSpace(req, syndicateMatch[1]);
    if ("errorResponse" in auth) return auth.errorResponse;
    const parsedBody = await parseJsonBody(req);
    if (!parsedBody.ok) return parsedBody.errorResponse;
    const body = parsedBody.data;
    const validTargets = /* @__PURE__ */ new Set([
      "linkedin",
      "google_maps",
      "product_hunt",
      "x",
      "webhook"
    ]);
    if (typeof body.testimonialId !== "string" || !body.testimonialId.trim() || !body.target || !validTargets.has(body.target)) {
      return json({ error: "Valid testimonialId and target are required" }, 400);
    }
    const store = getStorage();
    const itemKey = `testimonials/${auth.space.slug}/${body.testimonialId}`;
    const testimonial = await store.getJSON(DATA_STORE, itemKey);
    if (!testimonial) return json({ error: "Testimonial not found" }, 404);
    const drafts = buildSyndicationDrafts(testimonial, auth.space, url.origin);
    let status = "intent_opened";
    let detail = "";
    if (body.target === "webhook") {
      const res = await dispatchWebhook(auth.space, testimonial);
      status = res.ok ? "sent" : "failed";
      detail = res.detail;
    } else if (body.target === "google_maps") {
      status = "handoff_copied";
      detail = `Generated Google Maps review handoff for ${testimonial.authorName}`;
    } else if (body.target === "product_hunt") {
      status = "handoff_copied";
      detail = `Generated Product Hunt review handoff for ${testimonial.authorName}`;
    } else if (body.target === "linkedin") {
      status = "intent_opened";
      detail = `Prepared LinkedIn post & quote card for ${testimonial.authorName}`;
    } else {
      status = "intent_opened";
      detail = `Prepared X post intent for ${testimonial.authorName}`;
    }
    if (status !== "failed" && !testimonial.syndicatedTargets.includes(body.target)) {
      testimonial.syndicatedTargets.push(body.target);
      await store.setJSON(DATA_STORE, itemKey, testimonial);
    }
    const event = {
      id: `syn_${randomUUID4().slice(0, 8)}`,
      spaceSlug: auth.space.slug,
      testimonialId: testimonial.id,
      target: body.target,
      status,
      detail,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await store.setJSON(DATA_STORE, `syndication-events/${auth.space.slug}/${event.id}`, event);
    return json({
      event,
      drafts,
      testimonial: {
        ...testimonial,
        audioUrl: testimonial.hasAudio ? `/api/audio/${testimonial.id}` : null
      }
    });
  }
  return null;
}

// netlify/lib/router.ts
async function handleApiRequest(req) {
  const url = new URL(req.url);
  const rewrittenPath = url.searchParams.get("__path");
  if (rewrittenPath && url.pathname.startsWith("/api/handler")) {
    url.pathname = rewrittenPath.startsWith("/") ? rewrittenPath : `/${rewrittenPath}`;
    url.searchParams.delete("__path");
  }
  const path = url.pathname;
  const method = req.method.toUpperCase();
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: PUBLIC_CORS });
  }
  try {
    if (path === "/embed.js" || path === "/api/embed") {
      return handleEmbedRequest(req);
    }
    if (path === "/api/health" && method === "GET") {
      return json({ ok: true, service: "vouchvoice", timestamp: (/* @__PURE__ */ new Date()).toISOString() }, 200, PUBLIC_CORS);
    }
    await seedDemoWorkspace(false);
    if (path === "/api/auth/me" && method === "GET") {
      const user = await getSessionUser(req);
      if (!user) return json({ user: null, workspace: null, spaces: [] });
      const ws = await getStorage().getJSON(
        DATA_STORE,
        `workspaces/${user.workspaceId}`
      );
      if (!ws) return json({ user: null, workspace: null, spaces: [] });
      const spaces = await listWorkspaceSpaces(ws.id);
      return json({ user, workspace: sanitizeWorkspace(ws), spaces });
    }
    if (path === "/api/auth/demo" && method === "POST") {
      await seedDemoWorkspace(false);
      const demoUser = {
        id: DEMO_USER_ID,
        email: DEMO_USER_EMAIL,
        name: "Maya Chen (Demo Founder)",
        workspaceId: DEMO_WORKSPACE_ID,
        isDemo: true
      };
      const token = await createSession(demoUser);
      const ws = await getStorage().getJSON(
        DATA_STORE,
        `workspaces/${DEMO_WORKSPACE_ID}`
      );
      const spaces = await listWorkspaceSpaces(DEMO_WORKSPACE_ID);
      return json(
        {
          user: demoUser,
          workspace: ws ? sanitizeWorkspace(ws) : null,
          spaces
        },
        200,
        { "Set-Cookie": buildSessionCookieHeader(token, req) }
      );
    }
    if (path === "/api/demo/reset" && method === "POST") {
      const user = await getSessionUser(req);
      if (!user || user.workspaceId !== DEMO_WORKSPACE_ID) {
        return json({ error: "Only available inside the Demo workspace" }, 403);
      }
      await seedDemoWorkspace(true);
      const ws = await getStorage().getJSON(
        DATA_STORE,
        `workspaces/${DEMO_WORKSPACE_ID}`
      );
      const spaces = await listWorkspaceSpaces(DEMO_WORKSPACE_ID);
      return json({ ok: true, workspace: ws ? sanitizeWorkspace(ws) : null, spaces });
    }
    const authRes = await handleAuthAndWorkspaceRoutes(req, path, method);
    if (authRes) return authRes;
    const spaceRes = await handleSpaceRoutes(req, path, method);
    if (spaceRes) return spaceRes;
    const pubRes = await handlePublicRoutes(req, url, path, method);
    if (pubRes) return pubRes;
    const testRes = await handleTestimonialRoutes(req, url, path, method);
    if (testRes) return testRes;
    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error("VouchVoice API error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      500,
      PUBLIC_CORS
    );
  }
}

// netlify/lib/vercelEntry.ts
async function dispatch(req) {
  try {
    const url = new URL(req.url, "http://localhost");
    const rewrittenPath = url.searchParams.get("__path");
    let targetReq = req;
    if (rewrittenPath) {
      url.pathname = rewrittenPath.startsWith("/") ? rewrittenPath : `/${rewrittenPath}`;
      url.searchParams.delete("__path");
      const hasBody = req.method !== "GET" && req.method !== "HEAD" && req.body !== null;
      targetReq = new Request(url.toString(), {
        method: req.method,
        headers: req.headers,
        body: hasBody ? await req.arrayBuffer() : void 0
      });
    }
    return await handleApiRequest(targetReq);
  } catch (err) {
    console.error("[vouchvoice] unhandled route error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
async function GET(req) {
  return dispatch(req);
}
async function POST(req) {
  return dispatch(req);
}
async function PATCH(req) {
  return dispatch(req);
}
async function PUT(req) {
  return dispatch(req);
}
async function DELETE(req) {
  return dispatch(req);
}
async function OPTIONS(req) {
  return dispatch(req);
}
export {
  DELETE,
  GET,
  OPTIONS,
  PATCH,
  POST,
  PUT
};
