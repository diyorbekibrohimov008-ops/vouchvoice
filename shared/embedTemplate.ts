import type { SpaceConfig, Testimonial } from './types';

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getThemePalette(theme: SpaceConfig['theme']) {
  switch (theme) {
    case 'midnight':
      return {
        bg: '#090d16',
        cardBg: '#111827',
        border: '#1f2937',
        text: '#f8fafc',
        muted: '#94a3b8',
        badgeBg: 'rgba(16, 185, 129, 0.14)',
        badgeText: '#34d399',
      };
    case 'cream':
      return {
        bg: '#fbf7ef',
        cardBg: '#fffdf8',
        border: '#eadfcd',
        text: '#1c1917',
        muted: '#78716c',
        badgeBg: '#ecfdf5',
        badgeText: '#047857',
      };
    case 'indigo':
      return {
        bg: '#eef2ff',
        cardBg: 'rgba(255,255,255,0.9)',
        border: '#c7d2fe',
        text: '#1e1b4b',
        muted: '#4338ca',
        badgeBg: '#e0e7ff',
        badgeText: '#3730a3',
      };
    case 'paper':
    default:
      return {
        bg: 'transparent',
        cardBg: '#ffffff',
        border: '#e2e8f0',
        text: '#0f172a',
        muted: '#64748b',
        badgeBg: '#ecfdf5',
        badgeText: '#047857',
      };
  }
}

function safeHexColor(color: string | undefined, fallback = '#2142e7'): string {
  const trimmed = (color ?? '').trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(trimmed) ? trimmed : fallback;
}

export function buildStandaloneLifetimeHtml(
  space: SpaceConfig,
  testimonials: Testimonial[],
  originUrl: string
): string {
  const approved = testimonials.filter((t) => t.status === 'approved');
  const palette = getThemePalette(space.theme);
  const accent = safeHexColor(space.brandColor);
  const radius =
    space.cardRadius === 'sharp' ? '6px' : space.cardRadius === 'pill' ? '24px' : '16px';

  const cardsHtml = approved
    .map((item) => {
      const clampedRating = Math.max(0, Math.min(5, Math.round(item.rating || 5)));
      const stars = space.showRatings
        ? `<div class="vv-stars" aria-label="${clampedRating} out of 5 stars">${'★'.repeat(clampedRating)}${'☆'.repeat(5 - clampedRating)}</div>`
        : '';
      const metric =
        space.showMetrics && item.outcomeMetric
          ? `<span class="vv-metric">${escapeHtml(item.outcomeMetric)}</span>`
          : '';
      const voiceBadge =
        space.showVoiceBadge && item.hasAudio
          ? `<span class="vv-voice">${item.durationSec ?? 20}s voice note</span>`
          : '';
      const roleLine = space.showCompany
        ? [item.authorRole, item.authorCompany].filter(Boolean).join(', ')
        : item.authorRole;
      const initials = item.authorName
        .split(/\s+/)
        .map((p) => p[0] || '')
        .join('')
        .slice(0, 2)
        .toUpperCase();

      return `
      <article class="vv-card">
        <div class="vv-top">
          ${stars}
          <div class="vv-badges">${voiceBadge}${metric}</div>
        </div>
        ${item.pullQuote ? `<h3 class="vv-quote">“${escapeHtml(item.pullQuote)}”</h3>` : ''}
        <p class="vv-body">${escapeHtml(item.cleanedText)}</p>
        <footer class="vv-author">
          <div class="vv-avatar" style="background:${safeHexColor(item.authorAvatarColor, accent)}">${escapeHtml(initials)}</div>
          <div>
            <div class="vv-name">${escapeHtml(item.authorName)}</div>
            ${roleLine ? `<div class="vv-role">${escapeHtml(roleLine)}</div>` : ''}
          </div>
        </footer>
      </article>`;
    })
    .join('\n');

  const poweredBy = space.hidePoweredBy
    ? ''
    : `<div class="vv-footer">Powered by <a href="${escapeHtml(originUrl)}" target="_blank" rel="noopener">VouchVoice</a></div>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(space.name)} — Wall of Love (Self-Hosted Standalone Embed)</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 28px 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: ${palette.bg === 'transparent' ? '#f8fafc' : palette.bg};
      color: ${palette.text};
    }
    .vv-wrap { max-width: 1120px; margin: 0 auto; }
    .vv-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 18px;
      align-items: start;
    }
    .vv-card {
      background: ${palette.cardBg};
      border: 1px solid ${palette.border};
      border-radius: ${radius};
      padding: 20px;
      box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
    }
    .vv-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .vv-stars { color: #f59e0b; font-size: 14px; letter-spacing: 1px; }
    .vv-badges { display: flex; gap: 6px; flex-wrap: wrap; }
    .vv-voice, .vv-metric {
      font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px;
      background: ${palette.badgeBg}; color: ${palette.badgeText};
    }
    .vv-quote { margin: 0 0 8px; font-size: 15px; line-height: 1.4; font-weight: 700; }
    .vv-body { margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: ${palette.text}; opacity: 0.9; }
    .vv-author { display: flex; align-items: center; gap: 10px; }
    .vv-avatar {
      width: 34px; height: 34px; border-radius: 999px; color: #fff;
      font-size: 12px; font-weight: 700; display: grid; place-items: center; flex-shrink: 0;
    }
    .vv-name { font-size: 13px; font-weight: 700; }
    .vv-role { font-size: 12px; color: ${palette.muted}; }
    .vv-footer { margin-top: 18px; text-align: center; font-size: 12px; color: ${palette.muted}; }
    .vv-footer a { color: ${accent}; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <section class="vv-wrap">
    <div class="vv-grid">${cardsHtml}</div>
    ${poweredBy}
  </section>
</body>
</html>`;
}
