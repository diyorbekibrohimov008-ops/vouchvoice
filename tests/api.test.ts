import { beforeEach, describe, expect, it } from 'vitest';
import { handleApiRequest } from '../netlify/lib/router';
import { createMemoryBackend, setStoreBackendForTests } from '../netlify/lib/store';
import { synthesizeDemoWav } from '../shared/demoAudio';

function makeReq(path: string, init?: RequestInit): Request {
  return new Request(`https://vouchvoice-app.netlify.app${path}`, init);
}

function cookieHeader(res: Response): string {
  const raw = res.headers.get('set-cookie') || '';
  return raw.split(';')[0] || '';
}

describe('VouchVoice API integration', () => {
  beforeEach(() => {
    setStoreBackendForTests(createMemoryBackend());
  });

  it('signs into demo workspace, lists 2 brand spaces, and resets cleanly', async () => {
    const demoRes = await handleApiRequest(makeReq('/api/auth/demo', { method: 'POST' }));
    expect(demoRes.status).toBe(200);
    const cookie = cookieHeader(demoRes);
    expect(cookie).toContain('vv_session=');

    const data = (await demoRes.json()) as {
      user: { email: string };
      spaces: Array<{ slug: string }>;
      workspace: { plan: string };
    };
    expect(data.user.email).toBe('demo@vouchvoice.app');
    expect(data.spaces.map((s) => s.slug)).toEqual(['acme-ai', 'pixelcraft-kit']);
    expect(data.workspace.plan).toBe('lifetime_79');

    const meRes = await handleApiRequest(makeReq('/api/auth/me', { headers: { cookie } }));
    const meJson = (await meRes.json()) as { user: { email: string } };
    expect(meJson.user.email).toBe('demo@vouchvoice.app');
  });

  it('registers a new founder, creates a second brand space, and activates lifetime license', async () => {
    const regRes = await handleApiRequest(
      makeReq('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Jordan Kim',
          email: 'jordan@example.com',
          password: 'password123',
          firstBrandName: 'FocusTimer',
        }),
      })
    );
    expect(regRes.status).toBe(201);
    const cookie = cookieHeader(regRes);
    const regBody = (await regRes.json()) as { spaces: Array<{ slug: string }>; workspace: { plan: string } };
    expect(regBody.spaces[0].slug).toBe('focustimer');
    expect(regBody.workspace.plan).toBe('free');

    // Create second brand space at $0 extra
    const secondSpaceRes = await handleApiRequest(
      makeReq('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({ name: 'MetricPulse', brandColor: '#0f766e' }),
      })
    );
    expect(secondSpaceRes.status).toBe(201);

    // Upgrade to $79 lifetime license
    const upgradeRes = await handleApiRequest(
      makeReq('/api/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({ plan: 'lifetime_79' }),
      })
    );
    const upBody = (await upgradeRes.json()) as { workspace: { plan: string; licenseKey: string } };
    expect(upBody.workspace.plan).toBe('lifetime_79');
    expect(upBody.workspace.licenseKey).toMatch(/^VV-LIFE-/);

    // Allow hiding branding now that lifetime license is active
    const patchSpace = await handleApiRequest(
      makeReq('/api/spaces/focustimer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({ hidePoweredBy: true, googleMapsPlaceUrl: 'https://maps.google.com/?q=focustimer' }),
      })
    );
    const patched = (await patchSpace.json()) as { space: { hidePoweredBy: boolean } };
    expect(patched.space.hidePoweredBy).toBe(true);
  });

  it('captures a 20s voice testimonial, stores audio, returns playable stream & syndication handoff', async () => {
    const polishRes = await handleApiRequest(
      makeReq('/api/public/ai/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceSlug: 'acme-ai',
          rawTranscript:
            'Um, before PulseDeck AI we spent like 6 hours sorting feedback, you know? Now we do it in 10 minutes and doubled shipped features.',
        }),
      })
    );
    expect(polishRes.status).toBe(200);
    const analysis = (await polishRes.json()) as {
      cleanedByTone: { results: string };
      pullQuote: string;
      outcomeMetric: string;
    };
    expect(analysis.outcomeMetric).toMatch(/6 hours/i);

    const wav = synthesizeDemoWav(2, 0.4);
    const base64Audio = `data:audio/wav;base64,${Buffer.from(wav).toString('base64')}`;

    const submitRes = await handleApiRequest(
      makeReq('/api/public/spaces/acme-ai/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: 'Sora Takahashi',
          authorRole: 'Product Lead',
          authorCompany: 'Kanso Labs',
          rating: 5,
          rawTranscript: 'raw',
          cleanedText: analysis.cleanedByTone.results,
          pullQuote: analysis.pullQuote,
          tone: 'results',
          outcomeMetric: analysis.outcomeMetric,
          durationSec: 18,
          audioBase64: base64Audio,
          audioMimeType: 'audio/wav',
        }),
      })
    );
    expect(submitRes.status).toBe(201);
    const submitted = (await submitRes.json()) as {
      testimonial: { id: string; audioUrl: string };
      handoff: { googleMapsUrl: string; productHuntUrl: string };
    };
    expect(submitted.testimonial.audioUrl).toMatch(/^\/api\/audio\/t_/);
    expect(submitted.handoff.googleMapsUrl).toContain('google.com/maps');
    expect(submitted.handoff.productHuntUrl).toContain('producthunt.com');

    // Verify binary audio stream works
    const audioRes = await handleApiRequest(makeReq(submitted.testimonial.audioUrl));
    expect(audioRes.status).toBe(200);
    expect(audioRes.headers.get('content-type')).toBe('audio/wav');
    const audioBytes = await audioRes.arrayBuffer();
    expect(audioBytes.byteLength).toBe(wav.byteLength);

    // Verify lifetime standalone HTML export includes the newly approved review
    const exportRes = await handleApiRequest(makeReq('/api/public/walls/acme-ai/export'));
    expect(exportRes.status).toBe(200);
    const html = await exportRes.text();
    expect(html).toContain('Sora Takahashi');
  });

  it('rejects private/loopback webhook URLs to prevent SSRF', async () => {
    const demoRes = await handleApiRequest(makeReq('/api/auth/demo', { method: 'POST' }));
    const cookie = cookieHeader(demoRes);

    const badWebhook = await handleApiRequest(
      makeReq('/api/spaces/acme-ai', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({ webhookUrl: 'http://127.0.0.1:8080/hook' }),
      })
    );
    expect(badWebhook.status).toBe(400);
  });

  it('imports testimonials from Senja JSON and records LinkedIn syndication', async () => {
    const demoRes = await handleApiRequest(makeReq('/api/auth/demo', { method: 'POST' }));
    const cookie = cookieHeader(demoRes);

    const impRes = await handleApiRequest(
      makeReq('/api/spaces/acme-ai/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({
          rawInput: JSON.stringify([
            {
              customer_name: 'Devon Hart',
              role: 'Founder',
              company: 'MetricFox',
              rating: 5,
              text: 'Switched from Senja in two minutes and kept every testimonial.',
            },
          ]),
        }),
      })
    );
    expect(impRes.status).toBe(201);
    const impJson = (await impRes.json()) as {
      importedCount: number;
      testimonials: Array<{ id: string }>;
    };
    expect(impJson.importedCount).toBe(1);

    const synRes = await handleApiRequest(
      makeReq('/api/spaces/acme-ai/syndicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({
          testimonialId: impJson.testimonials[0].id,
          target: 'linkedin',
        }),
      })
    );
    expect(synRes.status).toBe(200);
    const synJson = (await synRes.json()) as {
      drafts: { linkedinPost: string; linkedinShareUrl: string };
      testimonial: { syndicatedTargets: string[] };
    };
    expect(synJson.drafts.linkedinPost).toContain('Devon Hart');
    expect(synJson.testimonial.syndicatedTargets).toContain('linkedin');
  });
});
