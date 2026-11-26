import { MessageSquareQuote, Pause, Play, Star, Trash2 } from 'lucide-react';
import { api, type TestimonialWithAudio } from '../../lib/api';
import type { TestimonialStatus } from '../../../shared/types';

interface StudioInboxTabProps {
  testimonials: TestimonialWithAudio[];
  statusFilter: 'all' | TestimonialStatus | 'voice';
  onStatusFilterChange: (filter: 'all' | TestimonialStatus | 'voice') => void;
  loading: boolean;
  playingId: string | null;
  onTogglePlay: (t: TestimonialWithAudio) => void;
  onPatchTestimonial: (id: string, patch: Parameters<typeof api.updateTestimonial>[2]) => void;
  onSyndicateClick: (id: string) => void;
  onDelete: (id: string) => void;
}

const FILTER_LABELS: Record<'all' | TestimonialStatus | 'voice', string> = {
  all: 'All reviews',
  approved: 'Approved',
  pending: 'Needs approval',
  voice: 'Voice notes',
  archived: 'Archived',
};

const SOURCE_LABELS: Record<string, string> = {
  voice: 'Voice note',
  text: 'Written',
  senja_import: 'Imported from Senja',
  testimonial_to_import: 'Imported from Testimonial.to',
  google_import: 'Google review',
  producthunt_import: 'Product Hunt',
  linkedin_import: 'LinkedIn',
  csv_import: 'CSV import',
};

/** Studio tab for reviewing, filtering, playing, approving, and managing customer reviews. */
export function StudioInboxTab({
  testimonials,
  statusFilter,
  onStatusFilterChange,
  loading,
  playingId,
  onTogglePlay,
  onPatchTestimonial,
  onSyndicateClick,
  onDelete,
}: StudioInboxTabProps) {
  const filtered = testimonials.filter((t) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'voice') return t.hasAudio || t.source === 'voice';
    return t.status === statusFilter;
  });

  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'approved', 'pending', 'voice', 'archived'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onStatusFilterChange(f)}
              className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === f
                  ? 'bg-[#2142E7] text-white'
                  : 'border border-[#DCE2EC] bg-white text-[#475166] hover:bg-[#EEF1F6]'
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
        <div className="tabular-nums text-xs text-[#576278]">
          {loading ? 'Refreshing…' : `${filtered.length} ${filtered.length === 1 ? 'review' : 'reviews'}`}
        </div>
      </div>

      {filtered.length === 0 && !loading ? (
        <div className="rounded-2xl border border-[#DCE2EC] bg-white p-12 text-center">
          <MessageSquareQuote className="mx-auto h-8 w-8 text-[#7E8AA2]" />
          <p className="mt-3 text-sm font-bold text-[#131722]">No reviews in this view yet</p>
          <p className="mt-1 text-xs text-[#576278]">
            Share your 20-second voice link with a customer or switch filters above.
          </p>
        </div>
      ) : (
        <div className="columns-1 gap-4 space-y-4 md:columns-2">
          {filtered.map((t) => {
            const clampedRating = Math.max(0, Math.min(5, Math.round(t.rating || 5)));
            const isPlaying = playingId === t.id;
            return (
              <div
                key={t.id}
                className="break-inside-avoid flex flex-col justify-between rounded-2xl border border-[#DCE2EC] bg-white p-5"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          t.status === 'approved'
                            ? 'bg-[#EEF2FF] text-[#2142E7]'
                            : t.status === 'pending'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-[#EEF1F6] text-[#576278]'
                        }`}
                      >
                        {t.status === 'pending' ? 'Needs approval' : t.status}
                      </span>
                      <span className="rounded-md bg-[#F4F6F8] px-2.5 py-0.5 text-xs font-medium text-[#475166]">
                        {SOURCE_LABELS[t.source] ?? t.source.replace(/_/g, ' ')}
                      </span>
                      {t.hasAudio && t.audioUrl && (
                        <button
                          type="button"
                          onClick={() => onTogglePlay(t)}
                          className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition ${
                            isPlaying
                              ? 'bg-[#E63B2E] text-white'
                              : 'bg-[#131722] text-white hover:bg-[#232A3B]'
                          }`}
                        >
                          {isPlaying ? (
                            <Pause className="h-3 w-3 fill-current" />
                          ) : (
                            <Play className="h-3 w-3 fill-current" />
                          )}
                          <span className="tabular-nums">
                            {isPlaying ? 'Playing' : `${t.durationSec ?? 18}s voice`}
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5 text-amber-400" aria-label={`${clampedRating} stars`}>
                      {Array.from({ length: clampedRating }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>

                  {t.pullQuote && (
                    <h4 className="font-display mt-3 text-base font-bold text-[#131722]">
                      “{t.pullQuote}”
                    </h4>
                  )}
                  <p className="mt-1.5 text-sm leading-relaxed text-[#364055]">{t.cleanedText}</p>

                  {t.rawTranscript && t.rawTranscript !== t.cleanedText && (
                    <details className="mt-3 rounded-xl bg-[#F4F6F8] p-2.5 text-xs text-[#4B5568]">
                      <summary className="cursor-pointer font-semibold text-[#131722]">
                        Original spoken words ({t.fillersRemovedCount} fillers removed)
                      </summary>
                      <p className="mt-1.5 leading-relaxed">{t.rawTranscript}</p>
                    </details>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E9F0] pt-3">
                  <div>
                    <div className="text-xs font-bold text-[#131722]">{t.authorName}</div>
                    <div className="text-[11px] text-[#576278]">
                      {[t.authorRole, t.authorCompany].filter(Boolean).join(', ')}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {t.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => onPatchTestimonial(t.id, { status: 'approved' })}
                        className="cursor-pointer rounded-lg bg-[#2142E7] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1935C7]"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onSyndicateClick(t.id)}
                      className="cursor-pointer rounded-lg border border-[#CED6E3] bg-white px-3 py-1.5 text-xs font-bold text-[#131722] hover:bg-[#F4F6F8]"
                    >
                      Share
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete review from ${t.authorName}`}
                      onClick={() => onDelete(t.id)}
                      className="cursor-pointer rounded-lg border border-[#DCE2EC] p-1.5 text-[#6B768C] hover:border-[#F5C2BF] hover:bg-[#FEF2F2] hover:text-[#B91C1C]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
