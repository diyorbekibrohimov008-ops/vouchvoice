import { useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { Workspace } from '../../../shared/types';

interface NewSpaceModalProps {
  open: boolean;
  name: string;
  tagline: string;
  color: string;
  onNameChange: (v: string) => void;
  onTaglineChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

/** Modal for creating an additional brand space at $0 extra cost. */
export function NewSpaceModal({
  open,
  name,
  tagline,
  color,
  onNameChange,
  onTaglineChange,
  onColorChange,
  onClose,
  onSubmit,
}: NewSpaceModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 grid place-items-center bg-[#131722]/55 p-4 backdrop-blur-sm"
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md overscroll-contain rounded-2xl border border-[#DCE2EC] bg-white p-6 shadow-2xl"
      >
        <h3 className="font-display text-xl font-extrabold text-[#131722]">
          Add another brand space
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-[#576278]">
          Manage as many businesses or products as you like from one studio at $0 extra.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-[#131722]">Business or product name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Sunny Bakery"
              className="w-full rounded-xl border border-[#CED6E3] px-3.5 py-2.5 text-sm focus:border-[#2142E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2142E7]/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-[#131722]">Short message for customers</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => onTaglineChange(e.target.value)}
              placeholder="Tell us what you loved in a quick 20-second voice note."
              className="w-full rounded-xl border border-[#CED6E3] px-3.5 py-2.5 text-sm focus:border-[#2142E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2142E7]/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-[#131722]">Brand accent color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className="h-10 w-full cursor-pointer rounded-xl border border-[#CED6E3] p-1"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl px-4 py-2 text-xs font-bold text-[#4B5568] hover:bg-[#EEF1F6]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="cursor-pointer rounded-xl bg-[#2142E7] px-4 py-2 text-xs font-bold text-white hover:bg-[#1935C7]"
          >
            Add brand space
          </button>
        </div>
      </form>
    </div>
  );
}

interface PlanSettingsModalProps {
  open: boolean;
  workspace: Workspace;
  customAiKey: string;
  onCustomAiKeyChange: (v: string) => void;
  onSaveAiKey: () => void;
  onClose: () => void;
}

const UNLOCKED_ITEMS = [
  'Unlimited brand spaces and review links',
  'Unlimited voice and text reviews',
  'Hide VouchVoice branding on your website widget',
  'Standalone self-hosted HTML export',
  'Import and share reviews with no limits',
];

/** Modal showing 100% Free Forever status and neatly tucked Optional AI settings. */
export function PlanSettingsModal({
  open,
  workspace,
  customAiKey,
  onCustomAiKeyChange,
  onSaveAiKey,
  onClose,
}: PlanSettingsModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 grid place-items-center bg-[#131722]/55 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-[#DCE2EC] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-extrabold text-[#131722]">
              Studio settings
            </h3>
            <p className="mt-0.5 text-xs text-[#576278]">
              {workspace.name}
            </p>
          </div>
          <span className="rounded-md bg-[#EEF2FF] px-2.5 py-1 text-xs font-bold text-[#2142E7]">
            Free forever ($0)
          </span>
        </div>

        <div className="mt-4 rounded-xl border border-[#DCE2EC] bg-[#F4F6F8] p-4">
          <div className="text-sm font-bold text-[#131722]">
            Everything is unlocked at $0
          </div>
          <p className="mt-1 text-xs text-[#4B5568]">
            No trials, no paywalls, and no credit card needed:
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-[#364055]">
            {UNLOCKED_ITEMS.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 shrink-0 text-[#2142E7]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <details
          open={workspace.hasCustomAiKey}
          className="mt-4 rounded-xl border border-[#DCE2EC] bg-white p-4"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-bold text-[#131722]">
            <span>Optional AI settings</span>
            <ChevronDown className="h-4 w-4 text-[#576278]" />
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-[#576278]">
            VouchVoice includes a built-in zero-cost text cleaner that works out of the box. If you prefer OpenAI Whisper and GPT-4o-mini, add your own API key here.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="password"
              value={customAiKey}
              onChange={(e) => onCustomAiKeyChange(e.target.value)}
              placeholder={workspace.hasCustomAiKey ? 'OpenAI key saved (enter new to replace)' : 'sk-... (optional)'}
              className="flex-1 rounded-xl border border-[#CED6E3] bg-[#F4F6F8] px-3 py-2 text-xs focus:border-[#2142E7] focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2142E7]/30"
            />
            <button
              type="button"
              onClick={onSaveAiKey}
              className="cursor-pointer rounded-xl bg-[#131722] px-4 py-2 text-xs font-bold text-white hover:bg-[#232A3B]"
            >
              Save
            </button>
          </div>
          {workspace.hasCustomAiKey && (
            <p className="mt-2 text-[11px] font-medium text-[#2142E7]">
              Custom OpenAI key active. Save an empty field to switch back to the built-in cleaner.
            </p>
          )}
        </details>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl bg-[#EEF1F6] px-4 py-2 text-xs font-bold text-[#131722] hover:bg-[#DCE2EC]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
