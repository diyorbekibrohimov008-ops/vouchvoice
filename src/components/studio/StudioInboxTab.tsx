import { Pause, Play, Star, Trash2 } from 'lucide-react';
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

/** Studio tab for reviewing, filtering, playing, approving, and managing testimonials. */
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
              className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold capitalize transition ${
                statusFilter === f
                  ? 'bg-teal-700 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f === 'voice' ? 'Voice-Verified' : f}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500">
          {loading ? 'Refreshing…' : `${filtered.length} showing`}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((t) => (
          <div
            key={t.id}
            className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                      t.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700'
                        : t.status === 'pending'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {t.status}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                    {t.source.replace(/_/g, ' ')}
                  </span>
                  {t.hasAudio && t.audioUrl && (
                    <button
                      type="button"
                      onClick={() => onTogglePlay(t)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-800 hover:bg-teal-100"
                    >
                      {playingId === t.id ? (
                        <Pause className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      <span>{playingId === t.id ? 'Playing' : `${t.durationSec ?? 18}s voice`}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-0.5 text-amber-400">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>

              {t.pullQuote && (
                <h4 className="mt-3 text-sm font-bold text-slate-900">“{t.pullQuote}”</h4>
              )}
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{t.cleanedText}</p>

              {t.rawTranscript && t.rawTranscript !== t.cleanedText && (
                <details className="mt-3 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-500">
                  <summary className="cursor-pointer font-semibold text-slate-600">
                    Compare raw spoken transcript ({t.fillersRemovedCount} fillers removed)
                  </summary>
                  <p className="mt-1.5 leading-relaxed">{t.rawTranscript}</p>
                </details>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <div>
                <div className="text-xs font-bold text-slate-900">{t.authorName}</div>
                <div className="text-[11px] text-slate-500">
                  {[t.authorRole, t.authorCompany].filter(Boolean).join(' · ')}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {t.status !== 'approved' && (
                  <button
                    type="button"
                    onClick={() => onPatchTestimonial(t.id, { status: 'approved' })}
                    className="cursor-pointer rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSyndicateClick(t.id)}
                  className="cursor-pointer rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-100"
                >
                  Syndicate →
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(t.id)}
                  className="cursor-pointer rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
