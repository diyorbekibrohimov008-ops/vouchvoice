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
import { json, listWorkspaceSpaces, slugify } from './routerHelpers';
import type { PlanTier, SpaceConfig } from '../../shared/types';

/** Handles account registration, login, logout, and workspace settings updates. */
export async function handleAuthAndWorkspaceRoutes(
  req: Request,
  path: string,
  method: string
): Promise<Response | null> {
  if (path === '/api/auth/register' && method === 'POST') {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      password?: string;
      workspaceName?: string;
      firstBrandName?: string;
    };
    const name = (body.name ?? '').trim();
    const email = (body.email ?? '').trim().toLowerCase();
    const password = body.password ?? '';
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
    const brandName = (body.firstBrandName ?? `${name.split(' ')[0]}'s Product`).trim();
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
      name: (body.workspaceName ?? `${name.split(' ')[0]}'s Studio`).trim(),
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
      brandColor: '#4f46e5',
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
    const body = (await req.json()) as { email?: string; password?: string };
    const email = (body.email ?? '').trim().toLowerCase();
    const password = body.password ?? '';
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

    const body = (await req.json()) as {
      name?: string;
      plan?: PlanTier;
      aiProvider?: 'built_in' | 'openai' | 'gemini';
      customAiKey?: string | null;
    };

    const nextPlan: PlanTier =
      body.plan && ['free', 'maintenance_9', 'lifetime_79'].includes(body.plan)
        ? body.plan
        : ws.plan;

    const updated: StoredWorkspaceRecord = {
      ...ws,
      name: body.name?.trim() || ws.name,
      plan: nextPlan,
      licenseKey:
        nextPlan === 'lifetime_79'
          ? ws.licenseKey || `VV-LIFE-${randomBytes(2).toString('hex').toUpperCase()}-2026`
          : nextPlan === 'maintenance_9'
          ? ws.licenseKey || `VV-MAINT-${randomBytes(2).toString('hex').toUpperCase()}`
          : null,
      aiProvider: body.aiProvider ?? ws.aiProvider,
      customAiKey: body.customAiKey !== undefined ? body.customAiKey?.trim() || null : ws.customAiKey,
    };
    await store.setJSON(DATA_STORE, key, updated);
    return json({ workspace: sanitizeWorkspace(updated) });
  }

  return null;
}
