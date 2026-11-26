import { randomUUID } from 'node:crypto';
import { AUDIO_STORE, DATA_STORE, getStorage } from './store';
import { parseImportPayload } from '../../shared/importer';
import { cleanTranscriptLocally } from '../../shared/transcriptAi';
import { buildSyndicationDrafts } from '../../shared/syndication';
import {
  AVATAR_COLORS,
  dispatchWebhook,
  json,
  listSpaceTestimonials,
  listSyndicationEvents,
  parseJsonBody,
  requireAuthSpace,
} from './routerHelpers';
import type {
  ReviewTone,
  SyndicationEvent,
  SyndicationTarget,
  Testimonial,
  TestimonialSource,
  TestimonialStatus,
} from '../../shared/types';

/** Handles studio testimonial CRUD, Senja/Testimonial.to import, and syndication routes. */
export async function handleTestimonialRoutes(
  req: Request,
  url: URL,
  path: string,
  method: string
): Promise<Response | null> {
  const spaceItemsMatch = path.match(/^\/api\/spaces\/([a-z0-9-]+)\/testimonials$/);
  if (spaceItemsMatch && method === 'GET') {
    const auth = await requireAuthSpace(req, spaceItemsMatch[1]);
    if ('errorResponse' in auth) return auth.errorResponse;
    const testimonials = await listSpaceTestimonials(auth.space.slug);
    const events = await listSyndicationEvents(auth.space.slug);
    return json({
      space: auth.space,
      testimonials: testimonials.map((t) => ({
        ...t,
        audioUrl: t.hasAudio ? `/api/audio/${t.id}` : null,
      })),
      events,
    });
  }

  const itemPatchMatch = path.match(/^\/api\/spaces\/([a-z0-9-]+)\/testimonials\/([a-zA-Z0-9_-]+)$/);
  if (itemPatchMatch && method === 'PATCH') {
    const [, slug, id] = itemPatchMatch;
    const auth = await requireAuthSpace(req, slug);
    if ('errorResponse' in auth) return auth.errorResponse;
    const store = getStorage();
    const key = `testimonials/${slug}/${id}`;
    const existing = await store.getJSON<Testimonial>(DATA_STORE, key);
    if (!existing) return json({ error: 'Testimonial not found' }, 404);

    const parsed = await parseJsonBody<
      Partial<{
        status: TestimonialStatus;
        featured: boolean;
        cleanedText: string;
        pullQuote: string;
        tone: ReviewTone;
        outcomeMetric: string | null;
        authorName: string;
        authorRole: string;
        authorCompany: string;
        rating: number;
      }>
    >(req);
    if (!parsed.ok) return parsed.errorResponse;
    const body = parsed.data;

    if (
      body.status !== undefined &&
      body.status !== 'approved' &&
      body.status !== 'pending' &&
      body.status !== 'archived'
    ) {
      return json({ error: 'Invalid review status.' }, 400);
    }

    const nextStatus = body.status ?? existing.status;
    const updated: Testimonial = {
      ...existing,
      status: nextStatus,
      featured: typeof body.featured === 'boolean' ? body.featured : existing.featured,
      cleanedText:
        typeof body.cleanedText === 'string' && body.cleanedText.trim()
          ? body.cleanedText.trim()
          : existing.cleanedText,
      pullQuote: typeof body.pullQuote === 'string' ? body.pullQuote.trim() : existing.pullQuote,
      tone:
        body.tone === 'authentic' || body.tone === 'crisp' || body.tone === 'results'
          ? body.tone
          : existing.tone,
      outcomeMetric:
        body.outcomeMetric !== undefined
          ? typeof body.outcomeMetric === 'string'
            ? body.outcomeMetric.trim() || null
            : null
          : existing.outcomeMetric,
      authorName:
        typeof body.authorName === 'string' && body.authorName.trim()
          ? body.authorName.trim()
          : existing.authorName,
      authorRole: typeof body.authorRole === 'string' ? body.authorRole.trim() : existing.authorRole,
      authorCompany:
        typeof body.authorCompany === 'string' ? body.authorCompany.trim() : existing.authorCompany,
      rating:
        typeof body.rating === 'number' && Number.isFinite(body.rating)
          ? Math.max(1, Math.min(5, Math.round(body.rating)))
          : existing.rating,
      approvedAt:
        nextStatus === 'approved' && !existing.approvedAt
          ? new Date().toISOString()
          : existing.approvedAt,
    };
    await store.setJSON(DATA_STORE, key, updated);
    return json({
      testimonial: { ...updated, audioUrl: updated.hasAudio ? `/api/audio/${updated.id}` : null },
    });
  }

  if (itemPatchMatch && method === 'DELETE') {
    const [, slug, id] = itemPatchMatch;
    const auth = await requireAuthSpace(req, slug);
    if ('errorResponse' in auth) return auth.errorResponse;
    const store = getStorage();
    await store.deleteKey(DATA_STORE, `testimonials/${slug}/${id}`);
    await store.deleteKey(AUDIO_STORE, `audio/${id}`);
    await store.deleteKey(AUDIO_STORE, `audio/${id}.wav`);
    return json({ ok: true });
  }

  const importMatch = path.match(/^\/api\/spaces\/([a-z0-9-]+)\/import$/);
  if (importMatch && method === 'POST') {
    const auth = await requireAuthSpace(req, importMatch[1]);
    if ('errorResponse' in auth) return auth.errorResponse;
    const parsedBody = await parseJsonBody<{
      rawInput?: string;
      preferredSource?: TestimonialSource;
    }>(req);
    if (!parsedBody.ok) return parsedBody.errorResponse;
    const body = parsedBody.data;
    const parsed = parseImportPayload(
      typeof body.rawInput === 'string' ? body.rawInput : '',
      body.preferredSource,
      auth.space.name
    );
    if (parsed.length === 0) {
      return json({ error: 'No recognizable testimonials found in input.' }, 400);
    }

    const store = getStorage();
    const created: Testimonial[] = [];
    const nowIso = new Date().toISOString();

    for (let i = 0; i < Math.min(parsed.length, 50); i++) {
      const row = parsed[i];
      const analysis = cleanTranscriptLocally(row.text, auth.space.name);
      const id = `t_imp_${randomUUID().slice(0, 8)}`;
      const record: Testimonial = {
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
        tone: 'authentic',
        outcomeMetric: analysis.outcomeMetric,
        source: row.source,
        durationSec: null,
        hasAudio: false,
        audioKey: null,
        status: 'approved',
        featured: false,
        syndicatedTargets: [],
        tags: analysis.tags,
        fillersRemovedCount: analysis.fillersRemovedCount,
        createdAt: nowIso,
        approvedAt: nowIso,
      };
      await store.setJSON(DATA_STORE, `testimonials/${auth.space.slug}/${id}`, record);
      created.push(record);
    }

    return json({ importedCount: created.length, testimonials: created }, 201);
  }

  const syndicateMatch = path.match(/^\/api\/spaces\/([a-z0-9-]+)\/syndicate$/);
  if (syndicateMatch && method === 'POST') {
    const auth = await requireAuthSpace(req, syndicateMatch[1]);
    if ('errorResponse' in auth) return auth.errorResponse;
    const parsedBody = await parseJsonBody<{
      testimonialId?: string;
      target?: SyndicationTarget;
    }>(req);
    if (!parsedBody.ok) return parsedBody.errorResponse;
    const body = parsedBody.data;
    const validTargets = new Set<SyndicationTarget>([
      'linkedin',
      'google_maps',
      'product_hunt',
      'x',
      'webhook',
    ]);
    if (
      typeof body.testimonialId !== 'string' ||
      !body.testimonialId.trim() ||
      !body.target ||
      !validTargets.has(body.target)
    ) {
      return json({ error: 'Valid testimonialId and target are required' }, 400);
    }

    const store = getStorage();
    const itemKey = `testimonials/${auth.space.slug}/${body.testimonialId}`;
    const testimonial = await store.getJSON<Testimonial>(DATA_STORE, itemKey);
    if (!testimonial) return json({ error: 'Testimonial not found' }, 404);

    const drafts = buildSyndicationDrafts(testimonial, auth.space, url.origin);
    let status: SyndicationEvent['status'] = 'intent_opened';
    let detail = '';

    if (body.target === 'webhook') {
      const res = await dispatchWebhook(auth.space, testimonial);
      status = res.ok ? 'sent' : 'failed';
      detail = res.detail;
    } else if (body.target === 'google_maps') {
      status = 'handoff_copied';
      detail = `Generated Google Maps review handoff for ${testimonial.authorName}`;
    } else if (body.target === 'product_hunt') {
      status = 'handoff_copied';
      detail = `Generated Product Hunt review handoff for ${testimonial.authorName}`;
    } else if (body.target === 'linkedin') {
      status = 'intent_opened';
      detail = `Prepared LinkedIn post & quote card for ${testimonial.authorName}`;
    } else {
      status = 'intent_opened';
      detail = `Prepared X post intent for ${testimonial.authorName}`;
    }

    if (status !== 'failed' && !testimonial.syndicatedTargets.includes(body.target)) {
      testimonial.syndicatedTargets.push(body.target);
      await store.setJSON(DATA_STORE, itemKey, testimonial);
    }

    const event: SyndicationEvent = {
      id: `syn_${randomUUID().slice(0, 8)}`,
      spaceSlug: auth.space.slug,
      testimonialId: testimonial.id,
      target: body.target,
      status,
      detail,
      createdAt: new Date().toISOString(),
    };
    await store.setJSON(DATA_STORE, `syndication-events/${auth.space.slug}/${event.id}`, event);

    return json({
      event,
      drafts,
      testimonial: {
        ...testimonial,
        audioUrl: testimonial.hasAudio ? `/api/audio/${testimonial.id}` : null,
      },
    });
  }

  return null;
}
