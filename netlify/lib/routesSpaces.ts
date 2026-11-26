import { randomBytes, randomUUID } from 'node:crypto';
import { DATA_STORE, getStorage } from './store';
import { getSessionUser } from './auth';
import { isSafeWebhookUrl, json, listWorkspaceSpaces, parseJsonBody, requireAuthSpace, slugify } from './routerHelpers';
import type { SpaceConfig, WallLayout, WallTheme } from '../../shared/types';

const ALLOWED_THEMES = new Set<WallTheme>(['paper', 'midnight', 'cream', 'indigo']);
const ALLOWED_LAYOUTS = new Set<WallLayout>(['masonry', 'grid', 'marquee', 'spotlight', 'badge']);
const ALLOWED_RADII = new Set<SpaceConfig['cardRadius']>(['sharp', 'soft', 'pill']);

function sanitizeHexColor(input: string | undefined, fallback: string): string {
  const trimmed = (input ?? '').trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(trimmed) ? trimmed : fallback;
}

function sanitizePrompts(
  input: unknown,
  fallback: SpaceConfig['prompts']
): SpaceConfig['prompts'] {
  if (!input || typeof input !== 'object') return fallback;
  const p = input as Record<string, unknown>;
  return {
    step1: typeof p.step1 === 'string' && p.step1.trim() ? p.step1.trim() : fallback.step1,
    step2: typeof p.step2 === 'string' && p.step2.trim() ? p.step2.trim() : fallback.step2,
    step3: typeof p.step3 === 'string' && p.step3.trim() ? p.step3.trim() : fallback.step3,
  };
}

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
    const parsed = await parseJsonBody<Partial<SpaceConfig>>(req);
    if (!parsed.ok) return parsed.errorResponse;
    const body = parsed.data;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return json({ error: 'Brand space name is required' }, 400);

    const store = getStorage();
    const desiredSlug =
      slugify(typeof body.slug === 'string' && body.slug.trim() ? body.slug : name) ||
      `brand-${randomBytes(2).toString('hex')}`;
    const taken = await store.getJSON<SpaceConfig>(DATA_STORE, `spaces/${desiredSlug}`);
    const slug = taken ? `${desiredSlug}-${randomBytes(2).toString('hex')}` : desiredSlug;

    const defaultPrompts = {
      step1: `What was slowing you down before ${name}?`,
      step2: `What changed after switching to ${name}?`,
      step3: `Who would you recommend ${name} to?`,
    };

    const space: SpaceConfig = {
      id: `spc_${randomUUID().slice(0, 10)}`,
      workspaceId: user.workspaceId,
      slug,
      name,
      tagline:
        typeof body.tagline === 'string' && body.tagline.trim()
          ? body.tagline.trim()
          : `Tell us what you think about ${name} in 20 seconds.`,
      brandColor: sanitizeHexColor(body.brandColor, '#2142e7'),
      theme: body.theme && ALLOWED_THEMES.has(body.theme) ? body.theme : 'paper',
      layout: body.layout && ALLOWED_LAYOUTS.has(body.layout) ? body.layout : 'masonry',
      cardRadius: body.cardRadius && ALLOWED_RADII.has(body.cardRadius) ? body.cardRadius : 'soft',
      showRatings: typeof body.showRatings === 'boolean' ? body.showRatings : true,
      showVoiceBadge: typeof body.showVoiceBadge === 'boolean' ? body.showVoiceBadge : true,
      showMetrics: typeof body.showMetrics === 'boolean' ? body.showMetrics : true,
      showCompany: typeof body.showCompany === 'boolean' ? body.showCompany : true,
      hidePoweredBy: typeof body.hidePoweredBy === 'boolean' ? body.hidePoweredBy : false,
      prompts: sanitizePrompts(body.prompts, defaultPrompts),
      googleMapsPlaceUrl: typeof body.googleMapsPlaceUrl === 'string' ? body.googleMapsPlaceUrl.trim() : '',
      productHuntSlug: typeof body.productHuntSlug === 'string' ? body.productHuntSlug.trim() : '',
      linkedinHandle: typeof body.linkedinHandle === 'string' ? body.linkedinHandle.trim() : '',
      webhookUrl:
        typeof body.webhookUrl === 'string' && isSafeWebhookUrl(body.webhookUrl.trim())
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
    const parsed = await parseJsonBody<Partial<SpaceConfig>>(req);
    if (!parsed.ok) return parsed.errorResponse;
    const body = parsed.data;
    if (
      typeof body.webhookUrl === 'string' &&
      body.webhookUrl.trim() &&
      !isSafeWebhookUrl(body.webhookUrl.trim())
    ) {
      return json({ error: 'Webhook URL must be a valid public https:// endpoint.' }, 400);
    }

    const updated: SpaceConfig = {
      ...auth.space,
      name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : auth.space.name,
      tagline: typeof body.tagline === 'string' ? body.tagline.trim() : auth.space.tagline,
      brandColor: sanitizeHexColor(body.brandColor, auth.space.brandColor),
      theme: body.theme && ALLOWED_THEMES.has(body.theme) ? body.theme : auth.space.theme,
      layout: body.layout && ALLOWED_LAYOUTS.has(body.layout) ? body.layout : auth.space.layout,
      cardRadius:
        body.cardRadius && ALLOWED_RADII.has(body.cardRadius)
          ? body.cardRadius
          : auth.space.cardRadius,
      showRatings: typeof body.showRatings === 'boolean' ? body.showRatings : auth.space.showRatings,
      showVoiceBadge:
        typeof body.showVoiceBadge === 'boolean' ? body.showVoiceBadge : auth.space.showVoiceBadge,
      showMetrics: typeof body.showMetrics === 'boolean' ? body.showMetrics : auth.space.showMetrics,
      showCompany: typeof body.showCompany === 'boolean' ? body.showCompany : auth.space.showCompany,
      hidePoweredBy:
        typeof body.hidePoweredBy === 'boolean' ? body.hidePoweredBy : auth.space.hidePoweredBy,
      prompts: body.prompts !== undefined ? sanitizePrompts(body.prompts, auth.space.prompts) : auth.space.prompts,
      googleMapsPlaceUrl:
        typeof body.googleMapsPlaceUrl === 'string'
          ? body.googleMapsPlaceUrl.trim()
          : auth.space.googleMapsPlaceUrl,
      productHuntSlug:
        typeof body.productHuntSlug === 'string'
          ? body.productHuntSlug.trim()
          : auth.space.productHuntSlug,
      linkedinHandle:
        typeof body.linkedinHandle === 'string'
          ? body.linkedinHandle.trim()
          : auth.space.linkedinHandle,
      webhookUrl:
        typeof body.webhookUrl === 'string' ? body.webhookUrl.trim() : auth.space.webhookUrl,
    };
    await getStorage().setJSON(DATA_STORE, `spaces/${auth.space.slug}`, updated);
    return json({ space: updated });
  }

  return null;
}
