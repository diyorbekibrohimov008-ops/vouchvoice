import { Check } from 'lucide-react';
import type { PlanTier, Workspace } from '../../../shared/types';

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
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md overscroll-contain rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <h3 className="text-lg font-extrabold text-slate-900">
          Add a Brand Space ($0 Extra)
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Unlike Senja’s per-space pricing, VouchVoice lets you manage unlimited brands from one workspace.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Brand Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="InvoiceBot"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Collector Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => onTaglineChange(e.target.value)}
              placeholder="Share a 20-second voice note on how InvoiceBot helped you."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Accent Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className="h-10 w-full cursor-pointer rounded-xl border border-slate-200 p-1"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="cursor-pointer rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white hover:bg-teal-800"
          >
            Create Brand Space
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
  onSelectPlan: (plan: PlanTier) => void;
  onSaveAiKey: () => void;
  onClose: () => void;
}

/** Modal for switching workspace billing tier or configuring optional BYOK OpenAI key. */
export function PlanSettingsModal({
  open,
  workspace,
  customAiKey,
  onCustomAiKeyChange,
  onSelectPlan,
  onSaveAiKey,
  onClose,
}: PlanSettingsModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-extrabold text-slate-900">
          Workspace Plan, Lifetime License & AI Engine
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Active plan: <strong>{workspace.plan}</strong>
          {workspace.licenseKey ? ` · License Key: ${workspace.licenseKey}` : ''}
        </p>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          {(
            [
              ['free', 'Free Starter', '$0'],
              ['maintenance_9', 'Maintenance', '$9/mo'],
              ['lifetime_79', 'Lifetime Embed', '$79 once'],
            ] as const
          ).map(([id, title, price]) => (
            <button
              key={id}
              type="button"
              onClick={() => onSelectPlan(id)}
              className={`cursor-pointer rounded-2xl border p-3 text-left transition ${
                workspace.plan === id
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>{title}</span>
                {workspace.plan === id && <Check className="h-4 w-4 text-teal-700" />}
              </div>
              <div className="mt-1 text-base font-extrabold text-teal-800">{price}</div>
            </button>
          ))}
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <label className="mb-1 block text-xs font-bold text-slate-700">
            Optional OpenAI API Key (BYOK for Whisper + GPT-4o-mini cleanup)
          </label>
          <p className="mb-2 text-[11px] text-slate-500">
            Leave blank to use VouchVoice’s fast built-in zero-cost linguistic cleaner.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={customAiKey}
              onChange={(e) => onCustomAiKeyChange(e.target.value)}
              placeholder={workspace.hasCustomAiKey ? 'Key saved (enter new to replace)' : 'sk-...'}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
            />
            <button
              type="button"
              onClick={onSaveAiKey}
              className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"
            >
              Save Key
            </button>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
