import { Download, ExternalLink, Send } from 'lucide-react';
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
}

/** Studio tab for configuring two-way syndication destinations and pushing approved reviews. */
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
}: StudioSyndicateTabProps) {
  const selectedTestimonial =
    testimonials.find((t) => t.id === selectedSynId) ??
    testimonials.find((t) => t.status === 'approved') ??
    testimonials[0];

  const drafts = selectedTestimonial
    ? buildSyndicationDrafts(selectedTestimonial, space, origin)
    : null;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-12">
      <div className="space-y-5 lg:col-span-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-extrabold text-slate-900">Syndication Destinations</h3>
          <p className="mt-1 text-xs text-slate-500">
            Customers get 1-tap copy & deep-links to Google Maps and Product Hunt right after approving their voice note. Configure your webhook for automatic JSON pushes.
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Google Maps Review / Place URL
              </label>
              <input
                type="url"
                value={googleUrlInput}
                onChange={(e) => onGoogleUrlChange(e.target.value)}
                placeholder="https://g.page/r/your-place/review"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Product Hunt Product Slug
              </label>
              <input
                type="text"
                value={phSlugInput}
                onChange={(e) => onPhSlugChange(e.target.value)}
                placeholder="pulsedeck-ai"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Auto-Push Webhook URL (Zapier / Make / LinkedIn / Slack)
              </label>
              <input
                type="url"
                value={webhookInput}
                onChange={(e) => onWebhookChange(e.target.value)}
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="button"
              onClick={onSaveSettings}
              className="w-full cursor-pointer rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
            >
              Save Syndication Settings
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-slate-900">Syndication Activity Log</h3>
          <div className="mt-3 space-y-2.5">
            {events.length === 0 ? (
              <p className="text-xs text-slate-400">No syndications pushed yet.</p>
            ) : (
              events.slice(0, 8).map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span className="uppercase">{ev.target.replace('_', ' ')}</span>
                    <span className={ev.status === 'failed' ? 'text-rose-600' : 'text-emerald-600'}>
                      {ev.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-slate-500">{ev.detail}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Push Approved Review to Social & Platforms
            </h3>
            <p className="text-xs text-slate-500">
              Auto-formats founder posts + generates a crisp 1200×630 quote graphic.
            </p>
          </div>

          <select
            value={selectedSynId}
            onChange={(e) => onSelectSynId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900"
          >
            {testimonials.map((t) => (
              <option key={t.id} value={t.id}>
                {t.authorName} — {t.pullQuote.slice(0, 36)}
              </option>
            ))}
          </select>
        </div>

        {selectedTestimonial && drafts && (
          <div className="mt-4 space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <div
                className="w-full [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{
                  __html: buildQuoteCardSvg(selectedTestimonial, space),
                }}
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
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Quote Graphic (.svg)</span>
              </button>

              <button
                type="button"
                onClick={() => onSyndicate('linkedin')}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0A66C2] px-4 py-2 text-xs font-bold text-white hover:opacity-95"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Copy & Post to LinkedIn</span>
                <ExternalLink className="h-3 w-3" />
              </button>

              <button
                type="button"
                onClick={() => onSyndicate('x')}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                <span>Post to X</span>
                <ExternalLink className="h-3 w-3" />
              </button>

              <button
                type="button"
                onClick={() => onSyndicate('google_maps')}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <span>Google Maps Handoff</span>
              </button>

              <button
                type="button"
                onClick={() => onSyndicate('product_hunt')}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2 text-xs font-bold text-orange-800 hover:bg-orange-100"
              >
                <span>Product Hunt Handoff</span>
              </button>

              <button
                type="button"
                onClick={() => onSyndicate('webhook')}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Fire Webhook</span>
              </button>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Auto-Generated LinkedIn Post Copy</span>
                <button
                  type="button"
                  onClick={() => onCopyText(drafts.linkedinPost, 'LinkedIn draft')}
                  className="cursor-pointer text-indigo-600 hover:underline"
                >
                  Copy text
                </button>
              </div>
              <pre className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-3.5 font-sans text-xs leading-relaxed text-slate-700">
                {drafts.linkedinPost}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
