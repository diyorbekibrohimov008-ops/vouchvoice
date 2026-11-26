import { useEffect, useRef, useState } from 'react';
import { Mic, Pause, Play, Volume2 } from 'lucide-react';
import { api, type PublicSpaceResponse } from '../lib/api';
import { cleanTranscriptLocally } from '../../shared/transcriptAi';
import { synthesizeDemoWav } from '../../shared/demoAudio';
import { WallPreview } from '../components/WallPreview';
import { PricingSection } from '../components/PricingSection';
import type { WallLayout } from '../../shared/types';

interface LandingPageProps {
  onNavigate: (path: string) => void;
  onStartDemo: () => void;
  onGetStarted: () => void;
  isSignedIn?: boolean;
}

const SAMPLE_RAW =
  "Um, so before using PulseDeck AI, I was like spending literally 4 hours every Friday reading messy call notes, you know? Honestly I hate recording webcam videos, so this 20-second voice thing felt effortless. Now our team ships 3x faster and I tell every founder to use it.";

const WAVEFORM_BARS = [
  24, 38, 62, 46, 84, 92, 54, 42, 76, 88, 66, 36, 58, 95, 78, 48, 34, 72,
  90, 64, 44, 82, 70, 38, 52, 86, 94, 60, 40, 74, 58, 32, 46, 68, 42, 26,
];

const STAGE_LAYOUTS: Array<{ id: WallLayout; label: string }> = [
  { id: 'masonry', label: 'Masonry wall' },
  { id: 'marquee', label: 'Scrolling reel' },
  { id: 'spotlight', label: 'Spotlight' },
  { id: 'badge', label: 'Rating pill' },
];

