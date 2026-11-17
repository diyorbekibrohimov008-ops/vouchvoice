import { Check, X as XIcon } from 'lucide-react';
import type { PlanTier } from '../../shared/types';

interface PricingSectionProps {
  activePlan?: PlanTier | null;
  onSelectPlan?: (plan: PlanTier) => void;
}

export function PricingSection({ activePlan, onSelectPlan }: PricingSectionProps) {
  const tiers: Array<{
    id: PlanTier;
    name: string;
    price: string;
    cadence: string;
    badge?: string;
    desc: string;
    features: string[];
    cta: string;
    highlighted?: boolean;
  }> = [
    {
      id: 'free',
      name: 'Starter',
      price: '$0',
      cadence: 'forever',
      desc: 'Test voice collection & embed your first Wall of Love without a credit card.',
      features: [
        '1 brand space · 15 voice/text reviews',
        '20s Voice-Prompted AI Transcripts',
        '1-tap Google Maps & Product Hunt handoff',
        'Universal Shadow DOM embed script',
      ],
      cta: 'Start Free',
    },
    {
      id: 'maintenance_9',
      name: 'Lightweight Maintenance',
      price: '$9',
      cadence: '/ month',
      badge: 'Anti-Subscription-Tax',
      desc: 'Keep collecting, syndicating, and hosting unlimited voice audio at 75% less than Senja.',
      features: [
        'Unlimited brand spaces ($0 extra per brand)',
        'Unlimited voice notes & AI polish',
        'Two-way LinkedIn, X & Webhook syndication',
        'Remove VouchVoice branding + custom accent',
      ],
      cta: 'Switch to $9/mo',
    },
    {
      id: 'lifetime_79',
      name: 'Lifetime Embed License',
      price: '$79',
      cadence: 'pay once, own forever',
      badge: 'Best for Solopreneurs',
      desc: 'Never pay rent just to display reviews you already earned. Export self-hosted widgets anytime.',
      features: [
        'Everything in Maintenance — zero monthly bill',
        'Unlimited brand spaces & embeds forever',
        '1-click Self-Hosted HTML Bundle export',
        'Senja & Testimonial.to 30-sec migration tool',
      ],
      cta: 'Unlock Lifetime ($79)',
      highlighted: true,
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
          Transparent Pricing
        </span>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Stop paying $29–$59/mo just to show old reviews
        </h2>
        <p className="mt-3 text-base text-slate-600">
          Keep a $9/mo lightweight plan for ongoing collection & webhooks, or pay $79 once and own your Wall of Love forever.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {tiers.map((tier) => {
          const isCurrent = activePlan === tier.id;
          return (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-3xl border p-7 transition ${
                tier.highlighted
                  ? 'border-indigo-600 bg-slate-900 text-white shadow-xl shadow-indigo-950/15'
                  : 'border-slate-200 bg-white text-slate-900 shadow-sm'
              }`}
            >
              {tier.badge && (
                <span
                  className={`mb-4 inline-block w-fit rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                    tier.highlighted
                      ? 'bg-indigo-500 text-white'
                      : 'bg-indigo-50 text-indigo-700'
                  }`}
                >
                  {tier.badge}
                </span>
              )}
              <h3 className="text-lg font-bold">{tier.name}</h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tight">{tier.price}</span>
                <span className={`text-sm ${tier.highlighted ? 'text-slate-300' : 'text-slate-500'}`}>
                  {tier.cadence}
                </span>
              </div>
              <p className={`mt-3 text-sm ${tier.highlighted ? 'text-slate-300' : 'text-slate-600'}`}>
                {tier.desc}
              </p>

              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5">
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        tier.highlighted ? 'text-emerald-400' : 'text-emerald-600'
                      }`}
                    />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => onSelectPlan?.(tier.id)}
                className={`mt-7 w-full cursor-pointer rounded-2xl px-4 py-3 text-sm font-bold transition ${
                  isCurrent
                    ? 'bg-emerald-500 text-white'
                    : tier.highlighted
                    ? 'bg-white text-slate-900 hover:bg-indigo-50'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {isCurrent ? 'Current Active Plan' : tier.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* Competitor Comparison Table */}
      <div className="mt-14 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4">
          <h3 className="text-base font-bold text-slate-900">
            Why solopreneurs switch from Senja & Testimonial.to
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3.5">Capability</th>
                <th className="px-6 py-3.5 font-extrabold text-indigo-700">VouchVoice</th>
                <th className="px-6 py-3.5">Senja</th>
                <th className="px-6 py-3.5">Testimonial.to</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-6 py-3.5 font-semibold text-slate-800">20s Voice Note → AI Clean Review</td>
                <td className="px-6 py-3.5 font-semibold text-emerald-700">Included (zero camera anxiety)</td>
                <td className="px-6 py-3.5 text-slate-500"><XIcon className="inline h-4 w-4 text-rose-500" /> Video/text focus</td>
                <td className="px-6 py-3.5 text-slate-500"><XIcon className="inline h-4 w-4 text-rose-500" /> Video/text focus</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-semibold text-slate-800">Audio/Video Paywall</td>
                <td className="px-6 py-3.5 font-semibold text-emerald-700">Unlimited voice notes</td>
                <td className="px-6 py-3.5 text-slate-600">Tiered quotas</td>
                <td className="px-6 py-3.5 text-slate-600">2 video cap on low plan</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-semibold text-slate-800">Multi-Brand Spaces</td>
                <td className="px-6 py-3.5 font-semibold text-emerald-700">$0 extra (unlimited)</td>
                <td className="px-6 py-3.5 text-slate-600">Per-space price escalation</td>
                <td className="px-6 py-3.5 text-slate-600">Higher tier required</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-semibold text-slate-800">Two-Way Syndication</td>
                <td className="px-6 py-3.5 font-semibold text-emerald-700">Google Maps / PH handoff + LinkedIn + Webhook</td>
                <td className="px-6 py-3.5 text-slate-500">Pull-in mostly</td>
                <td className="px-6 py-3.5 text-slate-500">Pull-in mostly</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-semibold text-slate-800">Ongoing Cost</td>
                <td className="px-6 py-3.5 font-extrabold text-indigo-700">$9/mo or $79 Lifetime</td>
                <td className="px-6 py-3.5 text-slate-600">$29–$59+/mo forever</td>
                <td className="px-6 py-3.5 text-slate-600">$20–$50+/mo forever</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
