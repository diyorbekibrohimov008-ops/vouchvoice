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

    const body = (await req.json()) as Partial<{
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
    }>;

    const nextStatus = body.status ?? existing.status;
    const updated: Testimonial = {
      ...existing,
      status: nextStatus,
      featured: body.featured ?? existing.featured,
      cleanedText: body.cleanedText?.trim() || existing.cleanedText,
      pullQuote: body.pullQuote !== undefined ? body.pullQuote.trim() : existing.pullQuote,
      tone: body.tone ?? existing.tone,
      outcomeMetric:
        body.outcomeMetric !== undefined ? body.outcomeMetric : existing.outcomeMetric,
      authorName: body.authorName?.trim() || existing.authorName,
      authorRole: body.authorRole !== undefined ? body.authorRole.trim() : existing.authorRole,
      authorCompany:
        body.authorCompany !== undefined ? body.authorCompany.trim() : existing.authorCompany,
      rating:
        body.rating !== undefined
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
    const body = (await req.json()) as {
      rawInput?: string;
      preferredSource?: TestimonialSource;
    };
    const parsed = parseImportPayload(
      body.rawInput ?? '',
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
    const body = (await req.json()) as {
      testimonialId?: string;
      target?: SyndicationTarget;
    };
    if (!body.testimonialId || !body.target) {
      return json({ error: 'testimonialId and target are required' }, 400);
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
