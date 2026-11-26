import { Upload } from 'lucide-react';

const SAMPLE_SENJA_EXPORT = JSON.stringify(
  [
    {
      customer_name: 'Lukas Meyer',
      role: 'Solo Founder',
      company: 'CronPulse',
      rating: 5,
      text: 'Um, switching off our $49/mo Senja plan to VouchVoice saved us nearly $600 a year, and honestly customers actually reply to the 20s voice link.',
    },
    {
      customer_name: 'Nadia Hassan',
      role: 'Product Designer',
      company: 'StudioFlow',
      rating: 5,
      text: 'I really like that all three of my side projects sit in one workspace with zero per-space fees.',
    },
  ],
  null,
  2
);

interface StudioImportTabProps {
  spaceName: string;
  importText: string;
  onImportTextChange: (value: string) => void;
  importing: boolean;
  onImport: () => void;
}

/** Studio tab for importing existing reviews from Senja, Testimonial.to, CSV, or plain text. */
export function StudioImportTab({
  spaceName,
  importText,
  onImportTextChange,
  importing,
  onImport,
}: StudioImportTabProps) {
  return (
    <div className="mt-6 rounded-2xl border border-[#DCE2EC] bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-extrabold text-[#131722]">
            Import existing reviews
          </h3>
          <p className="mt-1 text-sm text-[#4B5568]">
            Paste reviews exported from Senja, Testimonial.to, Google, a CSV file, or plain lines like `"Great service!" — Alex, Owner @ Sunny Cafe`.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onImportTextChange(SAMPLE_SENJA_EXPORT)}
          className="cursor-pointer rounded-xl border border-[#C9D6FF] bg-[#EEF2FF] px-4 py-2 text-xs font-bold text-[#2142E7] hover:bg-[#E0E7FF]"
        >
          Load sample reviews
        </button>
      </div>

      <textarea
        rows={10}
        value={importText}
        onChange={(e) => onImportTextChange(e.target.value)}
        placeholder='Paste JSON, CSV, or plain lines like: "Saved us 5 hours a week!" — Elena Vance, Founder @ Northstar'
        className="font-mono-code mt-4 w-full rounded-xl border border-[#CED6E3] bg-[#F4F6F8] p-4 text-xs leading-relaxed text-[#131722] focus:border-[#2142E7] focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2142E7]/30"
      />

      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          disabled={importing || !importText.trim()}
          onClick={onImport}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#2142E7] px-6 py-3 text-sm font-bold text-white hover:bg-[#1935C7] disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          <span>{importing ? 'Importing reviews…' : `Import into ${spaceName}`}</span>
        </button>
      </div>
    </div>
  );
}
