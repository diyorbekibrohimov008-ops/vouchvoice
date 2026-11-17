import { useRef, useState } from 'react';
import { Mic, Pause, Play, Star } from 'lucide-react';
import type { SpaceConfig } from '../../shared/types';
import type { TestimonialWithAudio } from '../lib/api';

interface WallPreviewProps {
  space: SpaceConfig;
  testimonials: TestimonialWithAudio[];
  onCollectClick?: () => void;
}

const THEME_CLASSES: Record<
  SpaceConfig['theme'],
  { shell: string; card: string; text: string; muted: string; badge: string }
> = {
  paper: {
    shell: 'bg-slate-50/80 border-slate-200',
    card: 'bg-white border-slate-200/90 shadow-sm',
    text: 'text-slate-900',
    muted: 'text-slate-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  midnight: {
    shell: 'bg-slate-950 border-slate-800',
    card: 'bg-slate-900 border-slate-800 shadow-lg shadow-black/30',
    text: 'text-slate-50',
    muted: 'text-slate-400',
    badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
  },
  cream: {
    shell: 'bg-[#FBF7EF] border-[#EAE0CE]',
    card: 'bg-[#FFFDF8] border-[#E7DAC5] shadow-sm',
    text: 'text-stone-900',
    muted: 'text-stone-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  indigo: {
    shell: 'bg-gradient-to-br from-indigo-50 via-white to-violet-50 border-indigo-200',
    card: 'bg-white/90 backdrop-blur border-indigo-100 shadow-sm',
    text: 'text-indigo-950',
    muted: 'text-indigo-600/80',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
};

export function WallPreview({ space, testimonials, onCollectClick }: WallPreviewProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const theme = THEME_CLASSES[space.theme] ?? THEME_CLASSES.paper;

  const approved = testimonials.filter((t) => t.status === 'approved');
  const radiusClass =
    space.cardRadius === 'sharp'
      ? 'rounded-md'
      : space.cardRadius === 'pill'
      ? 'rounded-3xl'
      : 'rounded-2xl';

  const togglePlay = (item: TestimonialWithAudio) => {
    if (!item.audioUrl) return;
    if (playingId === item.id && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(item.audioUrl);
    audioRef.current = audio;
    setPlayingId(item.id);
    audio.play().catch(() => setPlayingId(null));
    audio.onended = () => setPlayingId(null);
  };

  const renderCard = (item: TestimonialWithAudio, keySuffix = '') => {
    const initials = item.authorName
      .split(/\s+/)
      .map((p) => p[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
    const isPlaying = playingId === item.id;
    const roleLine = space.showCompany
      ? [item.authorRole, item.authorCompany].filter(Boolean).join(' · ')
      : item.authorRole;

    return (
      <article
        key={`${item.id}${keySuffix}`}
        className={`break-inside-avoid border p-5 transition hover:-translate-y-0.5 ${radiusClass} ${theme.card}`}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {space.showRatings ? (
            <div className="flex items-center gap-0.5 text-amber-400" aria-label={`${item.rating} stars`}>
              {Array.from({ length: item.rating }).map((_, idx) => (
                <Star key={idx} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
          ) : (
            <span />
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            {space.showVoiceBadge && item.hasAudio && item.audioUrl && (
              <button
                type="button"
                onClick={() => togglePlay(item)}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${theme.badge}`}
              >
                {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                <span>{isPlaying ? 'Playing…' : `${item.durationSec ?? 18}s voice`}</span>
              </button>
            )}
            {space.showMetrics && item.outcomeMetric && (
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
                style={{ backgroundColor: space.brandColor || '#4f46e5' }}
              >
                {item.outcomeMetric}
              </span>
            )}
          </div>
        </div>

        {item.pullQuote && (
          <h4 className={`mb-2 text-sm font-bold leading-snug ${theme.text}`}>
            “{item.pullQuote}”
          </h4>
        )}
        <p className={`mb-4 text-sm leading-relaxed opacity-90 ${theme.text}`}>
          {item.cleanedText}
        </p>

        <div className="flex items-center gap-2.5">
          <div
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: item.authorAvatarColor || space.brandColor }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className={`truncate text-xs font-bold ${theme.text}`}>{item.authorName}</div>
            {roleLine && <div className={`truncate text-[11px] ${theme.muted}`}>{roleLine}</div>}
          </div>
        </div>
      </article>
    );
  };

  const avgRating =
    approved.length > 0
      ? (approved.reduce((s, t) => s + t.rating, 0) / approved.length).toFixed(1)
      : '5.0';

  return (
    <div className={`rounded-3xl border p-5 sm:p-7 ${theme.shell}`}>
      {approved.length === 0 ? (
        <div className={`py-12 text-center ${theme.muted}`}>
          <Mic className="mx-auto mb-3 h-8 w-8 opacity-60" />
          <p className="text-sm font-medium">No approved testimonials yet in this space.</p>
        </div>
      ) : space.layout === 'badge' ? (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <div
            className={`inline-flex flex-wrap items-center gap-3 rounded-full border px-5 py-3 ${theme.card}`}
          >
            <div className="flex items-center gap-0.5 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className={`text-sm font-extrabold ${theme.text}`}>{avgRating}/5</span>
            <span className={`text-sm ${theme.muted}`}>
              from {approved.length} verified customer voice & text reviews
            </span>
          </div>
          <p className={`text-xs ${theme.muted}`}>
            Floating Social Proof Pill preview — click to open full Wall of Love
          </p>
        </div>
      ) : space.layout === 'marquee' ? (
        <div className="overflow-hidden py-2">
          <div className="vv-marquee-track">
            {approved.map((t) => (
              <div key={t.id} className="w-80 shrink-0">
                {renderCard(t, '-a')}
              </div>
            ))}
            {approved.map((t) => (
              <div key={`${t.id}-dup`} className="w-80 shrink-0">
                {renderCard(t, '-b')}
              </div>
            ))}
          </div>
        </div>
      ) : space.layout === 'spotlight' ? (
        <div className="mx-auto max-w-2xl space-y-4">
          {approved.slice(0, 3).map((t) => renderCard(t))}
        </div>
      ) : space.layout === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {approved.map((t) => renderCard(t))}
        </div>
      ) : (
        <div className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3">
          {approved.map((t) => renderCard(t))}
        </div>
      )}

      {!space.hidePoweredBy && (
        <div className={`mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs ${theme.muted} border-current/10`}>
          <span>
            Verified voice social proof by{' '}
            <strong style={{ color: space.brandColor }}>VouchVoice</strong>
          </span>
          {onCollectClick && (
            <button
              type="button"
              onClick={onCollectClick}
              className="cursor-pointer font-semibold underline underline-offset-2"
              style={{ color: space.brandColor }}
            >
              Leave a 20s voice review →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
