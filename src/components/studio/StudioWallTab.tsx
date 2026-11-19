import { Code2, Copy, Download, LayoutGrid } from 'lucide-react';
import type { TestimonialWithAudio } from '../../lib/api';
import { WallPreview } from '../WallPreview';
import type { PlanTier, SpaceConfig, WallLayout, WallTheme } from '../../../shared/types';

interface StudioWallTabProps {
  space: SpaceConfig;
  workspacePlan: PlanTier;
  testimonials: TestimonialWithAudio[];
  origin: string;
  embedType: 'script' | 'iframe' | 'react';
  onEmbedTypeChange: (type: 'script' | 'iframe' | 'react') => void;
  onPatchSpace: (patch: Partial<SpaceConfig>) => void;
  onCopyText: (text: string, label: string) => void;
  onCollectClick: () => void;
}

/** Studio tab for customizing Wall of Love themes, layouts, and copyable embed snippets. */
export function StudioWallTab({
  space,
  workspacePlan,
  testimonials,
  origin,
  embedType,
  onEmbedTypeChange,
  onPatchSpace,
  onCopyText,
  onCollectClick,
}: StudioWallTabProps) {
  const scriptSnippet = `<div data-vouch-wall="${space.slug}"></div>\n<script src="${origin}/embed.js" async></script>`;
  const iframeSnippet = `<iframe src="${origin}/wall/${space.slug}?embed=1" style="width:100%;min-height:620px;border:0;" loading="lazy"></iframe>`;
  const reactSnippet = `export function WallOfLove() {\n  return (\n    <iframe\n      src="${origin}/wall/${space.slug}?embed=1"\n      className="w-full min-h-[620px] border-0"\n      title="${space.name} Testimonials"\n    />\n  );\n}`;

  const activeSnippet =
    embedType === 'script'
      ? scriptSnippet
      : embedType === 'iframe'
      ? iframeSnippet
      : reactSnippet;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-12">
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
          <LayoutGrid className="h-4 w-4 text-teal-700" />
          <span>Widget Design</span>
        </h3>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-700">Layout</label>
          <div className="grid grid-cols-2 gap-2">
            {(['masonry', 'grid', 'marquee', 'spotlight', 'badge'] as WallLayout[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => onPatchSpace({ layout: l })}
                className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold capitalize ${
                  space.layout === l
                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {l === 'badge' ? 'Floating Pill' : l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-700">Theme</label>
          <div className="grid grid-cols-2 gap-2">
            {(['paper', 'midnight', 'cream', 'indigo'] as WallTheme[]).map((th) => (
              <button
                key={th}
                type="button"
                onClick={() => onPatchSpace({ theme: th })}
                className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold capitalize ${
                  space.theme === th
                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {th === 'indigo' ? 'oceanic' : th}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Brand Accent</label>
            <input
              type="color"
              value={space.brandColor}
              onChange={(e) => onPatchSpace({ brandColor: e.target.value })}
              className="h-10 w-full cursor-pointer rounded-xl border border-slate-200 p-1"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Card Corners</label>
            <select
              value={space.cardRadius}
              onChange={(e) =>
                onPatchSpace({ cardRadius: e.target.value as SpaceConfig['cardRadius'] })
              }
              className="h-10 w-full rounded-xl border border-slate-200 px-2.5 text-xs font-semibold"
            >
              <option value="sharp">Sharp</option>
              <option value="soft">Soft</option>
              <option value="pill">Pill</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
          {(
            [
              ['showRatings', 'Show star ratings'],
              ['showVoiceBadge', 'Show playable voice pill'],
              ['showMetrics', 'Show outcome metric badges'],
              ['showCompany', 'Show company name'],
              ['hidePoweredBy', 'Hide VouchVoice branding ($9/mo or Lifetime)'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center justify-between py-1">
              <span className="font-medium text-slate-700">{label}</span>
              <input
                type="checkbox"
                checked={Boolean(space[key])}
                disabled={key === 'hidePoweredBy' && workspacePlan === 'free'}
                onChange={(e) => onPatchSpace({ [key]: e.target.checked })}
                className="h-4 w-4 accent-teal-700"
              />
            </label>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
              <Code2 className="h-4 w-4 text-teal-700" />
              <span>Embed Anywhere</span>
            </span>
            <div className="flex gap-1 text-[11px]">
              {(['script', 'iframe', 'react'] as const).map((et) => (
                <button
                  key={et}
                  type="button"
                  onClick={() => onEmbedTypeChange(et)}
                  className={`cursor-pointer rounded-lg px-2 py-0.5 font-bold uppercase ${
                    embedType === et ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {et}
                </button>
              ))}
            </div>
          </div>

          <pre className="font-mono-code overflow-x-auto rounded-2xl bg-slate-950 p-3 text-[11px] leading-relaxed text-emerald-300">
            {activeSnippet}
          </pre>

          <div className="mt-2.5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onCopyText(activeSnippet, 'embed snippet')}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-teal-700 py-2 text-xs font-bold text-white hover:bg-teal-800"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Embed Code</span>
            </button>

            <a
              href={`/api/public/walls/${encodeURIComponent(space.slug)}/export`}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Self-Hosted Lifetime HTML</span>
            </a>
          </div>
        </div>
      </div>

      <div className="lg:col-span-8">
        <WallPreview
          space={space}
          testimonials={testimonials}
          onCollectClick={onCollectClick}
        />
      </div>
    </div>
  );
}
