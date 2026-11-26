import { Code2, Copy, Download, LayoutGrid } from 'lucide-react';
import type { TestimonialWithAudio } from '../../lib/api';
import { WallPreview } from '../WallPreview';
import type { SpaceConfig, WallLayout, WallTheme } from '../../../shared/types';

interface StudioWallTabProps {
  space: SpaceConfig;
  testimonials: TestimonialWithAudio[];
  origin: string;
  embedType: 'script' | 'iframe' | 'react';
  onEmbedTypeChange: (type: 'script' | 'iframe' | 'react') => void;
  onPatchSpace: (patch: Partial<SpaceConfig>) => void;
  onCopyText: (text: string, label: string) => void;
  onCollectClick: () => void;
}

/** Studio tab for customizing the website review widget and copying the embed code. */
export function StudioWallTab({
  space,
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
  const reactSnippet = `export function CustomerReviews() {\n  return (\n    <iframe\n      src="${origin}/wall/${space.slug}?embed=1"\n      className="w-full min-h-[620px] border-0"\n      title="${space.name} Customer Reviews"\n    />\n  );\n}`;

  const activeSnippet =
    embedType === 'script'
      ? scriptSnippet
      : embedType === 'iframe'
      ? iframeSnippet
      : reactSnippet;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-12">
      <div className="min-w-0 space-y-4 rounded-2xl border border-[#DCE2EC] bg-white p-5 lg:col-span-4">
        <h3 className="font-display flex items-center gap-2 text-base font-extrabold text-[#131722]">
          <LayoutGrid className="h-4 w-4 text-[#2142E7]" />
          <span>Website widget style</span>
        </h3>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-[#131722]">Layout</label>
          <div className="grid grid-cols-2 gap-2">
            {(['masonry', 'grid', 'marquee', 'spotlight', 'badge'] as WallLayout[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => onPatchSpace({ layout: l })}
                className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold capitalize transition ${
                  space.layout === l
                    ? 'border-[#2142E7] bg-[#EEF2FF] text-[#2142E7]'
                    : 'border-[#DCE2EC] text-[#475166] hover:bg-[#F4F6F8]'
                }`}
              >
                {l === 'badge' ? 'Rating pill' : l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-[#131722]">Color theme</label>
          <div className="grid grid-cols-2 gap-2">
            {(['paper', 'midnight', 'cream', 'indigo'] as WallTheme[]).map((th) => (
              <button
                key={th}
                type="button"
                onClick={() => onPatchSpace({ theme: th })}
                className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold capitalize transition ${
                  space.theme === th
                    ? 'border-[#2142E7] bg-[#EEF2FF] text-[#2142E7]'
                    : 'border-[#DCE2EC] text-[#475166] hover:bg-[#F4F6F8]'
                }`}
              >
                {th === 'indigo' ? 'Cobalt' : th}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-[#131722]">Brand accent</label>
            <input
              type="color"
              value={space.brandColor}
              onChange={(e) => onPatchSpace({ brandColor: e.target.value })}
              className="h-10 w-full cursor-pointer rounded-xl border border-[#CED6E3] p-1"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-[#131722]">Card corners</label>
            <select
              value={space.cardRadius}
              onChange={(e) =>
                onPatchSpace({ cardRadius: e.target.value as SpaceConfig['cardRadius'] })
              }
              className="h-10 w-full rounded-xl border border-[#CED6E3] px-2.5 text-xs font-semibold"
            >
              <option value="sharp">Sharp</option>
              <option value="soft">Soft</option>
              <option value="pill">Rounded</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 border-t border-[#E5E9F0] pt-3 text-xs">
          {(
            [
              ['showRatings', 'Show star ratings'],
              ['showVoiceBadge', 'Show playable voice button'],
              ['showMetrics', 'Show highlight badges'],
              ['showCompany', 'Show company name'],
              ['hidePoweredBy', 'Hide VouchVoice branding'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center justify-between py-1">
              <span className="font-medium text-[#364055]">{label}</span>
              <input
                type="checkbox"
                checked={Boolean(space[key])}
                onChange={(e) => onPatchSpace({ [key]: e.target.checked })}
                className="h-4 w-4 cursor-pointer accent-[#2142E7]"
              />
            </label>
          ))}
        </div>

        <div className="border-t border-[#E5E9F0] pt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-extrabold text-[#131722]">
              <Code2 className="h-4 w-4 text-[#2142E7]" />
              <span>Copy the widget code</span>
            </span>
            <div className="flex gap-1 text-[11px]">
              {(['script', 'iframe', 'react'] as const).map((et) => (
                <button
                  key={et}
                  type="button"
                  onClick={() => onEmbedTypeChange(et)}
                  className={`cursor-pointer rounded-md px-2 py-0.5 font-bold capitalize ${
                    embedType === et ? 'bg-[#131722] text-white' : 'bg-[#EEF1F6] text-[#475166]'
                  }`}
                >
                  {et}
                </button>
              ))}
            </div>
          </div>

          <p className="mb-2 text-[11px] text-[#576278]">
            Paste this into WordPress, Squarespace, Wix, Webflow, Shopify, or any HTML page.
          </p>

          <pre className="font-mono-code overflow-x-auto rounded-xl bg-[#131722] p-3 text-[11px] leading-relaxed text-[#9CE5C4]">
            {activeSnippet}
          </pre>

          <div className="mt-2.5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onCopyText(activeSnippet, 'widget code')}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#2142E7] py-2.5 text-xs font-bold text-white hover:bg-[#1935C7]"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy the widget code</span>
            </button>

            <a
              href={`/api/public/walls/${encodeURIComponent(space.slug)}/export`}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#CED6E3] bg-[#F4F6F8] py-2.5 text-xs font-bold text-[#131722] hover:bg-[#E5E9F0]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download standalone HTML file</span>
            </a>
          </div>
        </div>
      </div>

      <div className="min-w-0 lg:col-span-8">
        <WallPreview
          space={space}
          testimonials={testimonials}
          onCollectClick={onCollectClick}
        />
      </div>
    </div>
  );
}
