import { Sparkles, Upload } from 'lucide-react';

const SAMPLE_SENJA_EXPORT = JSON.stringify(
  [
    {
      customer_name: 'Lukas Meyer',
      role: 'Solo Founder',
      company: 'CronPulse',
      rating: 5,
      text: 'Um, switching off our $49/mo Senja plan to VouchVoice saved us almost $500 a year, and honestly customers actually reply to the 20s voice link.',
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

/** Studio tab for migrating reviews from Senja, Testimonial.to, CSV, or plain text. */
export function StudioImportTab({
  spaceName,
  importText,
  onImportTextChange,
  importing,
  onImport,
}: StudioImportTabProps) {
  return (
    <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">
            Switch from Senja or Testimonial.to in 30 seconds
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Paste JSON or CSV exported from Senja, Testimonial.to, Google reviews, or plain `"Quote" — Name, Role @ Company` lines.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onImportTextChange(SAMPLE_SENJA_EXPORT)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Load Sample Senja JSON</span>
        </button>
      </div>

      <textarea
        rows={10}
        value={importText}
        onChange={(e) => onImportTextChange(e.target.value)}
        placeholder='Paste JSON array, CSV with headers, or lines like: "Saved us 5 hours a week!" — Maya Chen, Founder @ Acme'
        className="font-mono-code mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-800 outline-none focus:border-indigo-500"
      />

      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          disabled={importing || !importText.trim()}
          onClick={onImport}
          className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          <span>{importing ? 'Importing & cleaning…' : `Import into ${spaceName}`}</span>
        </button>
      </div>
    </div>
  );
}