export function LandingPage({
  onNavigate,
  onStartDemo,
  onGetStarted,
  isSignedIn,
}: LandingPageProps) {
  const [rawInput, setRawInput] = useState(SAMPLE_RAW);
  const [tone, setTone] = useState<'authentic' | 'crisp' | 'results'>('results');
  const [publicWall, setPublicWall] = useState<PublicSpaceResponse | null>(null);
  const [previewLayout, setPreviewLayout] = useState<WallLayout>('masonry');

  const [playingSample, setPlayingSample] = useState(false);
  const [playProgress, setPlayProgress] = useState(0.45);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  const analysis = cleanTranscriptLocally(rawInput, 'PulseDeck AI');

  useEffect(() => {
    let active = true;
    api
      .getPublicSpace('acme-ai')
      .then((res) => {
        if (active) setPublicWall(res);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current !== null) {
        window.clearInterval(progressTimerRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  const stopSamplePlayback = () => {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingSample(false);
  };

  const toggleSampleAudio = () => {
    if (playingSample) {
      stopSamplePlayback();
      return;
    }

    if (!audioUrlRef.current) {
      const wav = synthesizeDemoWav(4, 2.8);
      const copy = new Uint8Array(wav.byteLength);
      copy.set(wav);
      audioUrlRef.current = URL.createObjectURL(new Blob([copy.buffer], { type: 'audio/wav' }));
    }

    const audio = new Audio(audioUrlRef.current);
    audioRef.current = audio;
    setPlayingSample(true);
    setPlayProgress(0.05);

    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
    }
    progressTimerRef.current = window.setInterval(() => {
      if (!audio.duration || Number.isNaN(audio.duration)) return;
      setPlayProgress(Math.min(1, audio.currentTime / audio.duration));
    }, 60);

    audio.onended = () => {
      if (progressTimerRef.current !== null) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setPlayingSample(false);
      setPlayProgress(1);
    };

    audio.play().catch(() => {
      stopSamplePlayback();
    });
  };

  const activeBarsCount = Math.round(playProgress * WAVEFORM_BARS.length);
  const currentSec = Math.round(playProgress * 18);

  return (
    <div>
      {/* Asymmetric Audio-Creator Stage */}
      <section className="border-b border-[#E5E9F0] bg-[#F4F6F8]">
        <div className="mx-auto max-w-7xl px-4 pt-10 pb-14 sm:px-6 sm:pt-12 sm:pb-16 lg:px-8 lg:pt-16 lg:pb-20">
          <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left Editorial Column (5 cols) */}
            <div className="min-w-0 lg:col-span-5 lg:pt-4">
              <h1 className="font-display text-[2.25rem] leading-[1.05] font-extrabold tracking-[-0.03em] text-[#131722] sm:text-[3.35rem] sm:leading-[1.03]">
                Turn 20-second voice notes into website reviews.
              </h1>

              <p className="mt-4 max-w-[44ch] text-base leading-relaxed text-[#424C60] sm:mt-5 sm:text-lg">
                Collect customer reviews by voice in 20 seconds and put them on your website — free.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3 sm:mt-8 sm:gap-4">
                <button
                  type="button"
                  onClick={onStartDemo}
                  className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#2142E7] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1935C7] sm:px-6 sm:py-3.5"
                >
                  Open free studio
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/collect/acme-ai')}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#CED6E3] bg-white px-4 py-3 text-sm font-semibold text-[#131722] transition hover:border-[#9CA8BC] hover:bg-[#F9FAFC] sm:px-5 sm:py-3.5"
                >
                  <Mic className="h-4 w-4 text-[#E63B2E]" />
                  <span>Try the 20s recorder</span>
                </button>
              </div>

              <p className="mt-5 text-sm text-[#576278]">
                No camera or sign-up for your customers. Unlimited brand spaces and custom widgets included at $0.
              </p>

              {/* Quiet inline 3-step sequence */}
              <ol className="mt-8 grid grid-cols-1 gap-3 border-t border-[#DDE3EC] pt-5 sm:mt-9 sm:grid-cols-3 sm:gap-4 sm:pt-6">
                <li className="flex items-baseline gap-2 sm:block">
                  <span className="font-mono-code text-xs font-medium text-[#2142E7]">01</span>
                  <div className="text-sm font-bold text-[#131722] sm:mt-1">Share your link</div>
                </li>
                <li className="flex items-baseline gap-2 sm:block">
                  <span className="font-mono-code text-xs font-medium text-[#2142E7]">02</span>
                  <div className="text-sm font-bold text-[#131722] sm:mt-1">Approve reviews</div>
                </li>
                <li className="flex items-baseline gap-2 sm:block">
                  <span className="font-mono-code text-xs font-medium text-[#2142E7]">03</span>
                  <div className="text-sm font-bold text-[#131722] sm:mt-1">Copy the widget code</div>
                </li>
              </ol>
            </div>

            {/* Right Focal Moment: Tactile Audio Booth Console (7 cols) */}
            <div className="min-w-0 lg:col-span-7">
              <div className="overflow-hidden rounded-[22px] border border-[#232A3B] bg-[#131722] text-white shadow-2xl shadow-[#131722]/15 sm:rounded-[26px]">
                {/* Console Top Deck */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3.5 sm:gap-3 sm:px-6 sm:py-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        playingSample ? 'animate-pulse bg-[#E63B2E]' : 'bg-[#E63B2E]/90'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-semibold text-white">
                      Voice note cleanup preview
                    </span>
                  </div>
                  <div className="font-mono-code tabular-nums flex items-center gap-2 text-[11px] text-[#A9B4C9] sm:gap-3 sm:text-xs">
                    <span>
                      00:{String(currentSec).padStart(2, '0')} / 00:18
                    </span>
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-white">
                      {analysis.fillersRemovedCount} fillers removed
                    </span>
                  </div>
                </div>

                {/* Live Playable Waveform Stage */}
                <div className="px-4 pt-4 pb-4 sm:px-6 sm:pt-5">
                  <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-[#1B2130] px-3 py-3 sm:gap-4 sm:px-4 sm:py-3.5">
                    <button
                      type="button"
                      onClick={toggleSampleAudio}
                      aria-label={playingSample ? 'Pause sample voice note' : 'Play sample voice note'}
                      className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-[#E63B2E] text-white transition hover:bg-[#D12F23] sm:h-11 sm:w-11"
                    >
                      {playingSample ? (
                        <Pause className="h-4 w-4 fill-current sm:h-4.5 sm:w-4.5" />
                      ) : (
                        <Play className="ml-0.5 h-4 w-4 fill-current sm:h-4.5 sm:w-4.5" />
                      )}
                    </button>

                    <div
                      className="flex h-10 min-w-0 flex-1 items-center gap-[3px] overflow-hidden sm:h-11"
                      role="img"
                      aria-label="Customer voice waveform"
                    >
                      {WAVEFORM_BARS.map((height, idx) => {
                        const passed = idx <= activeBarsCount;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setPlayProgress((idx + 1) / WAVEFORM_BARS.length)}
                            aria-label={`Jump to ${Math.round(((idx + 1) / WAVEFORM_BARS.length) * 18)} seconds`}
                            className={`group h-full min-w-0 flex-1 cursor-pointer items-center justify-center ${
                              idx % 2 === 1 ? 'hidden sm:flex' : 'flex'
                            }`}
                          >
                            <span
                              className={`block w-full rounded-full transition-[height,background-color] duration-150 ${
                                passed
                                  ? playingSample
                                    ? 'bg-[#E63B2E]'
                                    : 'bg-white'
                                  : 'bg-white/25 group-hover:bg-white/45'
                              }`}
                              style={{ height: `${height}%` }}
                            />
                          </button>
                        );
                      })}
                    </div>

                    <div className="hidden items-center gap-1.5 text-xs text-[#A9B4C9] sm:flex">
                      <Volume2 className="h-4 w-4" />
                      <span className="font-mono-code">WAV</span>
                    </div>
                  </div>

                  {/* Editable Raw Spoken Words */}
                  <div className="mt-4">
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1 text-xs text-[#A9B4C9]">
                      <label htmlFor="live-voice-transcript" className="font-medium text-white/90">
                        What the customer said (try editing this)
                      </label>
                      <span className="hidden sm:inline">Original voice stays playable</span>
                    </div>
                    <textarea
                      id="live-voice-transcript"
                      rows={3}
                      value={rawInput}
                      onChange={(e) => setRawInput(e.target.value)}
                      className="w-full rounded-xl border border-white/12 bg-[#0E121B] p-3 text-sm leading-relaxed text-[#D8DFEC] placeholder:text-[#7E8AA2] focus:border-[#4F6EF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F6EF7]/50 sm:p-3.5"
                    />
                  </div>
                </div>

                {/* Output Sheet Emerging From Console: Ready Website Review */}
                <div className="border-t border-white/10 bg-white px-5 py-5 text-[#131722] sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-1 rounded-lg bg-[#EEF1F6] p-1">
                      {(['authentic', 'crisp', 'results'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTone(t)}
                          className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold capitalize transition ${
                            tone === t
                              ? 'bg-[#131722] text-white'
                              : 'text-[#475166] hover:text-[#131722]'
                          }`}
                        >
                          {t === 'results' ? 'Results-led' : t}
                        </button>
                      ))}
                    </div>

                    {analysis.outcomeMetric && (
                      <span className="rounded-md bg-[#EEF2FF] px-2.5 py-1 text-xs font-bold text-[#2142E7]">
                        Key result: {analysis.outcomeMetric}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 border-l-2 border-[#2142E7] pl-4">
                    {analysis.pullQuote && (
                      <p className="font-display text-lg leading-snug font-bold text-[#131722]">
                        “{analysis.pullQuote}”
                      </p>
                    )}
                    <p className="mt-1.5 text-sm leading-relaxed text-[#424C60]">
                      {analysis.cleanedByTone[tone]}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E9F0] pt-3.5 text-xs text-[#576278]">
                    <span>Ready for your website widget or Google Maps</span>
                    <button
                      type="button"
                      onClick={() => onNavigate('/collect/acme-ai')}
                      className="cursor-pointer font-bold text-[#2142E7] hover:underline"
                    >
                      Record your own sample
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial 3-Step Process Strip (NOT 3 identical rounded SaaS cards) */}
      <section className="border-b border-[#E5E9F0] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-extrabold tracking-[-0.025em] text-[#131722] sm:text-4xl">
              Three steps from voice note to live website widget
            </h2>
            <p className="mt-2.5 text-base text-[#4B5568]">
              No training or setup calls. Send one link, approve the reviews you like, and paste one snippet on your site.
            </p>
          </div>

          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            <li className="min-w-0 border-t-2 border-[#131722] pt-5">
              <span className="font-mono-code text-sm font-medium text-[#2142E7]">Step 1</span>
              <h3 className="font-display mt-2 text-xl font-bold text-[#131722]">
                Share your link
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#4B5568]">
                Drop your link into an email, invoice, or chat message. Customers tap record on their phone and talk for 20 seconds with no camera or login.
              </p>
              <div className="font-mono-code mt-5 truncate rounded-lg border border-[#E5E9F0] bg-[#F4F6F8] px-3 py-2 text-xs text-[#364055]">
                vouchvoice.app/collect/your-brand
              </div>
            </li>

            <li className="min-w-0 border-t-2 border-[#131722] pt-5">
              <span className="font-mono-code text-sm font-medium text-[#2142E7]">Step 2</span>
              <h3 className="font-display mt-2 text-xl font-bold text-[#131722]">
                Approve reviews
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#4B5568]">
                Filler words like “um” and pauses are cleaned automatically while the real voice clip stays playable. Pick your favorites in one click.
              </p>
              <div className="mt-5 flex items-center justify-between rounded-lg border border-[#E5E9F0] bg-[#F4F6F8] px-3 py-2 text-xs">
                <span className="font-semibold text-[#131722]">18s voice clip attached</span>
                <span className="rounded bg-[#131722] px-2 py-0.5 font-semibold text-white">
                  Approved
                </span>
              </div>
            </li>

            <li className="min-w-0 border-t-2 border-[#131722] pt-5">
              <span className="font-mono-code text-sm font-medium text-[#2142E7]">Step 3</span>
              <h3 className="font-display mt-2 text-xl font-bold text-[#131722]">
                Copy the widget code
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#4B5568]">
                Choose masonry, scrolling reel, spotlight, or rating pill. Paste two lines into any site, or download a standalone HTML file to host yourself.
              </p>
              <div className="font-mono-code mt-5 truncate rounded-lg border border-[#1E2534] bg-[#131722] px-3 py-2 text-xs text-[#9CE5C4]">
                &lt;div data-vouch-wall=&quot;your-brand&quot;&gt;&lt;/div&gt;
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* Live Masonry Wall of Love Showcase */}
      {publicWall && (
        <section className="border-b border-[#E5E9F0] bg-[#F4F6F8]">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-extrabold tracking-[-0.025em] text-[#131722] sm:text-4xl">
                  See how your Wall of Love looks on a website
                </h2>
                <p className="mt-2 max-w-xl text-base text-[#4B5568]">
                  Every review card pairs the cleaned quote with the original customer voice note. Switch layouts below to preview.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex flex-wrap rounded-xl border border-[#DCE2EC] bg-white p-1">
                  {STAGE_LAYOUTS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPreviewLayout(item.id)}
                      className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        previewLayout === item.id
                          ? 'bg-[#131722] text-white'
                          : 'text-[#475166] hover:text-[#131722]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('/wall/acme-ai')}
                  className="cursor-pointer rounded-xl border border-[#CED6E3] bg-white px-4 py-2 text-xs font-bold text-[#131722] transition hover:bg-[#EEF1F6]"
                >
                  Open full sample page
                </button>
              </div>
            </div>

            <WallPreview
              space={{ ...publicWall.space, layout: previewLayout }}
              testimonials={publicWall.testimonials}
              onCollectClick={() => onNavigate('/collect/acme-ai')}
            />
          </div>
        </section>
      )}

      {/* Free Forever & Competitor Comparison */}
      <PricingSection onGetStarted={onGetStarted} isSignedIn={isSignedIn} />
    </div>
  );
}
