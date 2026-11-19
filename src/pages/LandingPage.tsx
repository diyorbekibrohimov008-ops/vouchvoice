import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  Layers,
  Mic,
  Send,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { api, type PublicSpaceResponse } from '../lib/api';
import { cleanTranscriptLocally } from '../../shared/transcriptAi';
import { WallPreview } from '../components/WallPreview';
import { PricingSection } from '../components/PricingSection';
import type { PlanTier } from '../../shared/types';

interface LandingPageProps {
  onNavigate: (path: string) => void;
  onStartDemo: () => void;
  onSelectPlan: (plan: PlanTier) => void;
}

const SAMPLE_RAW =
  "Um, so before using PulseDeck AI, I was like spending literally 4 hours every Friday reading messy call notes, you know? Honestly I hate recording webcam videos, so this 20-second voice thing felt effortless. Now our team ships 3x faster and I tell every founder to use it.";

export function LandingPage({ onNavigate, onStartDemo, onSelectPlan }: LandingPageProps) {
  const [rawInput, setRawInput] = useState(SAMPLE_RAW);
  const [tone, setTone] = useState<'authentic' | 'crisp' | 'results'>('results');
  const [publicWall, setPublicWall] = useState<PublicSpaceResponse | null>(null);

  const analysis = cleanTranscriptLocally(rawInput, 'PulseDeck AI');

  useEffect(() => {
    api
      .getPublicSpace('acme-ai')
      .then(setPublicWall)
      .catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200/70 bg-gradient-to-b from-[#f6f8f9] via-white to-teal-50/40">
        <div className="mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:pt-18 lg:pb-22">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1 text-xs font-bold text-teal-800">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Built to replace $29–$59/mo Senja & Testimonial.to plans</span>
              </div>

              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[54px] lg:leading-[1.06]">
                Customers hate cameras.{' '}
                <span className="font-serif-display font-bold text-teal-700">
                  Let them leave a 20s voice note.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                Over 80% of customers abandon video testimonial links. VouchVoice turns a casual 20-second phone voice memo into a cleaned-up, one-tap-approved review—then syndicates it to Google Maps, Product Hunt & LinkedIn.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onStartDemo}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-teal-700 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-700/20 transition hover:bg-teal-800"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Open Live Founder Studio</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/collect/acme-ai')}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  <Mic className="h-4 w-4 text-rose-500" />
                  <span>Try 20s Voice Collector</span>
                </button>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  No video paywalls
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Unlimited brand spaces
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  $9/mo or $79 lifetime embed
                </span>
              </div>
            </div>

            {/* Interactive Voice-to-Review Sandbox */}
            <div className="lg:col-span-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-50 text-rose-600">
                      <Mic className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Live Voice Transcript Cleaner
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Edit the messy voice memo below — watch it clean instantly
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    -{analysis.fillersRemovedCount} fillers stripped
                  </span>
                </div>

                <div className="mt-4">
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Raw 20s spoken voice note
                  </label>
                  <textarea
                    rows={3}
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-xs leading-relaxed text-slate-700 focus:border-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1">
                    {(['authentic', 'crisp', 'results'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTone(t)}
                        className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold capitalize transition ${
                          tone === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        {t === 'results' ? 'Results-Led' : t}
                      </button>
                    ))}
                  </div>
                  {analysis.outcomeMetric && (
                    <span className="rounded-full bg-teal-700 px-2.5 py-1 text-[11px] font-bold text-white">
                      Detected ROI: {analysis.outcomeMetric}
                    </span>
                  )}
                </div>

                <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    <Wand2 className="h-3.5 w-3.5" />
                    <span>One-Tap Approved Review</span>
                  </div>
                  {analysis.pullQuote && (
                    <div className="mb-1.5 text-sm font-bold text-slate-900">
                      “{analysis.pullQuote}”
                    </div>
                  )}
                  <p className="text-sm leading-relaxed text-slate-700">
                    {analysis.cleanedByTone[tone]}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>Ready to syndicate → Google Maps · Product Hunt · LinkedIn</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('/collect/acme-ai')}
                    className="cursor-pointer font-bold text-teal-700 hover:underline"
                  >
                    Record yours →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Pillars */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-50 text-rose-600">
              <Mic className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-lg font-bold text-slate-900">
              Voice-Prompted AI Transcripts
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Guided 3-question prompts banish writer’s block and camera anxiety. Customers talk for 20 seconds, AI strips “um/uh/like”, and they approve in one tap.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-50 text-teal-700">
              <Send className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-lg font-bold text-slate-900">
              Two-Way Syndication Engine
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Import existing reviews from Senja or Testimonial.to in 30 seconds, AND push approved reviews out to Google Maps, Product Hunt, LinkedIn posts, and webhooks.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Layers className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-lg font-bold text-slate-900">
              Unlimited Brand Spaces + Self-Host
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Run 10 products from one dashboard at $0 extra per space. Export a standalone Lifetime HTML Wall of Love you own forever.
            </p>
          </div>
        </div>
      </section>

      {/* Live Wall of Love */}
      {publicWall && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700">
                <Globe className="h-3.5 w-3.5" />
                Live Embeddable Wall of Love
              </span>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                {publicWall.space.name} — Playable Voice Social Proof
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/wall/acme-ai')}
              className="cursor-pointer rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Open Full Wall Page →
            </button>
          </div>
          <WallPreview
            space={publicWall.space}
            testimonials={publicWall.testimonials}
            onCollectClick={() => onNavigate('/collect/acme-ai')}
          />
        </section>
      )}

      {/* Pricing & Competitor Comparison */}
      <PricingSection onSelectPlan={onSelectPlan} />
    </div>
  );
}
