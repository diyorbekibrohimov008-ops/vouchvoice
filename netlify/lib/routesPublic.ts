import { randomUUID } from 'node:crypto';
import { AUDIO_STORE, DATA_STORE, getStorage } from './store';
import type { StoredWorkspaceRecord } from './auth';
import { polishTranscriptWithLLM, transcribeAudioWithOpenAI } from './ai';
import { cleanTranscriptLocally } from '../../shared/transcriptAi';
import { buildSyndicationDrafts } from '../../shared/syndication';
import { buildStandaloneLifetimeHtml } from '../../shared/embedTemplate';
import {
  AVATAR_COLORS,
  PUBLIC_CORS,
  decodeBase64Audio,
  dispatchWebhook,
  isSafeWebhookUrl,
  json,
  listSpaceTestimonials,
  parseJsonBody,
} from './routerHelpers';
import type {
  ReviewTone,
  SpaceConfig,
  SyndicationEvent,
  Testimonial,
  TestimonialSource,
} from '../../shared/types';

/** Handles public AI polish, wall fetch, testimonial submission, audio streaming, and HTML export. */
export async function handlePublicRoutes(
  req: Request,
  url: URL,
  path: string,
  method: string
): Promise<Response | null> {
  if (path === '/api/public/ai/polish' && method === 'POST') {
    const parsed = await parseJsonBody<{
      rawTranscript?: string;
      brandName?: string;
      spaceSlug?: string;
      audioBase64?: string;
      audioMimeType?: string;
    }>(req, PUBLIC_CORS);
    if (!parsed.ok) return parsed.errorResponse;
    const body = parsed.data;

    const store = getStorage();
    let brandName = typeof body.brandName === 'string' ? body.brandName.trim() : undefined;
    let customAiKey: string | null | undefined;
    let aiProvider: 'built_in' | 'openai' | 'gemini' = 'built_in';

    if (typeof body.spaceSlug === 'string' && body.spaceSlug.trim()) {
      const sp = await store.getJSON<SpaceConfig>(DATA_STORE, `spaces/${body.spaceSlug.trim()}`);
      if (sp) {
        brandName = brandName || sp.name;
        const ws = await store.getJSON<StoredWorkspaceRecord>(
          DATA_STORE,
          `workspaces/${sp.workspaceId}`
        );
        customAiKey = ws?.customAiKey;
        aiProvider = ws?.aiProvider ?? 'built_in';
      }
    }

    let transcriptText = typeof body.rawTranscript === 'string' ? body.rawTranscript.trim() : '';
    if (!transcriptText && typeof body.audioBase64 === 'string' && customAiKey) {
      const bytes = decodeBase64Audio(body.audioBase64);
      if (bytes) {
        const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        const whisperText = await transcribeAudioWithOpenAI(
          buf,
          typeof body.audioMimeType === 'string' && body.audioMimeType ? body.audioMimeType : 'audio/webm',
          customAiKey
        );
        if (whisperText) transcriptText = whisperText;
      }
    }

    const analysis = await polishTranscriptWithLLM({
      rawTranscript: transcriptText,
      brandName,
      customKey: customAiKey,
      preferredProvider: aiProvider,
    });
    return json(analysis, 200, PUBLIC_CORS);
  }

  const publicSpaceMatch = path.match(/^\/api\/public\/spaces\/([a-z0-9-]+)$/);
  if (publicSpaceMatch && method === 'GET') {
    const slug = publicSpaceMatch[1];
    const store = getStorage();
    const space = await store.getJSON<SpaceConfig>(DATA_STORE, `spaces/${slug}`);
    if (!space) return json({ error: 'Space not found' }, 404, PUBLIC_CORS);

    const all = await listSpaceTestimonials(slug);
    const approved = all.filter((t) => t.status === 'approved');
    const avgRating =
      approved.length > 0
        ? Number((approved.reduce((sum, t) => sum + t.rating, 0) / approved.length).toFixed(1))
        : 5.0;

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
          productHuntSlug: space.productHuntSlug,
        },
        testimonials: approved.map((t) => ({
          ...t,
          audioUrl: t.hasAudio ? `/api/audio/${t.id}` : null,
        })),
        stats: {
          totalApproved: approved.length,
          voiceCount: approved.filter((t) => t.source === 'voice' || t.hasAudio).length,
          averageRating: avgRating,
        },
      },
      200,
      PUBLIC_CORS
    );
  }

  const publicSubmitMatch = path.match(/^\/api\/public\/spaces\/([a-z0-9-]+)\/submit$/);
  if (publicSubmitMatch && method === 'POST') {
    const slug = publicSubmitMatch[1];
    const store = getStorage();
    const space = await store.getJSON<SpaceConfig>(DATA_STORE, `spaces/${slug}`);
    if (!space) return json({ error: 'Space not found' }, 404, PUBLIC_CORS);

    const parsed = await parseJsonBody<{
      authorName?: string;
      authorRole?: string;
      authorCompany?: string;
      rating?: number;
      rawTranscript?: string;
      cleanedText?: string;
      pullQuote?: string;
      tone?: ReviewTone;
      outcomeMetric?: string | null;
      tags?: string[];
      fillersRemovedCount?: number;
      source?: TestimonialSource;
      durationSec?: number | null;
      audioBase64?: string | null;
      audioMimeType?: string | null;
    }>(req, PUBLIC_CORS);
    if (!parsed.ok) return parsed.errorResponse;
    const body = parsed.data;

    const authorName = typeof body.authorName === 'string' ? body.authorName.trim() : '';
    const rawTranscript = typeof body.rawTranscript === 'string' ? body.rawTranscript.trim() : '';
    const cleanedText =
      (typeof body.cleanedText === 'string' ? body.cleanedText.trim() : '') ||
      cleanTranscriptLocally(rawTranscript, space.name).cleanedByTone.authentic;

    if (!authorName || !cleanedText) {
      return json({ error: 'Please provide your name and approved review text.' }, 400, PUBLIC_CORS);
    }

    const id = `t_${randomUUID().slice(0, 10)}`;
    let hasAudio = false;
    let audioKey: string | null = null;
    if (typeof body.audioBase64 === 'string' && body.audioBase64) {
      const bytes = decodeBase64Audio(body.audioBase64);
      if (bytes) {
        audioKey = `audio/${id}`;
        await store.setBinary(AUDIO_STORE, audioKey, bytes, {
          contentType: typeof body.audioMimeType === 'string' && body.audioMimeType ? body.audioMimeType : 'audio/webm',
          durationSec: typeof body.durationSec === 'number' && Number.isFinite(body.durationSec) ? body.durationSec : 20,
        });
        hasAudio = true;
      }
    }

    const fallbackAnalysis = cleanTranscriptLocally(cleanedText, space.name);
    const nowIso = new Date().toISOString();
    const rating = Math.max(1, Math.min(5, Math.round(Number(body.rating ?? 5) || 5)));
    const validTone: ReviewTone =
      body.tone === 'authentic' || body.tone === 'crisp' || body.tone === 'results'
        ? body.tone
        : 'authentic';

    const testimonial: Testimonial = {
      id,
      spaceSlug: slug,
      authorName,
      authorRole: (typeof body.authorRole === 'string' ? body.authorRole.trim() : '') || 'Customer',
      authorCompany: typeof body.authorCompany === 'string' ? body.authorCompany.trim() : '',
      authorAvatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      rating,
      rawTranscript: rawTranscript || cleanedText,
      cleanedText,
      pullQuote: (typeof body.pullQuote === 'string' ? body.pullQuote.trim() : '') || fallbackAnalysis.pullQuote,
      tone: validTone,
      outcomeMetric:
        body.outcomeMetric !== undefined
          ? typeof body.outcomeMetric === 'string'
            ? body.outcomeMetric.trim() || null
            : null
          : fallbackAnalysis.outcomeMetric,
      source: hasAudio ? 'voice' : 'text',
      durationSec:
        typeof body.durationSec === 'number' && Number.isFinite(body.durationSec)
          ? Math.max(1, Math.min(180, Math.round(body.durationSec)))
          : hasAudio
          ? 20
          : null,
      hasAudio,
      audioKey,
      status: 'approved',
      featured: false,
      syndicatedTargets: [],
      tags:
        Array.isArray(body.tags) && body.tags.every((t) => typeof t === 'string') && body.tags.length > 0
          ? body.tags.slice(0, 8)
          : fallbackAnalysis.tags,
      fillersRemovedCount:
        typeof body.fillersRemovedCount === 'number' && Number.isFinite(body.fillersRemovedCount)
          ? Math.max(0, Math.round(body.fillersRemovedCount))
          : 0,
      createdAt: nowIso,
      approvedAt: nowIso,
    };

    await store.setJSON(DATA_STORE, `testimonials/${slug}/${id}`, testimonial);

    if (space.webhookUrl && isSafeWebhookUrl(space.webhookUrl)) {
      const res = await dispatchWebhook(space, testimonial);
      const ev: SyndicationEvent = {
        id: `syn_${randomUUID().slice(0, 8)}`,
        spaceSlug: slug,
        testimonialId: id,
        target: 'webhook',
        status: res.ok ? 'sent' : 'failed',
        detail: res.detail,
        createdAt: new Date().toISOString(),
      };
      await store.setJSON(DATA_STORE, `syndication-events/${slug}/${ev.id}`, ev);
      if (res.ok) {
        testimonial.syndicatedTargets.push('webhook');
        await store.setJSON(DATA_STORE, `testimonials/${slug}/${id}`, testimonial);
      }
    }

    const drafts = buildSyndicationDrafts(testimonial, space, url.origin);
    return json(
      {
        testimonial: { ...testimonial, audioUrl: hasAudio ? `/api/audio/${id}` : null },
        handoff: {
          googleMapsUrl: space.googleMapsPlaceUrl ? drafts.googleMapsUrl : null,
          productHuntUrl: space.productHuntSlug ? drafts.productHuntUrl : null,
        },
      },
      201,
      PUBLIC_CORS
    );
  }

  const audioMatch = path.match(/^\/api\/audio\/([a-zA-Z0-9_-]+)$/);
  if (audioMatch && method === 'GET') {
    const id = audioMatch[1];
    const store = getStorage();
    let entry = await store.getBinary(AUDIO_STORE, `audio/${id}`);
    if (!entry) {
      entry = await store.getBinary(AUDIO_STORE, `audio/${id}.wav`);
    }
    if (!entry) return json({ error: 'Audio not found' }, 404, PUBLIC_CORS);
    const contentType = String(entry.metadata?.contentType || 'audio/wav');
    return new Response(entry.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(entry.data.byteLength),
        'Cache-Control': 'public, max-age=86400',
        ...PUBLIC_CORS,
      },
    });
  }

  const exportWallMatch = path.match(/^\/api\/public\/walls\/([a-z0-9-]+)\/export$/);
  if (exportWallMatch && method === 'GET') {
    const slug = exportWallMatch[1];
    const store = getStorage();
    const space = await store.getJSON<SpaceConfig>(DATA_STORE, `spaces/${slug}`);
    if (!space) return json({ error: 'Space not found' }, 404);
    const testimonials = await listSpaceTestimonials(slug);
    const html = buildStandaloneLifetimeHtml(space, testimonials, url.origin);
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${slug}-wall-of-love.html"`,
      },
    });
  }

  return null;
}
