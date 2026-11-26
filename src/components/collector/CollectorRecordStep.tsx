import {
  Mic,
  Pause,
  Play,
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

/** Step 1 of the collector flow: guided prompt, 20s voice recorder deck, and raw transcript input. */
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
    <div className="overflow-hidden rounded-[24px] border border-[#DCE2EC] bg-white shadow-xl shadow-[#131722]/6">
      {/* Dark Audio Recorder Deck */}
      <div className="bg-[#131722] p-5 text-white sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
          <span className="text-xs font-medium text-[#A9B4C9]">
            Question {activePromptIdx + 1} of 3
          </span>
          <div className="flex gap-1.5">
            {prompts.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectPrompt(i)}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  activePromptIdx === i
                    ? 'bg-[#2142E7] text-white'
                    : 'bg-white/10 text-[#C6D0E2] hover:bg-white/20'
                }`}
              >
                Q{i + 1}
              </button>
            ))}
          </div>
        </div>

        <p className="font-display mt-4 text-xl font-bold leading-snug text-white">
          “{prompts[activePromptIdx]}”
        </p>
        <p className="mt-1.5 text-xs text-[#9AA6BE]">
          Speak naturally with “um”s and pauses. You can review and edit the cleaned quote before posting.
        </p>

        {/* Live Waveform Stage */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-[#1B2130] px-4 py-5">
          <div className="mb-3 flex items-center justify-between text-xs text-[#A9B4C9]">
            <span className="inline-flex items-center gap-2 font-medium text-white">
              <span
                className={`h-2 w-2 rounded-full ${
                  recording ? 'animate-pulse bg-[#E63B2E]' : 'bg-white/40'
                }`}
                aria-hidden="true"
              />
              <span>{recording ? 'Recording voice note' : hasAudio ? 'Voice note ready' : 'Ready to record'}</span>
            </span>
            <span className="font-mono-code tabular-nums">
              00:{String(seconds).padStart(2, '0')} / 00:20
            </span>
          </div>

          <div className="flex h-16 items-end justify-center gap-1.5">
            {levels.map((lv, idx) => (
              <div
                key={idx}
                className="w-1.5 rounded-full transition-[height,opacity] duration-100"
                style={{
                  height: `${Math.max(18, lv)}%`,
                  backgroundColor: recording ? '#E63B2E' : brandColor || '#2142E7',
                  opacity: recording ? 0.95 : 0.5,
                }}
              />
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {!recording ? (
              <button
                type="button"
                onClick={onStartRecording}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#E63B2E] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#D12F23]"
              >
                <Mic className="h-4 w-4" />
                <span>{hasAudio ? 'Record again' : 'Start 20s recording'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onStopRecording}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#131722] transition hover:bg-[#EEF1F6]"
              >
                <Square className="h-3.5 w-3.5 fill-[#E63B2E] text-[#E63B2E]" />
                <span className="tabular-nums">Stop recording ({seconds}s)</span>
              </button>
            )}

            {audioPreviewUrl && (
              <button
                type="button"
                onClick={onTogglePreview}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-xs font-bold text-white transition hover:bg-white/20"
              >
                {playingPreview ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{playingPreview ? 'Pause playback' : `Play voice (${seconds || 18}s)`}</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 text-xs">
          <button
            type="button"
            onClick={onSampleVoice}
            className="cursor-pointer rounded-lg border border-white/15 bg-white/8 px-3.5 py-1.5 font-semibold text-white transition hover:bg-white/15"
          >
            Load sample 18s voice note
          </button>

          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-3.5 py-1.5 font-semibold text-[#D8DFEC] transition hover:bg-white/15">
            <Upload className="h-3.5 w-3.5" />
            <span>Upload audio file</span>
            <input
              type="file"
              accept="audio/*"
              onChange={onFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Transcript & Polish Action */}
      <div className="p-5 sm:p-7">
        <label
          htmlFor="collector-transcript"
          className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#131722]"
        >
          <span>Live transcript (or type your raw thoughts)</span>
          <span className="font-normal text-[#576278]">
            {rawTranscript.trim() ? `${rawTranscript.trim().split(/\s+/).length} words` : 'Optional'}
          </span>
        </label>
        <textarea
          id="collector-transcript"
          rows={4}
          value={rawTranscript}
          onChange={(e) => onChangeTranscript(e.target.value)}
          placeholder="Your spoken words appear here as you record, or type messy notes and let VouchVoice clean them into a review…"
          className="w-full rounded-xl border border-[#CED6E3] bg-[#F4F6F8] p-3.5 text-sm leading-relaxed text-[#131722] focus:border-[#2142E7] focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2142E7]/30"
        />

        {error && (
          <div role="alert" className="mt-3 rounded-xl bg-[#FEF2F2] px-3.5 py-2.5 text-xs font-medium text-[#B91C1C]">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={polishing}
          onClick={onPolish}
          className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2142E7] py-3.5 text-sm font-bold text-white transition hover:bg-[#1935C7] disabled:opacity-60"
        >
          <Wand2 className="h-4 w-4" />
          <span>{polishing ? 'Cleaning transcript…' : 'Clean transcript and preview review'}</span>
        </button>
      </div>
    </div>
  );
}
