import { CheckCircle2, Star } from 'lucide-react';
import type { ReviewTone, TranscriptAnalysis } from '../../../shared/types';

interface CollectorReviewStepProps {
  analysis: TranscriptAnalysis | null;
  selectedTone: ReviewTone;
  onToneChange: (tone: ReviewTone) => void;
  pullQuote: string;
  onPullQuoteChange: (value: string) => void;
  editedText: string;
  onEditedTextChange: (value: string) => void;
  rating: number;
  onRatingChange: (value: number) => void;
  authorName: string;
  onAuthorNameChange: (value: string) => void;
  authorRole: string;
  onAuthorRoleChange: (value: string) => void;
  authorCompany: string;
  onAuthorCompanyChange: (value: string) => void;
  error: string | null;
  submitting: boolean;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

/** Step 2 of the collector flow: pick tone, tweak the cleaned quote, and approve in one tap. */
export function CollectorReviewStep({
  analysis,
  selectedTone,
  onToneChange,
  pullQuote,
  onPullQuoteChange,
  editedText,
  onEditedTextChange,
  rating,
  onRatingChange,
  authorName,
  onAuthorNameChange,
  authorRole,
  onAuthorRoleChange,
  authorCompany,
  onAuthorCompanyChange,
  error,
  submitting,
  onBack,
  onSubmit,
}: CollectorReviewStepProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Review & Approve in One Tap
          </h2>
          <p className="text-xs text-slate-500">
            {analysis?.fillersRemovedCount
              ? `Stripped ${analysis.fillersRemovedCount} verbal fillers while keeping your real voice.`
              : 'Structured into a ready-to-publish review.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer text-xs font-bold text-indigo-600 hover:underline"
        >
          ← Back to voice
        </button>
      </div>

      {analysis && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-full bg-slate-100 p-1">
            {(['authentic', 'crisp', 'results'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onToneChange(t)}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold capitalize transition ${
                  selectedTone === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {t === 'results' ? 'Results-Led' : t}
              </button>
            ))}
          </div>
          {analysis.outcomeMetric && (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              Metric: {analysis.outcomeMetric}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">Headline Pull Quote</label>
          <input
            type="text"
            value={pullQuote}
            onChange={(e) => onPullQuoteChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">Polished Review</label>
          <textarea
            rows={4}
            required
            value={editedText}
            onChange={(e) => onEditedTextChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 p-3.5 text-sm leading-relaxed text-slate-800 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-700">Your Rating</label>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onRatingChange(n)}
                className="cursor-pointer p-0.5"
              >
                <Star
                  className={`h-6 w-6 ${
                    n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Your Name *</label>
            <input
              type="text"
              required
              value={authorName}
              onChange={(e) => onAuthorNameChange(e.target.value)}
              placeholder="Sam Chen"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Role</label>
            <input
              type="text"
              value={authorRole}
              onChange={(e) => onAuthorRoleChange(e.target.value)}
              placeholder="Founder"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Company</label>
            <input
              type="text"
              value={authorCompany}
              onChange={(e) => onAuthorCompanyChange(e.target.value)}
              placeholder="Acme Co"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-60"
      >
        <CheckCircle2 className="h-4.5 w-4.5" />
        <span>{submitting ? 'Publishing…' : 'Approve & Publish in One Tap'}</span>
      </button>
    </form>
  );
}
