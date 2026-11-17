import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { DATA_STORE, getStorage, isTestBackendActive } from './store';
import type { UserProfile, Workspace } from '../../shared/types';

export interface StoredUserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  workspaceId: string;
  createdAt: string;
}

export interface StoredWorkspaceRecord extends Omit<Workspace, 'hasCustomAiKey'> {
  hasCustomAiKey?: boolean;
  customAiKey?: string | null;
}

interface SessionRecord {
  userId: string;
  workspaceId: string;
  email: string;
  name: string;
  isDemo: boolean;
  expiresAt: number;
}

export const SESSION_COOKIE_NAME = 'vv_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, keyHex] = stored.split(':');
  if (!salt || !keyHex) return false;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return timingSafeEqual(keyBuf, derivedBuf);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function parseCookieHeader(header: string | null): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    cookies[key] = val;
  }
  return cookies;
}

export function extractSessionToken(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    const t = auth.slice(7).trim();
    if (t) return t;
  }
  const cookies = parseCookieHeader(req.headers.get('cookie'));
  return cookies[SESSION_COOKIE_NAME] || null;
}

export function buildSessionCookieHeader(token: string, req: Request, clear = false): string {
  const isHttps =
    new URL(req.url).protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';
  const parts = [
    `${SESSION_COOKIE_NAME}=${clear ? '' : encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    clear ? 'Max-Age=0' : `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (isHttps) parts.push('Secure');
  return parts.join('; ');
}

const SESSION_SECRET =
  (typeof process !== 'undefined' && process.env?.SESSION_SECRET) ||
  'vouchvoice-session-signing-secret-2026';

function signSessionRecord(record: SessionRecord): string {
  const payload = Buffer.from(JSON.stringify(record), 'utf8').toString('base64url');
  const sig = createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySignedSessionToken(token: string): SessionRecord | null {
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionRecord;
  } catch {
    return null;
  }
}

export async function createSession(user: UserProfile): Promise<string> {
  const record: SessionRecord = {
    userId: user.id,
    workspaceId: user.workspaceId,
    email: user.email,
    name: user.name,
    isDemo: Boolean(user.isDemo),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  const token = signSessionRecord(record);
  await getStorage().setJSON(DATA_STORE, `sessions/${hashToken(token)}`, record);
  return token;
}

export async function getSessionUser(req: Request): Promise<UserProfile | null> {
  const token = extractSessionToken(req);
  if (!token) return null;
  const store = getStorage();
  const tokenHash = hashToken(token);
  const revoked = await store.getJSON<{ revoked: boolean }>(DATA_STORE, `revoked/${tokenHash}`);
  if (revoked) return null;

  const key = `sessions/${tokenHash}`;
  let session = await store.getJSON<SessionRecord>(DATA_STORE, key);
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
    isDemo: session.isDemo,
  };
}

export async function destroySession(req: Request): Promise<void> {
  const token = extractSessionToken(req);
  if (!token) return;
  const tokenHash = hashToken(token);
  await getStorage().deleteKey(DATA_STORE, `sessions/${tokenHash}`);
  await getStorage().setJSON(DATA_STORE, `revoked/${tokenHash}`, { revoked: true });
}

export function sanitizeWorkspace(ws: StoredWorkspaceRecord): Workspace {
  return {
    id: ws.id,
    name: ws.name,
    ownerUserId: ws.ownerUserId,
    plan: ws.plan,
    licenseKey: ws.licenseKey,
    hasCustomAiKey: Boolean(ws.customAiKey),
    aiProvider: ws.aiProvider,
    createdAt: ws.createdAt,
  };
}
