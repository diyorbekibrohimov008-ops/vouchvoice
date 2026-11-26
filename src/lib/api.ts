import type {
  ReviewTone,
  SpaceConfig,
  SyndicationEvent,
  SyndicationTarget,
  Testimonial,
  TestimonialSource,
  TestimonialStatus,
  TranscriptAnalysis,
  UserProfile,
  Workspace,
} from '../../shared/types';
import type { SyndicationDrafts } from '../../shared/syndication';

export interface TestimonialWithAudio extends Testimonial {
  audioUrl: string | null;
}

export interface AuthResponse {
  user: UserProfile | null;
  workspace: Workspace | null;
  spaces: SpaceConfig[];
}

export interface PublicSpaceResponse {
  space: SpaceConfig;
  testimonials: TestimonialWithAudio[];
  stats: {
    totalApproved: number;
    voiceCount: number;
    averageRating: number;
  };
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      throw new Error('Unexpected response from server');
    }
  }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  me: () => request<AuthResponse>('/api/auth/me'),
  loginDemo: () => request<AuthResponse>('/api/auth/demo', { method: 'POST' }),
  resetDemo: () => request<{ ok: boolean; workspace: Workspace; spaces: SpaceConfig[] }>('/api/demo/reset', { method: 'POST' }),
  register: (payload: {
    name: string;
    email: string;
    password: string;
    workspaceName?: string;
    firstBrandName?: string;
  }) => request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  updateWorkspace: (payload: {
    name?: string;
    aiProvider?: 'built_in' | 'openai' | 'gemini';
    customAiKey?: string | null;
  }) => request<{ workspace: Workspace }>('/api/workspace', { method: 'PATCH', body: JSON.stringify(payload) }),

  createSpace: (payload: Partial<SpaceConfig>) =>
    request<{ space: SpaceConfig }>('/api/spaces', { method: 'POST', body: JSON.stringify(payload) }),
  updateSpace: (slug: string, payload: Partial<SpaceConfig>) =>
    request<{ space: SpaceConfig }>(`/api/spaces/${encodeURIComponent(slug)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getPublicSpace: (slug: string) =>
    request<PublicSpaceResponse>(`/api/public/spaces/${encodeURIComponent(slug)}`),

  polishTranscript: (payload: {
    rawTranscript: string;
    brandName?: string;
    spaceSlug?: string;
    audioBase64?: string | null;
    audioMimeType?: string | null;
  }) =>
    request<TranscriptAnalysis>('/api/public/ai/polish', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  submitPublicTestimonial: (
    slug: string,
    payload: {
      authorName: string;
      authorRole: string;
      authorCompany: string;
      rating: number;
      rawTranscript: string;
      cleanedText: string;
      pullQuote: string;
      tone: ReviewTone;
      outcomeMetric: string | null;
      tags: string[];
      fillersRemovedCount: number;
      source: TestimonialSource;
      durationSec: number | null;
      audioBase64?: string | null;
      audioMimeType?: string | null;
    }
  ) =>
    request<{
      testimonial: TestimonialWithAudio;
      handoff: { googleMapsUrl: string | null; productHuntUrl: string | null };
    }>(`/api/public/spaces/${encodeURIComponent(slug)}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getSpaceTestimonials: (slug: string) =>
    request<{ space: SpaceConfig; testimonials: TestimonialWithAudio[]; events: SyndicationEvent[] }>(
      `/api/spaces/${encodeURIComponent(slug)}/testimonials`
    ),

  updateTestimonial: (
    slug: string,
    id: string,
    payload: Partial<{
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
  ) =>
    request<{ testimonial: TestimonialWithAudio }>(
      `/api/spaces/${encodeURIComponent(slug)}/testimonials/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    ),

  deleteTestimonial: (slug: string, id: string) =>
    request<{ ok: boolean }>(
      `/api/spaces/${encodeURIComponent(slug)}/testimonials/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    ),

  importTestimonials: (
    slug: string,
    payload: { rawInput: string; preferredSource?: TestimonialSource }
  ) =>
    request<{ importedCount: number; testimonials: Testimonial[] }>(
      `/api/spaces/${encodeURIComponent(slug)}/import`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  syndicateTestimonial: (
    slug: string,
    payload: { testimonialId: string; target: SyndicationTarget }
  ) =>
    request<{
      event: SyndicationEvent;
      drafts: SyndicationDrafts;
      testimonial: TestimonialWithAudio;
    }>(`/api/spaces/${encodeURIComponent(slug)}/syndicate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to encode audio'));
    reader.readAsDataURL(blob);
  });
}

export function uint8ToBase64DataUrl(bytes: Uint8Array, mimeType = 'audio/wav'): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrapTextLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = w;
      if (lines.length === maxLines) break;
    } else {
      current = (current + ' ' + w).trim();
    }
  }
  if (current && lines.length < maxLines) lines.push(current.trim());
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/[.,;!?]*$/, '') + '…';
  }
  return lines;
}

export function buildQuoteCardSvg(testimonial: Testimonial, space: SpaceConfig): string {
  const accent = /^#[0-9a-fA-F]{3,8}$/.test((space.brandColor || '').trim())
    ? space.brandColor.trim()
    : '#2142e7';
  const avatarBg = /^#[0-9a-fA-F]{3,8}$/.test((testimonial.authorAvatarColor || '').trim())
    ? testimonial.authorAvatarColor.trim()
    : accent;
  const lines = wrapTextLines(`"${testimonial.cleanedText}"`, 54, 5);
  const tspans = lines
    .map((line, i) => `<tspan x="64" dy="${i === 0 ? 0 : 40}">${escapeXml(line)}</tspan>`)
    .join('');

  const attribution = [testimonial.authorName, testimonial.authorRole, testimonial.authorCompany]
    .filter(Boolean)
    .join(', ');

  const initials =
    testimonial.authorName
      .split(/\s+/)
      .map((part) => part[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'VV';

  const badge = testimonial.outcomeMetric
    ? `<rect x="64" y="54" rx="16" width="${Math.min(340, testimonial.outcomeMetric.length * 10 + 44)}" height="34" fill="#eef2ff" />
       <text x="82" y="76" font-family="Funnel Sans, system-ui, sans-serif" font-size="15" font-weight="700" fill="${escapeXml(accent)}">${escapeXml(testimonial.outcomeMetric)}</text>`
    : `<text x="64" y="78" font-family="Funnel Sans, system-ui, sans-serif" font-size="16" font-weight="700" fill="${escapeXml(accent)}">★★★★★ Verified Customer Voice</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f4f6f8"/>
      <stop offset="100%" stop-color="#e8edf5"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="36" y="36" width="1128" height="558" rx="24" fill="#ffffff" stroke="#e5e9f0" stroke-width="2"/>
  ${badge}
  <text x="64" y="158" font-family="Funnel Sans, system-ui, sans-serif" font-size="30" font-weight="600" fill="#131722">${tspans}</text>
  <line x1="64" y1="455" x2="1136" y2="455" stroke="#e5e9f0" stroke-width="2"/>
  <circle cx="92" cy="518" r="28" fill="${escapeXml(avatarBg)}"/>
  <text x="92" y="525" text-anchor="middle" font-family="Funnel Sans, system-ui, sans-serif" font-size="18" font-weight="700" fill="#ffffff">${escapeXml(initials)}</text>
  <text x="136" y="512" font-family="Funnel Sans, system-ui, sans-serif" font-size="22" font-weight="700" fill="#131722">${escapeXml(testimonial.authorName)}</text>
  <text x="136" y="540" font-family="Funnel Sans, system-ui, sans-serif" font-size="17" fill="#5b6476">${escapeXml(attribution)}</text>
  <text x="1136" y="526" text-anchor="end" font-family="Funnel Sans, system-ui, sans-serif" font-size="18" font-weight="700" fill="${escapeXml(accent)}">${escapeXml(space.name)}</text>
</svg>`;
}
