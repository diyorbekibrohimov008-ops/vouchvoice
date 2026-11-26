import { randomBytes, randomUUID } from 'node:crypto';
import { DATA_STORE, getStorage } from './store';
import {
  buildSessionCookieHeader,
  createSession,
  destroySession,
  getSessionUser,
  hashPassword,
  sanitizeWorkspace,
  verifyPassword,
  type StoredUserRecord,
  type StoredWorkspaceRecord,
} from './auth';
import { DEMO_USER_ID } from './seed';
import { json, listWorkspaceSpaces, parseJsonBody, slugify } from './routerHelpers';
import type { SpaceConfig } from '../../shared/types';

const ALLOWED_AI_PROVIDERS = new Set(['built_in', 'openai', 'gemini']);

/** Handles account registration, login, logout, and workspace settings updates. */
export async function handleAuthAndWorkspaceRoutes(
  req: Request,
  path: string,
  method: string
): Promise<Response | null> {
  if (path === '/api/auth/register' && method === 'POST') {
    const parsed = await parseJsonBody<{
      name?: string;
      email?: string;
      password?: string;
      workspaceName?: string;
      firstBrandName?: string;
    }>(req);
    if (!parsed.ok) return parsed.errorResponse;
    const body = parsed.data;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!name || !email.includes('@') || password.length < 6) {
      return json({ error: 'Provide your name, valid email, and a password of at least 6 characters.' }, 400);
    }

    const store = getStorage();
    const existingUser = await store.getJSON<StoredUserRecord>(DATA_STORE, `users/${email}`);
    if (existingUser) {
      return json({ error: 'An account with this email already exists.' }, 409);
    }

    const userId = `usr_${randomUUID().slice(0, 12)}`;
    const workspaceId = `ws_${randomUUID().slice(0, 12)}`;
    const brandName = (
      typeof body.firstBrandName === 'string' && body.firstBrandName.trim()
        ? body.firstBrandName
        : `${name.split(' ')[0]}'s Product`
    ).trim();
    const baseSlug = slugify(brandName) || 'my-product';
    const existingSpace = await store.getJSON<SpaceConfig>(DATA_STORE, `spaces/${baseSlug}`);
    const slug = existingSpace ? `${baseSlug}-${randomBytes(2).toString('hex')}` : baseSlug;

    const userRecord: StoredUserRecord = {
      id: userId,
      email,
      name,
      passwordHash: hashPassword(password),
      workspaceId,
      createdAt: new Date().toISOString(),
    };

    const workspaceRecord: StoredWorkspaceRecord = {
      id: workspaceId,
      name: (
        typeof body.workspaceName === 'string' && body.workspaceName.trim()
          ? body.workspaceName
          : `${name.split(' ')[0]}'s Studio`
      ).trim(),
      ownerUserId: userId,
      plan: 'free',
      licenseKey: null,
      customAiKey: null,
      aiProvider: 'built_in',
      createdAt: new Date().toISOString(),
    };

    const space: SpaceConfig = {
      id: `spc_${randomUUID().slice(0, 10)}`,
      workspaceId,
      slug,
      name: brandName,
      tagline: `Share a quick 20-second voice note about ${brandName}.`,
      brandColor: '#2142e7',
      theme: 'paper',
      layout: 'masonry',
      cardRadius: 'soft',
      showRatings: true,
      showVoiceBadge: true,
      showMetrics: true,
      showCompany: true,
      hidePoweredBy: false,
      prompts: {
        step1: `What problem were you trying to solve before ${brandName}?`,
        step2: `What changed once you started using ${brandName}?`,
        step3: 'Who would you recommend it to?',
      },
      googleMapsPlaceUrl: '',
      productHuntSlug: '',
      linkedinHandle: '',
      webhookUrl: '',
      createdAt: new Date().toISOString(),
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
        spaces: [space],
      },
      201,
      { 'Set-Cookie': buildSessionCookieHeader(token, req) }
    );
  }

  if (path === '/api/auth/login' && method === 'POST') {
    const parsed = await parseJsonBody<{ email?: string; password?: string }>(req);
    if (!parsed.ok) return parsed.errorResponse;
    const body = parsed.data;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const store = getStorage();
    const userRecord = await store.getJSON<StoredUserRecord>(DATA_STORE, `users/${email}`);
    if (!userRecord || !verifyPassword(password, userRecord.passwordHash)) {
      return json({ error: 'Invalid email or password.' }, 401);
    }
    const profile = {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      workspaceId: userRecord.workspaceId,
      isDemo: userRecord.id === DEMO_USER_ID,
    };
    const token = await createSession(profile);
    const ws = await store.getJSON<StoredWorkspaceRecord>(
      DATA_STORE,
      `workspaces/${userRecord.workspaceId}`
    );
    const spaces = await listWorkspaceSpaces(userRecord.workspaceId);
    return json(
      {
        user: profile,
        workspace: ws ? sanitizeWorkspace(ws) : null,
        spaces,
      },
      200,
      { 'Set-Cookie': buildSessionCookieHeader(token, req) }
    );
  }

  if (path === '/api/auth/logout' && method === 'POST') {
    await destroySession(req);
    return json({ ok: true }, 200, { 'Set-Cookie': buildSessionCookieHeader('', req, true) });
  }

  if (path === '/api/workspace' && method === 'PATCH') {
    const user = await getSessionUser(req);
    if (!user) return json({ error: 'Authentication required' }, 401);
    const store = getStorage();
    const key = `workspaces/${user.workspaceId}`;
    const ws = await store.getJSON<StoredWorkspaceRecord>(DATA_STORE, key);
    if (!ws) return json({ error: 'Workspace not found' }, 404);

    const parsed = await parseJsonBody<{
      name?: string;
      aiProvider?: 'built_in' | 'openai' | 'gemini';
      customAiKey?: string | null;
    }>(req);
    if (!parsed.ok) return parsed.errorResponse;
    const body = parsed.data;

    if (body.aiProvider !== undefined && !ALLOWED_AI_PROVIDERS.has(body.aiProvider)) {
      return json({ error: 'Invalid AI provider.' }, 400);
    }

    const updated: StoredWorkspaceRecord = {
      ...ws,
      name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : ws.name,
      plan: 'free',
      licenseKey: null,
      aiProvider: body.aiProvider ?? ws.aiProvider,
      customAiKey:
        body.customAiKey !== undefined
          ? typeof body.customAiKey === 'string'
            ? body.customAiKey.trim() || null
            : null
          : ws.customAiKey,
    };
    await store.setJSON(DATA_STORE, key, updated);
    return json({ workspace: sanitizeWorkspace(updated) });
  }

  return null;
}
