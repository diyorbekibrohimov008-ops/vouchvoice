import { describe, expect, it } from 'vitest';
import embedFn from '../netlify/functions/embed.mts';
import { buildStandaloneLifetimeHtml } from '../shared/embedTemplate';
import type { SpaceConfig, Testimonial } from '../shared/types';

const sampleSpace: SpaceConfig = {
  id: 'spc_1',
  workspaceId: 'ws_1',
  slug: 'acme-ai',
  name: 'PulseDeck <script>alert(1)</script>',
  tagline: 'Fast feedback',
  brandColor: '#4f46e5',
  theme: 'paper',
  layout: 'masonry',
  cardRadius: 'soft',
  showRatings: true,
  showVoiceBadge: true,
  showMetrics: true,
  showCompany: true,
  hidePoweredBy: false,
  prompts: { step1: 'Q1', step2: 'Q2', step3: 'Q3' },
  googleMapsPlaceUrl: '',
  productHuntSlug: '',
  linkedinHandle: '',
  webhookUrl: '',
  createdAt: '2026-11-11T00:00:00Z',
};

const sampleTestimonial: Testimonial = {
  id: 't_1',
  spaceSlug: 'acme-ai',
  authorName: 'Jane <img src=x onerror=alert(1)>',
  authorRole: 'Founder',
  authorCompany: 'Acme',
  authorAvatarColor: '#4f46e5',
  rating: 5,
  rawTranscript: 'raw',
  cleanedText: 'Saved us 4 hours every week.',
  pullQuote: 'Saved us 4 hours',
  tone: 'results',
  outcomeMetric: '4 hours',
  source: 'voice',
  durationSec: 18,
  hasAudio: true,
  audioKey: 'audio/t_1',
  status: 'approved',
  featured: true,
  syndicatedTargets: [],
  tags: ['Speed'],
  fillersRemovedCount: 2,
  createdAt: '2026-11-11T00:00:00Z',
  approvedAt: '2026-11-11T00:00:00Z',
};

describe('Embed widget & standalone HTML export', () => {
  it('serves /embed.js with CORS and Shadow DOM widget loader', async () => {
    const res = await embedFn(new Request('https://vouchvoice-app.netlify.app/embed.js'));
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('content-type')).toContain('javascript');
    const js = await res.text();
    expect(js).toContain('attachShadow');
    expect(js).toContain('data-vouch-wall');
  });

  it('escapes HTML safely in standalone HTML export', () => {
    const html = buildStandaloneLifetimeHtml(
      sampleSpace,
      [sampleTestimonial],
      'https://vouchvoice-app.netlify.app'
    );
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Saved us 4 hours every week.');
  });
});
