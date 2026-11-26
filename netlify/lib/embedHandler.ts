const WIDGET_SCRIPT = `(function(){
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var scriptEl = document.currentScript;
  var scriptOrigin = '';
  try {
    if (scriptEl && scriptEl.src) {
      scriptOrigin = new URL(scriptEl.src).origin;
    }
  } catch (e) {}
  if (!scriptOrigin) scriptOrigin = window.location.origin;

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function themeVars(theme) {
    if (theme === 'midnight') {
      return { bg: '#0b1120', card: '#111827', border: '#1e293b', text: '#f8fafc', muted: '#94a3b8', pillBg: 'rgba(16,185,129,0.16)', pillText: '#34d399' };
    }
    if (theme === 'cream') {
      return { bg: '#fbf7ef', card: '#fffdf8', border: '#eadfcd', text: '#1c1917', muted: '#78716c', pillBg: '#ecfdf5', pillText: '#047857' };
    }
    if (theme === 'indigo') {
      return { bg: '#f0fdfa', card: 'rgba(255,255,255,0.95)', border: '#99f6e4', text: '#0f172a', muted: '#0f766e', pillBg: '#ccfbf1', pillText: '#115e59' };
    }
    return { bg: 'transparent', card: '#ffffff', border: '#e2e8f0', text: '#0f172a', muted: '#64748b', pillBg: '#ecfdf5', pillText: '#047857' };
  }

  function renderWidget(host) {
    var slug = host.getAttribute('data-vouch-wall');
    if (!slug || host.__vouchLoaded) return;
    host.__vouchLoaded = true;
    var root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    root.innerHTML = '<div style="font-family:system-ui,sans-serif;padding:16px;color:#64748b;font-size:13px;">Loading Wall of Love…</div>';

    fetch(scriptOrigin + '/api/public/spaces/' + encodeURIComponent(slug))
      .then(function(r){ return r.json(); })
      .then(function(data) {
        if (!data || !data.space) {
          root.innerHTML = '<div style="font-family:system-ui,sans-serif;padding:12px;color:#ef4444;font-size:13px;">Wall not found.</div>';
          return;
        }
        var sp = data.space;
        var items = data.testimonials || [];
        var layout = host.getAttribute('data-vouch-layout') || sp.layout || 'masonry';
        var theme = host.getAttribute('data-vouch-theme') || sp.theme || 'paper';
        var pal = themeVars(theme);
        var radius = sp.cardRadius === 'sharp' ? '6px' : sp.cardRadius === 'pill' ? '22px' : '16px';
        var rawAccent = typeof sp.brandColor === 'string' ? sp.brandColor.trim() : '';
        var accent = /^#[0-9a-fA-F]{3,8}$/.test(rawAccent) ? rawAccent : '#0d7480';

        var gridClass = layout === 'marquee' ? 'vv-marquee' : layout === 'spotlight' ? 'vv-spotlight' : layout === 'badge' ? 'vv-badge-wrap' : layout === 'grid' ? 'vv-grid' : 'vv-masonry';

        var cards = items.map(function(t) {
          var initials = (t.authorName || 'C').split(/\\s+/).map(function(p){ return p[0] || ''; }).join('').slice(0,2).toUpperCase();
          var ratingNum = Math.max(1, Math.min(5, Math.round(Number(t.rating) || 5)));
          var stars = sp.showRatings ? '<span class="vv-stars">' + '★'.repeat(ratingNum) + '</span>' : '';
          var voiceBtn = (sp.showVoiceBadge && t.hasAudio && t.audioUrl)
            ? '<button type="button" class="vv-audio-btn" data-audio="' + esc(scriptOrigin + t.audioUrl) + '">▶ ' + esc(t.durationSec || 20) + 's voice</button>'
            : '';
          var metric = (sp.showMetrics && t.outcomeMetric)
            ? '<span class="vv-metric">' + esc(t.outcomeMetric) + '</span>'
            : '';
          var role = sp.showCompany ? [t.authorRole, t.authorCompany].filter(Boolean).join(' · ') : (t.authorRole || '');

          return '<article class="vv-card">' +
            '<div class="vv-top">' + stars + '<div class="vv-pills">' + voiceBtn + metric + '</div></div>' +
            (t.pullQuote ? '<h4 class="vv-quote">“' + esc(t.pullQuote) + '”</h4>' : '') +
            '<p class="vv-text">' + esc(t.cleanedText) + '</p>' +
            '<div class="vv-foot">' +
              '<div class="vv-av" style="background:' + esc(t.authorAvatarColor || accent) + '">' + esc(initials) + '</div>' +
              '<div><div class="vv-name">' + esc(t.authorName) + '</div>' +
              (role ? '<div class="vv-role">' + esc(role) + '</div>' : '') + '</div>' +
            '</div>' +
          '</article>';
        }).join('');

        var bodyHtml = '';
        if (layout === 'badge') {
          var avg = (data.stats && data.stats.averageRating) || 5.0;
          var cnt = (data.stats && data.stats.totalApproved) || items.length;
          bodyHtml = '<a class="vv-badge-pill" href="' + esc(scriptOrigin + '/wall/' + sp.slug) + '" target="_blank" rel="noopener">' +
            '<span class="vv-stars">★★★★★</span>' +
            '<strong>' + esc(avg) + '/5</strong>' +
            '<span>from ' + esc(cnt) + ' verified customer reviews</span>' +
            '<span class="vv-cta">Read →</span>' +
          '</a>';
        } else {
          bodyHtml = '<div class="' + gridClass + '">' + cards + '</div>';
        }

        var footer = sp.hidePoweredBy ? '' :
          '<div class="vv-powered">Verified voice social proof by <a href="' + esc(scriptOrigin) + '" target="_blank" rel="noopener">VouchVoice</a> · <a href="' + esc(scriptOrigin + '/collect/' + sp.slug) + '" target="_blank" rel="noopener">Leave a 20s voice review</a></div>';

        root.innerHTML =
          '<style>' +
            ':host{display:block;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}' +
            '.vv-shell{background:' + pal.bg + ';color:' + pal.text + ';padding:' + (pal.bg === 'transparent' ? '4px 0' : '24px') + ';border-radius:18px;}' +
            '.vv-masonry{column-count:3;column-gap:16px;}' +
            '@media(max-width:900px){.vv-masonry{column-count:2;}}' +
            '@media(max-width:600px){.vv-masonry{column-count:1;}}' +
            '.vv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:16px;align-items:start;}' +
            '.vv-marquee{display:flex;gap:16px;overflow-x:auto;padding-bottom:8px;scroll-snap-type:x mandatory;}' +
            '.vv-marquee .vv-card{min-width:300px;max-width:320px;flex-shrink:0;scroll-snap-align:start;}' +
            '.vv-spotlight{max-width:680px;margin:0 auto;display:grid;gap:16px;}' +
            '.vv-card{break-inside:avoid;margin-bottom:16px;background:' + pal.card + ';border:1px solid ' + pal.border + ';border-radius:' + radius + ';padding:18px;box-shadow:0 4px 18px rgba(15,23,42,0.05);}' +
            '.vv-grid .vv-card,.vv-marquee .vv-card{margin-bottom:0;}' +
            '.vv-top{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;}' +
            '.vv-stars{color:#f59e0b;font-size:14px;letter-spacing:1px;}' +
            '.vv-pills{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}' +
            '.vv-audio-btn{cursor:pointer;border:1px solid ' + pal.border + ';background:' + pal.pillBg + ';color:' + pal.pillText + ';border-radius:999px;padding:3px 9px;font-size:11px;font-weight:700;}' +
            '.vv-metric{background:' + pal.pillBg + ';color:' + pal.pillText + ';border-radius:999px;padding:3px 9px;font-size:11px;font-weight:700;}' +
            '.vv-quote{margin:0 0 8px;font-size:15px;line-height:1.38;font-weight:700;color:' + pal.text + ';}' +
            '.vv-text{margin:0 0 14px;font-size:13.5px;line-height:1.58;color:' + pal.text + ';opacity:0.88;}' +
            '.vv-foot{display:flex;align-items:center;gap:10px;}' +
            '.vv-av{width:32px;height:32px;border-radius:999px;color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center;flex-shrink:0;}' +
            '.vv-name{font-size:13px;font-weight:700;color:' + pal.text + ';}' +
            '.vv-role{font-size:11.5px;color:' + pal.muted + ';}' +
            '.vv-badge-wrap{display:flex;justify-content:center;}' +
            '.vv-badge-pill{display:inline-flex;align-items:center;gap:10px;padding:10px 18px;border-radius:999px;background:' + pal.card + ';border:1px solid ' + pal.border + ';color:' + pal.text + ';text-decoration:none;font-size:13px;box-shadow:0 4px 16px rgba(15,23,42,0.08);}' +
            '.vv-cta{color:' + accent + ';font-weight:700;}' +
            '.vv-powered{margin-top:12px;text-align:center;font-size:11.5px;color:' + pal.muted + ';}' +
            '.vv-powered a{color:' + accent + ';text-decoration:none;font-weight:600;}' +
          '</style>' +
          '<div class="vv-shell">' + bodyHtml + footer + '</div>';

        var activeAudio = null;
        var activeBtn = null;
        root.querySelectorAll('.vv-audio-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var src = btn.getAttribute('data-audio');
            if (!src) return;
            if (activeAudio && activeBtn === btn && !activeAudio.paused) {
              activeAudio.pause();
              btn.textContent = btn.getAttribute('data-label') || '▶ Voice';
              return;
            }
            if (activeAudio) {
              activeAudio.pause();
              if (activeBtn) activeBtn.textContent = activeBtn.getAttribute('data-label') || '▶ Voice';
            }
            if (!btn.getAttribute('data-label')) btn.setAttribute('data-label', btn.textContent);
            var audio = new Audio(src);
            activeAudio = audio;
            activeBtn = btn;
            btn.textContent = '❚❚ Playing…';
            audio.play().catch(function(){
              btn.textContent = btn.getAttribute('data-label') || '▶ Voice';
            });
            audio.onended = function() {
              btn.textContent = btn.getAttribute('data-label') || '▶ Voice';
            };
          });
        });
      })
      .catch(function() {
        root.innerHTML = '<div style="font-family:system-ui,sans-serif;padding:12px;color:#64748b;font-size:13px;">Could not load Wall of Love.</div>';
      });
  }

  function scan() {
    document.querySelectorAll('[data-vouch-wall]').forEach(renderWidget);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }
})();`;

export function handleEmbedRequest(req: Request): Response {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  }
  return new Response(WIDGET_SCRIPT, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
