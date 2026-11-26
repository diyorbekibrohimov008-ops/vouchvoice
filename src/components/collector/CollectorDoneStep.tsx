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
    <div className="rounded-2xl border border-[#DCE2EC] bg-white p-6 text-center shadow-lg sm:p-8">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#EEF2FF] text-[#2142E7]">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h2 className="font-display mt-4 text-2xl font-extrabold text-[#131722]">
        Thank you, {authorName}. Your review is live.
      </h2>
      <p className="mt-2 text-sm text-[#4B5568]">
        Want to help {spaceName} even more? Copy and cross-post your approved text in one tap:
      </p>

      <div className="mt-5 rounded-xl border border-[#E5E9F0] bg-[#F4F6F8] p-4 text-left text-sm text-[#131722]">
        “{editedText}”
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {handoff?.googleMapsUrl && (
          <button
            type="button"
            onClick={() => onCopyAndLaunch('google', handoff.googleMapsUrl!)}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#CED6E3] bg-white px-5 py-3 text-sm font-bold text-[#131722] transition hover:bg-[#F4F6F8]"
          >
            {copiedTarget === 'google' ? (
              <Check className="h-4 w-4 text-[#2142E7]" />
            ) : (
              <Copy className="h-4 w-4 text-[#2142E7]" />
            )}
            <span>Copy and post on Google Maps</span>
            <ExternalLink className="h-3.5 w-3.5 text-[#576278]" />
          </button>
        )}

        {handoff?.productHuntUrl && (
          <button
            type="button"
            onClick={() => onCopyAndLaunch('producthunt', handoff.productHuntUrl!)}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#CED6E3] bg-white px-5 py-3 text-sm font-bold text-[#131722] transition hover:bg-[#F4F6F8]"
          >
            {copiedTarget === 'producthunt' ? (
              <Check className="h-4 w-4 text-[#2142E7]" />
            ) : (
              <Copy className="h-4 w-4 text-[#E63B2E]" />
            )}
            <span>Copy and post on Product Hunt</span>
            <ExternalLink className="h-3.5 w-3.5 text-[#576278]" />
          </button>
        )}
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => onNavigate(`/wall/${slug}`)}
          className="cursor-pointer text-xs font-bold text-[#2142E7] hover:underline"
        >
          View the customer reviews page
        </button>
      </div>
    </div>
  );
}
