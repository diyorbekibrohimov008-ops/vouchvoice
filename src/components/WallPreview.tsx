import { useEffect, useRef, useState } from 'react';
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
    shell: 'bg-[#EEF1F6] border-[#DCE2EC]',
    card: 'bg-white border-[#DCE2EC]',
    text: 'text-[#131722]',
    muted: 'text-[#576278]',
    badge: 'bg-[#131722] text-white border-[#131722]',
  },
  midnight: {
    shell: 'bg-[#0F131D] border-[#232B3D]',
    card: 'bg-[#171D2B] border-[#263046]',
    text: 'text-[#F4F6F8]',
    muted: 'text-[#9AA6BE]',
    badge: 'bg-[#E63B2E] text-white border-[#E63B2E]',
  },
  cream: {
    shell: 'bg-[#F8F4EC] border-[#E6DEC9]',
    card: 'bg-[#FFFDF9] border-[#E4D9C4]',
    text: 'text-[#1D1B18]',
    muted: 'text-[#635C52]',
    badge: 'bg-[#1D1B18] text-white border-[#1D1B18]',
  },
  indigo: {
    shell: 'bg-[#EBF0FF] border-[#C9D6FF]',
    card: 'bg-white border-[#D6E0FF]',
    text: 'text-[#131722]',
    muted: 'text-[#3B4C7A]',
    badge: 'bg-[#2142E7] text-white border-[#2142E7]',
  },
};

export function WallPreview({ space, testimonials, onCollectClick }: WallPreviewProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [marqueePaused, setMarqueePaused] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const theme = THEME_CLASSES[space.theme] ?? THEME_CLASSES.paper;

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

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
    const initials =
      item.authorName
        .split(/\s+/)
        .map((p) => p[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'VV';
    const isPlaying = playingId === item.id;
    const clampedRating = Math.max(0, Math.min(5, Math.round(item.rating || 5)));
    const roleLine = space.showCompany
      ? [item.authorRole, item.authorCompany].filter(Boolean).join(', ')
      : item.authorRole;

    return (
      <article
        key={`${item.id}${keySuffix}`}
        className={`break-inside-avoid border p-5 ${radiusClass} ${theme.card}`}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {space.showRatings ? (
            <div className="flex items-center gap-0.5 text-amber-500" aria-label={`${clampedRating} stars`}>
              {Array.from({ length: clampedRating }).map((_, idx) => (
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
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                  isPlaying
                    ? 'border-[#E63B2E] bg-[#E63B2E] text-white'
                    : theme.badge
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-3 w-3 fill-current" />
                    <span className="flex h-2.5 items-end gap-[2px]" aria-hidden="true">
                      <span className="vv-eq-bar h-2 w-[2px] rounded-full bg-white" />
                      <span
                        className="vv-eq-bar h-2.5 w-[2px] rounded-full bg-white"
                        style={{ animationDelay: '0.18s' }}
                      />
                      <span
                        className="vv-eq-bar h-1.5 w-[2px] rounded-full bg-white"
                        style={{ animationDelay: '0.35s' }}
                      />
                    </span>
                    <span>Playing</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 fill-current" />
                    <span className="tabular-nums">{item.durationSec ?? 18}s voice</span>
                  </>
                )}
              </button>
            )}
            {space.showMetrics && item.outcomeMetric && (
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
                style={{ backgroundColor: space.brandColor || '#2142e7' }}
              >
                {item.outcomeMetric}
              </span>
            )}
          </div>
        </div>

        {item.pullQuote && (
          <h4 className={`font-display mb-2 text-base font-bold leading-snug ${theme.text}`}>
            “{item.pullQuote}”
          </h4>
        )}
        <p className={`mb-4 text-sm leading-relaxed opacity-90 ${theme.text}`}>
          {item.cleanedText}
        </p>

        <div className="flex items-center gap-2.5">
          <div
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: item.authorAvatarColor || space.brandColor || '#2142e7' }}
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
    <div className={`rounded-2xl border p-5 sm:p-7 ${theme.shell}`}>
      {approved.length === 0 ? (
        <div className={`py-12 text-center ${theme.muted}`}>
          <Mic className="mx-auto mb-3 h-8 w-8 opacity-60" />
          <p className="text-sm font-medium">No approved reviews yet in this space.</p>
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
            <span className={`tabular-nums text-sm font-extrabold ${theme.text}`}>{avgRating}/5</span>
            <span className={`text-sm ${theme.muted}`}>
              from {approved.length} verified customer voice and text reviews
            </span>
          </div>
          <p className={`text-xs ${theme.muted}`}>
            Compact rating pill layout for headers and pricing pages
          </p>
        </div>
      ) : space.layout === 'marquee' ? (
        <div className="overflow-hidden py-2">
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => setMarqueePaused((p) => !p)}
              aria-pressed={marqueePaused}
              className="cursor-pointer rounded-lg border border-[#CED6E3] bg-white px-3 py-1 text-xs font-semibold text-[#131722] hover:bg-[#EEF1F6]"
            >
              {marqueePaused ? 'Resume scroll' : 'Pause scroll'}
            </button>
          </div>
          <div className="vv-marquee-track" data-paused={marqueePaused ? 'true' : undefined}>
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
        <div className={`mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-3.5 text-xs ${theme.muted} border-current/10`}>
          <span>
            Verified voice reviews by{' '}
            <strong style={{ color: space.brandColor || '#2142e7' }}>VouchVoice</strong>
          </span>
          {onCollectClick && (
            <button
              type="button"
              onClick={onCollectClick}
              className="cursor-pointer font-semibold underline underline-offset-2"
              style={{ color: space.brandColor || '#2142e7' }}
            >
              Leave a 20s voice review
            </button>
          )}
        </div>
      )}
    </div>
  );
}
