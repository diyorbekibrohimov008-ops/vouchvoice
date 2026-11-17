import { AUDIO_STORE, DATA_STORE, getStorage, type StoreBackend } from './store';
import { hashPassword, type StoredUserRecord, type StoredWorkspaceRecord } from './auth';
import { cleanTranscriptLocally } from '../../shared/transcriptAi';
import { synthesizeDemoWav } from '../../shared/demoAudio';
import type { SpaceConfig, SyndicationEvent, Testimonial } from '../../shared/types';

export const DEMO_WORKSPACE_ID = 'ws_demo_vouchvoice';
export const DEMO_USER_ID = 'usr_demo_founder';
export const DEMO_USER_EMAIL = 'demo@vouchvoice.app';

const seededBackends = new WeakSet<StoreBackend>();

export async function seedDemoWorkspace(forceReset = false): Promise<void> {
  const store = getStorage();
  if (!forceReset && seededBackends.has(store)) return;

  const wsKey = `workspaces/${DEMO_WORKSPACE_ID}`;

  if (!forceReset) {
    const existing = await store.getJSON<StoredWorkspaceRecord>(DATA_STORE, wsKey);
    if (existing) {
      seededBackends.add(store);
      return;
    }
  }

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400_000).toISOString();

  const demoUser: StoredUserRecord = {
    id: DEMO_USER_ID,
    email: DEMO_USER_EMAIL,
    name: 'Maya Chen (Demo Founder)',
    passwordHash: hashPassword('vouchvoice-demo-2026'),
    workspaceId: DEMO_WORKSPACE_ID,
    createdAt: daysAgo(18),
  };

  const demoWorkspace: StoredWorkspaceRecord = {
    id: DEMO_WORKSPACE_ID,
    name: 'Maya Studio (2 Brands)',
    ownerUserId: DEMO_USER_ID,
    plan: 'lifetime_79',
    licenseKey: 'VV-LIFE-84A9-2026',
    customAiKey: null,
    aiProvider: 'built_in',
    createdAt: daysAgo(18),
  };

  await store.setJSON(DATA_STORE, `users/${DEMO_USER_EMAIL}`, demoUser);
  await store.setJSON(DATA_STORE, wsKey, demoWorkspace);

  const spaces: SpaceConfig[] = [
    {
      id: 'spc_acme_ai',
      workspaceId: DEMO_WORKSPACE_ID,
      slug: 'acme-ai',
      name: 'PulseDeck AI',
      tagline: 'Turn messy customer calls into crisp product roadmaps in 30 seconds.',
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
        step1: 'What was taking you the longest before PulseDeck AI?',
        step2: 'What changed once you started using it?',
        step3: 'Who would you tell to try it?',
      },
      googleMapsPlaceUrl: 'https://www.google.com/maps/search/?api=1&query=PulseDeck+AI',
      productHuntSlug: 'pulsedeck-ai',
      linkedinHandle: 'pulsedeck-ai',
      webhookUrl: '',
      createdAt: daysAgo(16),
    },
    {
      id: 'spc_pixelcraft',
      workspaceId: DEMO_WORKSPACE_ID,
      slug: 'pixelcraft-kit',
      name: 'PixelCraft UI Kit',
      tagline: 'Production-ready Framer & React blocks for indie SaaS launches.',
      brandColor: '#0f766e',
      theme: 'cream',
      layout: 'grid',
      cardRadius: 'soft',
      showRatings: true,
      showVoiceBadge: true,
      showMetrics: true,
      showCompany: true,
      hidePoweredBy: true,
      prompts: {
        step1: 'How long did landing pages take before PixelCraft?',
        step2: 'What made this kit worth it?',
        step3: 'Would you recommend it to another indie maker?',
      },
      googleMapsPlaceUrl: 'https://www.google.com/maps/search/?api=1&query=PixelCraft+UI',
      productHuntSlug: 'pixelcraft-ui-kit',
      linkedinHandle: 'pixelcraft-ui',
      webhookUrl: '',
      createdAt: daysAgo(12),
    },
  ];

  for (const sp of spaces) {
    await store.setJSON(DATA_STORE, `spaces/${sp.slug}`, sp);
    await store.setJSON(DATA_STORE, `workspace-spaces/${DEMO_WORKSPACE_ID}/${sp.slug}`, { slug: sp.slug });
  }

  const rawItems: Array<{
    id: string;
    spaceSlug: string;
    authorName: string;
    authorRole: string;
    authorCompany: string;
    color: string;
    rating: number;
    rawTranscript: string;
    source: Testimonial['source'];
    durationSec: number | null;
    hasAudio: boolean;
    status: Testimonial['status'];
    featured: boolean;
    syndicatedTargets: Testimonial['syndicatedTargets'];
    daysAgo: number;
  }> = [
    {
      id: 't_voice_1',
      spaceSlug: 'acme-ai',
      authorName: 'Daniel Park',
      authorRole: 'Founder',
      authorCompany: 'LedgerLoop',
      color: '#4f46e5',
      rating: 5,
      rawTranscript:
        'Um, so before PulseDeck AI, I was like spending literally 4 hours every Friday reading Zoom notes, you know? Honestly, once we switched, our team cut synthesis down to 12 minutes and shipped 3x more customer fixes.',
      source: 'voice',
      durationSec: 19,
      hasAudio: true,
      status: 'approved',
      featured: true,
      syndicatedTargets: ['linkedin', 'google_maps'],
      daysAgo: 9,
    },
    {
      id: 't_voice_2',
      spaceSlug: 'acme-ai',
      authorName: 'Priya Nair',
      authorRole: 'Head of Product',
      authorCompany: 'ShipFast Ops',
      color: '#059669',
      rating: 5,
      rawTranscript:
        'I actually hate recording webcam videos, um, so when you sent a 20-second voice link I just spoke from my phone while walking. It cleaned up my rambling into a crisp quote and boosted our trial conversion by 34%.',
      source: 'voice',
      durationSec: 17,
      hasAudio: true,
      status: 'approved',
      featured: true,
      syndicatedTargets: ['product_hunt'],
      daysAgo: 6,
    },
    {
      id: 't_voice_3',
      spaceSlug: 'acme-ai',
      authorName: 'Tomás Rivera',
      authorRole: 'Indie Maker',
      authorCompany: 'FormNest',
      color: '#d97706',
      rating: 5,
      rawTranscript:
        'Basically we moved all our testimonials over from Testimonial.to because paying $50 a month just to show existing reviews felt crazy. Saved $480 a year and got double the reply rate using voice notes.',
      source: 'voice',
      durationSec: 21,
      hasAudio: true,
      status: 'approved',
      featured: false,
      syndicatedTargets: ['x'],
      daysAgo: 4,
    },
    {
      id: 't_import_1',
      spaceSlug: 'acme-ai',
      authorName: 'Hannah Brooks',
      authorRole: 'Growth Lead',
      authorCompany: 'KiteCRM',
      color: '#7c3aed',
      rating: 5,
      rawTranscript:
        'PulseDeck turned 40 messy onboarding interviews into an actionable priority board before lunch. Every early-stage PM needs this.',
      source: 'senja_import',
      durationSec: null,
      hasAudio: false,
      status: 'approved',
      featured: false,
      syndicatedTargets: ['linkedin'],
      daysAgo: 11,
    },
    {
      id: 't_import_2',
      spaceSlug: 'acme-ai',
      authorName: 'Marcus Vance',
      authorRole: 'CTO',
      authorCompany: 'GridMetrics',
      color: '#0284c7',
      rating: 5,
      rawTranscript:
        'Cleanest workflow we have adopted this year. Setup took under 5 minutes and our support team loves it.',
      source: 'google_import',
      durationSec: null,
      hasAudio: false,
      status: 'approved',
      featured: false,
      syndicatedTargets: ['google_maps'],
      daysAgo: 7,
    },
    {
      id: 't_pending_1',
      spaceSlug: 'acme-ai',
      authorName: 'Elena Rostova',
      authorRole: 'Solo Consultant',
      authorCompany: 'BrightOps',
      color: '#db2777',
      rating: 5,
      rawTranscript:
        'Uh, yeah, so I was kind of nervous about leaving a review on camera, you know, but the 20-second voice prompt took me literally 15 seconds and made me sound way sharper.',
      source: 'voice',
      durationSec: 15,
      hasAudio: true,
      status: 'pending',
      featured: false,
      syndicatedTargets: [],
      daysAgo: 1,
    },
    {
      id: 't_pixel_1',
      spaceSlug: 'pixelcraft-kit',
      authorName: 'Samir Patel',
      authorRole: 'Design Engineer',
      authorCompany: 'LaunchPad Studio',
      color: '#0f766e',
      rating: 5,
      rawTranscript:
        'Um, I built our entire SaaS marketing page in under 2 hours with PixelCraft instead of hiring an agency for $3,000. Worth every single penny.',
      source: 'voice',
      durationSec: 16,
      hasAudio: true,
      status: 'approved',
      featured: true,
      syndicatedTargets: ['linkedin', 'product_hunt'],
      daysAgo: 5,
    },
    {
      id: 't_pixel_2',
      spaceSlug: 'pixelcraft-kit',
      authorName: 'Claire Dubois',
      authorRole: 'Founder',
      authorCompany: 'MailSpark',
      color: '#2563eb',
      rating: 5,
      rawTranscript:
        'Having both of my brands inside one VouchVoice workspace without paying per-space fees is a breath of fresh air. PixelCraft components feel handcrafted.',
      source: 'testimonial_to_import',
      durationSec: null,
      hasAudio: false,
      status: 'approved',
      featured: false,
      syndicatedTargets: [],
      daysAgo: 3,
    },
  ];

  const writes: Array<Promise<unknown>> = [];
  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    const spaceName = item.spaceSlug === 'acme-ai' ? 'PulseDeck AI' : 'PixelCraft UI Kit';
    const analysis = cleanTranscriptLocally(item.rawTranscript, spaceName);
    let audioKey: string | null = null;
    if (item.hasAudio) {
      audioKey = `audio/${item.id}.wav`;
      const wav = synthesizeDemoWav(i + 1, 1.8);
      writes.push(
        store.setBinary(AUDIO_STORE, audioKey, wav, {
          contentType: 'audio/wav',
          durationSec: item.durationSec ?? 18,
        })
      );
    }

    const record: Testimonial = {
      id: item.id,
      spaceSlug: item.spaceSlug,
      authorName: item.authorName,
      authorRole: item.authorRole,
      authorCompany: item.authorCompany,
      authorAvatarColor: item.color,
      rating: item.rating,
      rawTranscript: item.rawTranscript,
      cleanedText: analysis.cleanedByTone[analysis.recommendedTone],
      pullQuote: analysis.pullQuote,
      tone: analysis.recommendedTone,
      outcomeMetric: analysis.outcomeMetric,
      source: item.source,
      durationSec: item.durationSec,
      hasAudio: item.hasAudio,
      audioKey,
      status: item.status,
      featured: item.featured,
      syndicatedTargets: item.syndicatedTargets,
      tags: analysis.tags,
      fillersRemovedCount: analysis.fillersRemovedCount,
      createdAt: daysAgo(item.daysAgo),
      approvedAt: item.status === 'approved' ? daysAgo(item.daysAgo) : null,
    };

    writes.push(store.setJSON(DATA_STORE, `testimonials/${item.spaceSlug}/${item.id}`, record));
  }

  const seedEvents: SyndicationEvent[] = [
    {
      id: 'syn_1',
      spaceSlug: 'acme-ai',
      testimonialId: 't_voice_1',
      target: 'linkedin',
      status: 'intent_opened',
      detail: 'Formatted LinkedIn founder proof post + SVG quote card for Daniel Park',
      createdAt: daysAgo(8),
    },
    {
      id: 'syn_2',
      spaceSlug: 'acme-ai',
      testimonialId: 't_voice_2',
      target: 'product_hunt',
      status: 'handoff_copied',
      detail: 'Customer 1-tap copied review & opened Product Hunt reviews tab',
      createdAt: daysAgo(6),
    },
  ];

  for (const ev of seedEvents) {
    writes.push(store.setJSON(DATA_STORE, `syndication-events/${ev.spaceSlug}/${ev.id}`, ev));
  }

  await Promise.all(writes);
  seededBackends.add(store);
}
