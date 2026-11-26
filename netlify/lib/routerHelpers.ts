import { DATA_STORE, getStorage } from './store';
import { getSessionUser, type StoredWorkspaceRecord } from './auth';
import type { SpaceConfig, SyndicationEvent, Testimonial } from '../../shared/types';

export const PUBLIC_CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const AVATAR_COLORS = [
  '#0d7480',
  '#0f766e',
  '#d97706',
  '#0e7490',
  '#0284c7',
  '#db2777',
  '#059669',
];

export function json(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

export async function parseJsonBody<T extends Record<string, unknown>>(
  req: Request,
  extraHeaders?: Record<string, string>
): Promise<{ ok: true; data: T } | { ok: false; errorResponse: Response }> {
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        ok: false,
        errorResponse: json({ error: 'Request body must be a JSON object.' }, 400, extraHeaders),
      };
    }
    return { ok: true, data: parsed as T };
  } catch {
    return {
      ok: false,
      errorResponse: json({ error: 'Invalid JSON request body.' }, 400, extraHeaders),
    };
  }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function isSafeWebhookUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.startsWith('fc') ||
      host.startsWith('fd') ||
      host.startsWith('fe80') ||
      host.startsWith('::ffff:') ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function decodeBase64Audio(raw: string): Uint8Array | null {
  const cleaned = raw.includes(',') ? raw.split(',')[1] ?? '' : raw;
  if (!cleaned) return null;
  const bytes = Buffer.from(cleaned, 'base64');
  if (bytes.byteLength === 0 || bytes.byteLength > 5 * 1024 * 1024) {
    return null;
  }
  return new Uint8Array(bytes);
}

export async function listWorkspaceSpaces(workspaceId: string): Promise<SpaceConfig[]> {
  const store = getStorage();
  const markerKeys = await store.listKeys(DATA_STORE, `workspace-spaces/${workspaceId}/`);
  const markers = await Promise.all(
    markerKeys.map((mk) => store.getJSON<{ slug: string }>(DATA_STORE, mk))
  );
  const slugs = markers.map((m) => m?.slug).filter((s): s is string => Boolean(s));
  const spaces = await Promise.all(
    slugs.map((slug) => store.getJSON<SpaceConfig>(DATA_STORE, `spaces/${slug}`))
  );
  return spaces
    .filter((sp): sp is SpaceConfig => Boolean(sp))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function listSpaceTestimonials(spaceSlug: string): Promise<Testimonial[]> {
  const store = getStorage();
  const keys = await store.listKeys(DATA_STORE, `testimonials/${spaceSlug}/`);
  const items = await Promise.all(
    keys.map((key) => store.getJSON<Testimonial>(DATA_STORE, key))
  );
  return items
    .filter((item): item is Testimonial => Boolean(item))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listSyndicationEvents(spaceSlug: string): Promise<SyndicationEvent[]> {
  const store = getStorage();
  const keys = await store.listKeys(DATA_STORE, `syndication-events/${spaceSlug}/`);
  const events = await Promise.all(
    keys.map((key) => store.getJSON<SyndicationEvent>(DATA_STORE, key))
  );
  return events
    .filter((ev): ev is SyndicationEvent => Boolean(ev))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function dispatchWebhook(
  space: SpaceConfig,
  testimonial: Testimonial
): Promise<{ ok: boolean; detail: string }> {
  if (!space.webhookUrl || !isSafeWebhookUrl(space.webhookUrl)) {
    return { ok: false, detail: 'No valid public webhook URL configured on this space.' };
  }
  try {
    const res = await fetch(space.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'VouchVoice-Syndicator/1.0' },
      body: JSON.stringify({
        event: 'testimonial.approved',
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
          approvedAt: testimonial.approvedAt,
        },
      }),
    });
    return {
      ok: res.ok,
      detail: res.ok
        ? `Webhook delivered (HTTP ${res.status})`
        : `Webhook returned HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? `Webhook error: ${err.message}` : 'Webhook delivery failed',
    };
  }
}

export async function requireAuthSpace(
  req: Request,
  slug: string
): Promise<
  | { user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>; workspace: StoredWorkspaceRecord; space: SpaceConfig }
  | { errorResponse: Response }
> {
  const user = await getSessionUser(req);
  if (!user) return { errorResponse: json({ error: 'Authentication required' }, 401) };
  const store = getStorage();
  const workspace = await store.getJSON<StoredWorkspaceRecord>(DATA_STORE, `workspaces/${user.workspaceId}`);
  const space = await store.getJSON<SpaceConfig>(DATA_STORE, `spaces/${slug}`);
  if (!workspace || !space) return { errorResponse: json({ error: 'Space not found' }, 404) };
  if (space.workspaceId !== user.workspaceId) {
    return { errorResponse: json({ error: 'Forbidden' }, 403) };
  }
  return { user, workspace, space };
}
