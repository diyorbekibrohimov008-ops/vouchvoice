import { randomBytes, randomUUID } from 'node:crypto';
import { DATA_STORE, getStorage } from './store';
import { getSessionUser } from './auth';
import { isSafeWebhookUrl, json, listWorkspaceSpaces, requireAuthSpace, slugify } from './routerHelpers';
import type { SpaceConfig } from '../../shared/types';

/** Handles workspace brand spaces list, create, and update routes. */
export async function handleSpaceRoutes(
  req: Request,
  path: string,
  method: string
): Promise<Response | null> {
  if (path === '/api/spaces' && method === 'GET') {
    const user = await getSessionUser(req);
    if (!user) return json({ error: 'Authentication required' }, 401);
    const spaces = await listWorkspaceSpaces(user.workspaceId);
    return json({ spaces });
  }

  if (path === '/api/spaces' && method === 'POST') {
    const user = await getSessionUser(req);
    if (!user) return json({ error: 'Authentication required' }, 401);
    const body = (await req.json()) as Partial<SpaceConfig>;
    const name = (body.name ?? '').trim();
    if (!name) return json({ error: 'Brand space name is required' }, 400);

    const store = getStorage();
    const desiredSlug = slugify(body.slug || name) || `brand-${randomBytes(2).toString('hex')}`;
    const taken = await store.getJSON<SpaceConfig>(DATA_STORE, `spaces/${desiredSlug}`);
    const slug = taken ? `${desiredSlug}-${randomBytes(2).toString('hex')}` : desiredSlug;

    const space: SpaceConfig = {
      id: `spc_${randomUUID().slice(0, 10)}`,
      workspaceId: user.workspaceId,
      slug,
      name,
      tagline: body.tagline?.trim() || `Tell us what you think about ${name} in 20 seconds.`,
      brandColor: body.brandColor || '#0d7480',
      theme: body.theme || 'paper',
      layout: body.layout || 'masonry',
      cardRadius: body.cardRadius || 'soft',
      showRatings: body.showRatings ?? true,
      showVoiceBadge: body.showVoiceBadge ?? true,
      showMetrics: body.showMetrics ?? true,
      showCompany: body.showCompany ?? true,
      hidePoweredBy: body.hidePoweredBy ?? false,
      prompts: body.prompts ?? {
        step1: `What was slowing you down before ${name}?`,
        step2: `What changed after switching to ${name}?`,
        step3: `Who would you recommend ${name} to?`,
      },
      googleMapsPlaceUrl: body.googleMapsPlaceUrl?.trim() || '',
      productHuntSlug: body.productHuntSlug?.trim() || '',
      linkedinHandle: body.linkedinHandle?.trim() || '',
      webhookUrl:
        body.webhookUrl && isSafeWebhookUrl(body.webhookUrl.trim())
          ? body.webhookUrl.trim()
          : '',
      createdAt: new Date().toISOString(),
    };

    await store.setJSON(DATA_STORE, `spaces/${slug}`, space);
    await store.setJSON(DATA_STORE, `workspace-spaces/${user.workspaceId}/${slug}`, { slug });
    return json({ space }, 201);
  }

  const spacePatchMatch = path.match(/^\/api\/spaces\/([a-z0-9-]+)$/);
  if (spacePatchMatch && method === 'PATCH') {
    const auth = await requireAuthSpace(req, spacePatchMatch[1]);
    if ('errorResponse' in auth) return auth.errorResponse;
    const body = (await req.json()) as Partial<SpaceConfig>;
    if (body.webhookUrl && body.webhookUrl.trim() && !isSafeWebhookUrl(body.webhookUrl.trim())) {
      return json({ error: 'Webhook URL must be a valid public http(s) endpoint.' }, 400);
    }

    const canHideBranding =
      auth.workspace.plan === 'lifetime_79' || auth.workspace.plan === 'maintenance_9';

    const updated: SpaceConfig = {
      ...auth.space,
      name: body.name?.trim() || auth.space.name,
      tagline: body.tagline !== undefined ? body.tagline.trim() : auth.space.tagline,
      brandColor: body.brandColor || auth.space.brandColor,
      theme: body.theme || auth.space.theme,
      layout: body.layout || auth.space.layout,
      cardRadius: body.cardRadius || auth.space.cardRadius,
      showRatings: body.showRatings ?? auth.space.showRatings,
      showVoiceBadge: body.showVoiceBadge ?? auth.space.showVoiceBadge,
      showMetrics: body.showMetrics ?? auth.space.showMetrics,
      showCompany: body.showCompany ?? auth.space.showCompany,
      hidePoweredBy: canHideBranding ? body.hidePoweredBy ?? auth.space.hidePoweredBy : false,
      prompts: body.prompts ?? auth.space.prompts,
      googleMapsPlaceUrl:
        body.googleMapsPlaceUrl !== undefined
          ? body.googleMapsPlaceUrl.trim()
          : auth.space.googleMapsPlaceUrl,
      productHuntSlug:
        body.productHuntSlug !== undefined
          ? body.productHuntSlug.trim()
          : auth.space.productHuntSlug,
      linkedinHandle:
        body.linkedinHandle !== undefined
          ? body.linkedinHandle.trim()
          : auth.space.linkedinHandle,
      webhookUrl:
        body.webhookUrl !== undefined ? body.webhookUrl.trim() : auth.space.webhookUrl,
    };
    await getStorage().setJSON(DATA_STORE, `spaces/${auth.space.slug}`, updated);
    return json({ space: updated });
  }

  return null;
}
