import { Copy, Download, ExternalLink, Link2, Mic, Send } from 'lucide-react';
import { buildQuoteCardSvg, downloadTextFile, type TestimonialWithAudio } from '../../lib/api';
import { buildSyndicationDrafts } from '../../../shared/syndication';
import type { SpaceConfig, SyndicationEvent, SyndicationTarget } from '../../../shared/types';

interface StudioSyndicateTabProps {
  space: SpaceConfig;
  origin: string;
  testimonials: TestimonialWithAudio[];
  events: SyndicationEvent[];
  selectedSynId: string;
  onSelectSynId: (id: string) => void;
  googleUrlInput: string;
  onGoogleUrlChange: (v: string) => void;
  phSlugInput: string;
  onPhSlugChange: (v: string) => void;
  webhookInput: string;
  onWebhookChange: (v: string) => void;
  onSaveSettings: () => void;
  onSyndicate: (target: SyndicationTarget) => void;
  onCopyText: (text: string, label: string) => void;
  onOpenCollector: () => void;
}

/** Studio tab for sharing the voice collector link and cross-posting approved reviews. */
export function StudioSyndicateTab({
  space,
  origin,
  testimonials,
  events,
  selectedSynId,
  onSelectSynId,
  googleUrlInput,
  onGoogleUrlChange,
  phSlugInput,
  onPhSlugChange,
  webhookInput,
  onWebhookChange,
  onSaveSettings,
  onSyndicate,
  onCopyText,
  onOpenCollector,
}: StudioSyndicateTabProps) {
  const collectorUrl = `${origin}/collect/${space.slug}`;

  const selectedTestimonial =
    testimonials.find((t) => t.id === selectedSynId) ??
    testimonials.find((t) => t.status === 'approved') ??
    testimonials[0];

  const drafts = selectedTestimonial
    ? buildSyndicationDrafts(selectedTestimonial, space, origin)
    : null;

  return (
    <div className="mt-6 space-y-6">
      {/* Primary Voice Link Card */}
      <div className="rounded-2xl border border-[#C9D6FF] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF2FF] text-[#2142E7]">
              <Link2 className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-base font-extrabold text-[#131722]">
                Your 20-second voice review link
              </h3>
              <p className="mt-0.5 text-xs text-[#4B5568]">
                Send this link by email, text, or receipt. Customers record a quick voice note with no account or camera required.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onCopyText(collectorUrl, 'voice link')}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#2142E7] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#1935C7]"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy voice link</span>
            </button>
            <button
              type="button"
              onClick={onOpenCollector}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#CED6E3] bg-white px-4 py-2.5 text-xs font-bold text-[#131722] hover:bg-[#F4F6F8]"
            >
              <Mic className="h-3.5 w-3.5 text-[#E63B2E]" />
              <span>Test recorder</span>
            </button>
          </div>
        </div>

        <div className="font-mono-code mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#DCE2EC] bg-[#F4F6F8] px-4 py-3 text-xs text-[#364055]">
          <span className="truncate">{collectorUrl}</span>
          <button
            type="button"
            onClick={() => onCopyText(collectorUrl, 'voice link')}
            className="shrink-0 cursor-pointer font-sans text-xs font-bold text-[#2142E7] hover:underline"
          >
            Copy
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-5 lg:col-span-5">
          <div className="rounded-2xl border border-[#DCE2EC] bg-white p-5">
            <h3 className="font-display text-base font-extrabold text-[#131722]">
              After a customer leaves a review
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#576278]">
              Optionally invite happy customers to paste their approved review straight onto Google Maps or Product Hunt with one tap.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#131722]">
                  Google Maps review link (optional)
                </label>
                <input
                  type="url"
                  value={googleUrlInput}
                  onChange={(e) => onGoogleUrlChange(e.target.value)}
                  placeholder="https://g.page/r/your-business/review"
                  className="w-full rounded-xl border border-[#CED6E3] px-3 py-2 text-xs focus:border-[#2142E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2142E7]/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#131722]">
                  Product Hunt page slug (optional)
                </label>
                <input
                  type="text"
                  value={phSlugInput}
                  onChange={(e) => onPhSlugChange(e.target.value)}
                  placeholder="my-product"
                  className="w-full rounded-xl border border-[#CED6E3] px-3 py-2 text-xs focus:border-[#2142E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2142E7]/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#131722]">
                  Notifications URL for Zapier or Slack (optional)
                </label>
                <input
                  type="url"
                  value={webhookInput}
                  onChange={(e) => onWebhookChange(e.target.value)}
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  className="w-full rounded-xl border border-[#CED6E3] px-3 py-2 text-xs focus:border-[#2142E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2142E7]/30"
                />
              </div>
              <button
                type="button"
                onClick={onSaveSettings}
                className="w-full cursor-pointer rounded-xl bg-[#131722] py-2.5 text-xs font-bold text-white hover:bg-[#232A3B]"
              >
                Save links
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#DCE2EC] bg-white p-5">
            <h3 className="font-display text-sm font-extrabold text-[#131722]">Recent sharing activity</h3>
            <div className="mt-3 space-y-2.5">
              {events.length === 0 ? (
                <p className="text-xs text-[#6B768C]">No shared reviews yet.</p>
              ) : (
                events.slice(0, 8).map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-xl border border-[#E5E9F0] bg-[#F4F6F8] px-3 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-[#131722]">
                      <span className="capitalize">{ev.target.replace('_', ' ')}</span>
                      <span className={ev.status === 'failed' ? 'text-[#B91C1C]' : 'text-[#2142E7]'}>
                        {ev.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[#576278]">{ev.detail}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-[#DCE2EC] bg-white p-5 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E9F0] pb-4">
            <div>
              <h3 className="font-display text-base font-extrabold text-[#131722]">
                Turn a review into a social post
              </h3>
              <p className="text-xs text-[#576278]">
                Download a ready-to-share quote image or copy post text for LinkedIn and X.
              </p>
            </div>

            {testimonials.length > 0 && (
              <select
                value={selectedTestimonial?.id ?? ''}
                onChange={(e) => onSelectSynId(e.target.value)}
                className="rounded-xl border border-[#CED6E3] bg-[#F4F6F8] px-3 py-2 text-xs font-bold text-[#131722]"
              >
                {testimonials.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.authorName} — {t.pullQuote.slice(0, 36)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedTestimonial && drafts ? (
            <div className="mt-4 space-y-4">
              <div className="overflow-hidden rounded-xl border border-[#DCE2EC] bg-[#F4F6F8]">
                <img
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(
                    buildQuoteCardSvg(selectedTestimonial, space)
                  )}`}
                  alt={`Quote card graphic for ${selectedTestimonial.authorName}`}
                  className="block h-auto w-full"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadTextFile(
                      `${space.slug}-${selectedTestimonial.authorName.toLowerCase().replace(/\s+/g, '-')}-card.svg`,
                      buildQuoteCardSvg(selectedTestimonial, space),
                      'image/svg+xml'
                    )
                  }
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#CED6E3] bg-white px-3.5 py-2 text-xs font-bold text-[#131722] hover:bg-[#F4F6F8]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download quote image</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSyndicate('linkedin')}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0A66C2] px-4 py-2 text-xs font-bold text-white hover:opacity-95"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Share to LinkedIn</span>
                  <ExternalLink className="h-3 w-3" />
                </button>

                <button
                  type="button"
                  onClick={() => onSyndicate('x')}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#131722] px-4 py-2 text-xs font-bold text-white hover:bg-[#232A3B]"
                >
                  <span>Post to X</span>
                  <ExternalLink className="h-3 w-3" />
                </button>

                <button
                  type="button"
                  onClick={() => onSyndicate('google_maps')}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#CED6E3] bg-white px-3.5 py-2 text-xs font-bold text-[#364055] hover:bg-[#F4F6F8]"
                >
                  <span>Google Maps</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSyndicate('product_hunt')}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#CED6E3] bg-white px-3.5 py-2 text-xs font-bold text-[#364055] hover:bg-[#F4F6F8]"
                >
                  <span>Product Hunt</span>
                </button>

                {space.webhookUrl && (
                  <button
                    type="button"
                    onClick={() => onSyndicate('webhook')}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#C9D6FF] bg-[#EEF2FF] px-3.5 py-2 text-xs font-bold text-[#2142E7] hover:bg-[#E0E7FF]"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send notification</span>
                  </button>
                )}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-xs font-bold text-[#131722]">
                  <span>Ready-to-paste social post</span>
                  <button
                    type="button"
                    onClick={() => onCopyText(drafts.linkedinPost, 'social post')}
                    className="cursor-pointer font-bold text-[#2142E7] hover:underline"
                  >
                    Copy text
                  </button>
                </div>
                <pre className="whitespace-pre-wrap rounded-xl border border-[#DCE2EC] bg-[#F4F6F8] p-3.5 font-sans text-xs leading-relaxed text-[#364055]">
                  {drafts.linkedinPost}
                </pre>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#576278]">
              Once you have a review in {space.name}, you can generate a quote graphic and social post here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
