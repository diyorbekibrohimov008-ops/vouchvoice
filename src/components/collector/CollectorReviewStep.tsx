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
      className="rounded-2xl border border-[#DCE2EC] bg-white p-5 shadow-lg shadow-[#131722]/5 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E9F0] pb-4">
        <div>
          <h2 className="font-display text-xl font-extrabold text-[#131722]">
            Review and approve
          </h2>
          <p className="text-xs text-[#576278]">
            {analysis?.fillersRemovedCount
              ? `Removed ${analysis.fillersRemovedCount} filler words while keeping your natural phrasing.`
              : 'Ready for a quick check before publishing.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer text-xs font-bold text-[#2142E7] hover:underline"
        >
          Back to recorder
        </button>
      </div>

      {analysis && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg bg-[#EEF1F6] p-1">
            {(['authentic', 'crisp', 'results'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onToneChange(t)}
                className={`cursor-pointer rounded-md px-3 py-1 text-xs font-bold capitalize transition ${
                  selectedTone === t ? 'bg-[#131722] text-white' : 'text-[#4B5568]'
                }`}
              >
                {t === 'results' ? 'Results-led' : t}
              </button>
            ))}
          </div>
          {analysis.outcomeMetric && (
            <span className="rounded-md bg-[#EEF2FF] px-3 py-1 text-xs font-bold text-[#2142E7]">
              Key result: {analysis.outcomeMetric}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 space-y-3.5">
        <div>
          <label className="mb-1 block text-xs font-bold text-[#131722]">Headline pull quote</label>
          <input
            type="text"
            value={pullQuote}
            onChange={(e) => onPullQuoteChange(e.target.value)}
            className="w-full rounded-xl border border-[#CED6E3] px-3.5 py-2 text-sm font-semibold text-[#131722] focus:border-[#2142E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2142E7]/30"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-[#131722]">Cleaned review</label>
          <textarea
            rows={4}
            required
            value={editedText}
            onChange={(e) => onEditedTextChange(e.target.value)}
            className="w-full rounded-xl border border-[#CED6E3] p-3.5 text-sm leading-relaxed text-[#131722] focus:border-[#2142E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2142E7]/30"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-[#131722]">Your rating</label>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`Rate ${n} stars`}
                onClick={() => onRatingChange(n)}
                className="cursor-pointer p-0.5"
              >
                <Star
                  className={`h-6 w-6 ${
                    n <= rating ? 'fill-amber-400 text-amber-400' : 'text-[#CED6E3]'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-[#131722]">Your name *</label>
            <input
              type="text"
              required
              value={authorName}
              onChange={(e) => onAuthorNameChange(e.target.value)}
              placeholder="Sam Patel"
              className="w-full rounded-xl border border-[#CED6E3] px-3 py-2 text-sm focus:border-[#2142E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2142E7]/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-[#131722]">Role</label>
            <input
              type="text"
              value={authorRole}
              onChange={(e) => onAuthorRoleChange(e.target.value)}
              placeholder="Founder"
              className="w-full rounded-xl border border-[#CED6E3] px-3 py-2 text-sm focus:border-[#2142E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2142E7]/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-[#131722]">Company</label>
            <input
              type="text"
              value={authorCompany}
              onChange={(e) => onAuthorCompanyChange(e.target.value)}
              placeholder="Northstar Co"
              className="w-full rounded-xl border border-[#CED6E3] px-3 py-2 text-sm focus:border-[#2142E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2142E7]/30"
            />
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-3 rounded-xl bg-[#FEF2F2] px-3.5 py-2.5 text-xs font-medium text-[#B91C1C]">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2142E7] py-3.5 text-sm font-bold text-white transition hover:bg-[#1935C7] disabled:opacity-60"
      >
        <CheckCircle2 className="h-4.5 w-4.5" />
        <span>{submitting ? 'Publishing…' : 'Approve and publish review'}</span>
      </button>
    </form>
  );
}
