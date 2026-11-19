import {
  ArrowRight,
  Mic,
  Pause,
  Play,
  Sparkles,
  Square,
  Upload,
  Wand2,
} from 'lucide-react';

interface CollectorRecordStepProps {
  brandColor: string;
  prompts: string[];
  activePromptIdx: number;
  onSelectPrompt: (idx: number) => void;
  recording: boolean;
  seconds: number;
  levels: number[];
  hasAudio: boolean;
  audioPreviewUrl: string | null;
  playingPreview: boolean;
  rawTranscript: string;
  onChangeTranscript: (text: string) => void;
  polishing: boolean;
  error: string | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSampleVoice: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTogglePreview: () => void;
  onPolish: () => void;
}

/** Step 1 of the collector flow: guided prompt, 20s voice recorder, and raw transcript input. */
export function CollectorRecordStep({
  brandColor,
  prompts,
  activePromptIdx,
  onSelectPrompt,
  recording,
  seconds,
  levels,
  hasAudio,
  audioPreviewUrl,
  playingPreview,
  rawTranscript,
  onChangeTranscript,
  polishing,
  error,
  onStartRecording,
  onStopRecording,
  onSampleVoice,
  onFileUpload,
  onTogglePreview,
  onPolish,
}: CollectorRecordStepProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5 sm:p-7">
      <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-teal-800">
          <span>Guided Prompt {activePromptIdx + 1} of 3</span>
          <div className="flex gap-1">
            {prompts.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectPrompt(i)}
                className={`cursor-pointer rounded-full px-2 py-0.5 text-[11px] ${
                  activePromptIdx === i ? 'bg-teal-700 text-white' : 'bg-white text-teal-800'
                }`}
              >
                Q{i + 1}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-base font-bold text-slate-900">“{prompts[activePromptIdx]}”</p>
        <p className="mt-1 text-xs text-slate-500">
          Speak naturally with “um”s and pauses — AI cleans everything before you approve.
        </p>
      </div>

      <div className="mt-6 flex flex-col items-center">
        <div className="flex h-16 items-end justify-center gap-1.5">
          {levels.map((lv, idx) => (
            <div
              key={idx}
              className="w-1.5 rounded-full transition-[height,opacity] duration-100"
              style={{
                height: `${Math.max(18, lv)}%`,
                backgroundColor: recording ? '#e11d48' : brandColor,
                opacity: recording ? 0.95 : 0.35,
              }}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          {!recording ? (
            <button
              type="button"
              onClick={onStartRecording}
              className="inline-flex cursor-pointer items-center gap-2.5 rounded-full bg-rose-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-600/25 transition hover:bg-rose-700"
            >
              <Mic className="h-4.5 w-4.5" />
              <span>{hasAudio ? 'Re-record Voice Note' : 'Tap to Record (20s)'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStopRecording}
              className="inline-flex cursor-pointer items-center gap-2.5 rounded-full bg-slate-900 px-7 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800"
            >
              <Square className="h-4 w-4 fill-rose-500 text-rose-500" />
              <span>Stop Recording · {seconds}s</span>
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onSampleVoice}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-100"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Try Sample 18s Voice Note</span>
          </button>

          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            <Upload className="h-3.5 w-3.5" />
            <span>Upload audio</span>
            <input
              type="file"
              accept="audio/*"
              onChange={onFileUpload}
              className="hidden"
            />
          </label>

          {audioPreviewUrl && (
            <button
              type="button"
              onClick={onTogglePreview}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700"
            >
              {playingPreview ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{playingPreview ? 'Pause Audio' : `Play Voice (${seconds || 18}s)`}</span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-700">
          <span>Live voice transcript (or type your raw thoughts)</span>
          <span className="font-normal text-slate-400">
            {rawTranscript.trim() ? `${rawTranscript.trim().split(/\s+/).length} words` : 'Optional'}
          </span>
        </label>
        <textarea
          rows={4}
          value={rawTranscript}
          onChange={(e) => onChangeTranscript(e.target.value)}
          placeholder="As you speak, your raw words appear here (or type messy bullet points and let AI clean them into an authentic review)…"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 text-sm leading-relaxed text-slate-800 focus:border-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
        />
      </div>

      {error && (
        <div className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={polishing}
        onClick={onPolish}
        className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-teal-700 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-teal-800 disabled:opacity-60"
      >
        <Wand2 className="h-4 w-4" />
        <span>{polishing ? 'Polishing voice transcript…' : 'Clean Transcript & Preview Review'}</span>
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
