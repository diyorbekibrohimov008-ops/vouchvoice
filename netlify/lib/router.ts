import { DATA_STORE, getStorage } from './store';
import { buildSessionCookieHeader, createSession, getSessionUser, sanitizeWorkspace, type StoredWorkspaceRecord } from './auth';
import { DEMO_USER_EMAIL, DEMO_USER_ID, DEMO_WORKSPACE_ID, seedDemoWorkspace } from './seed';
import { handleEmbedRequest } from './embedHandler';
import { json, listWorkspaceSpaces, PUBLIC_CORS } from './routerHelpers';
import { handleAuthAndWorkspaceRoutes } from './routesAuth';
import { handleSpaceRoutes } from './routesSpaces';
import { handlePublicRoutes } from './routesPublic';
import { handleTestimonialRoutes } from './routesTestimonials';

export async function handleApiRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const rewrittenPath = url.searchParams.get('__path');
  if (rewrittenPath && url.pathname.startsWith('/api/handler')) {
    url.pathname = rewrittenPath.startsWith('/') ? rewrittenPath : `/${rewrittenPath}`;
    url.searchParams.delete('__path');
  }
  const path = url.pathname;
  const method = req.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: PUBLIC_CORS });
  }

  try {
    if (path === '/embed.js' || path === '/api/embed') {
      return handleEmbedRequest(req);
    }

    if (path === '/api/health' && method === 'GET') {
      return json({ ok: true, service: 'vouchvoice', timestamp: new Date().toISOString() }, 200, PUBLIC_CORS);
    }

    // Ensure demo workspace exists for demo flows
    await seedDemoWorkspace(false);

    // ─── AUTH & WORKSPACE ───────────────────────────────────────────────────
    if (path === '/api/auth/me' && method === 'GET') {
      const user = await getSessionUser(req);
      if (!user) return json({ user: null, workspace: null, spaces: [] });
      const ws = await getStorage().getJSON<StoredWorkspaceRecord>(
        DATA_STORE,
        `workspaces/${user.workspaceId}`
      );
      if (!ws) return json({ user: null, workspace: null, spaces: [] });
      const spaces = await listWorkspaceSpaces(ws.id);
      return json({ user, workspace: sanitizeWorkspace(ws), spaces });
    }

    if (path === '/api/auth/demo' && method === 'POST') {
      await seedDemoWorkspace(false);
      const demoUser = {
        id: DEMO_USER_ID,
        email: DEMO_USER_EMAIL,
        name: 'Maya Chen (Demo Founder)',
        workspaceId: DEMO_WORKSPACE_ID,
        isDemo: true,
      };
      const token = await createSession(demoUser);
      const ws = await getStorage().getJSON<StoredWorkspaceRecord>(
        DATA_STORE,
        `workspaces/${DEMO_WORKSPACE_ID}`
      );
      const spaces = await listWorkspaceSpaces(DEMO_WORKSPACE_ID);
      return json(
        {
          user: demoUser,
          workspace: ws ? sanitizeWorkspace(ws) : null,
          spaces,
        },
        200,
        { 'Set-Cookie': buildSessionCookieHeader(token, req) }
      );
    }

    if (path === '/api/demo/reset' && method === 'POST') {
      const user = await getSessionUser(req);
      if (!user || user.workspaceId !== DEMO_WORKSPACE_ID) {
        return json({ error: 'Only available inside the Demo workspace' }, 403);
      }
      await seedDemoWorkspace(true);
      const ws = await getStorage().getJSON<StoredWorkspaceRecord>(
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

    return json({ error: 'Not found' }, 404);
  } catch (err) {
    console.error('VouchVoice API error:', err);
    return json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      500,
      PUBLIC_CORS
    );
  }
}
