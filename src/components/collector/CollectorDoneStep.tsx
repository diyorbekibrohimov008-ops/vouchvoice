import { Check, CheckCircle2, Copy, ExternalLink } from 'lucide-react';

interface CollectorDoneStepProps {
  slug: string;
  spaceName: string;
  authorName: string;
  editedText: string;
  handoff: {
    googleMapsUrl: string | null;
    productHuntUrl: string | null;
  } | null;
  copiedTarget: string | null;
  onCopyAndLaunch: (target: 'google' | 'producthunt', url: string) => void;
  onNavigate: (path: string) => void;
}

/** Step 3 of the collector flow: post-approval confirmation and one-tap cross-post handoff. */
export function CollectorDoneStep({
  slug,
  spaceName,
  authorName,
  editedText,
  handoff,
  copiedTarget,
  onCopyAndLaunch,
  onNavigate,
}: CollectorDoneStepProps) {
  return (
    <div className="rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-lg sm:p-8">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h2 className="mt-4 text-2xl font-extrabold text-slate-900">
        Thank you, {authorName}! Your review is live.
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Want to help {spaceName} even more? We copied your approved text—cross-post in one tap with zero re-typing:
      </p>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700">
        “{editedText}”
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {handoff?.googleMapsUrl && (
          <button
            type="button"
            onClick={() => onCopyAndLaunch('google', handoff.googleMapsUrl!)}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            {copiedTarget === 'google' ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4 text-teal-700" />
            )}
            <span>Copy & Post on Google Maps</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </button>
        )}

        {handoff?.productHuntUrl && (
          <button
            type="button"
            onClick={() => onCopyAndLaunch('producthunt', handoff.productHuntUrl!)}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-bold text-orange-900 transition hover:bg-orange-100"
          >
            {copiedTarget === 'producthunt' ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4 text-orange-600" />
            )}
            <span>Copy & Post on Product Hunt</span>
            <ExternalLink className="h-3.5 w-3.5 text-orange-500" />
          </button>
        )}
      </div>

      <div className="mt-6 flex items-center justify-center gap-4 text-xs font-bold">
        <button
          type="button"
          onClick={() => onNavigate(`/wall/${slug}`)}
          className="cursor-pointer text-teal-700 hover:underline"
        >
          See your review on the Wall of Love →
        </button>
      </div>
    </div>
  );
}
