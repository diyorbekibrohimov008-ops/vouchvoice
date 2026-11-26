import { Check, X as XIcon } from 'lucide-react';

interface PricingSectionProps {
  onGetStarted?: () => void;
  isSignedIn?: boolean;
}

const INCLUDED_FEATURES = [
  'Unlimited brand spaces and review links',
  'Unlimited 20-second voice notes with automatic cleanup',
  'Hide VouchVoice branding on every website widget',
  'Embed via script tag, iframe, or React snippet',
  'Download a standalone HTML file to host anywhere',
  'Share reviews to Google Maps, Product Hunt, LinkedIn, and X',
  'Import existing reviews from Senja, Testimonial.to, CSV, or plain text',
  'Built-in zero-cost cleaner plus optional OpenAI settings',
];

export function PricingSection({ onGetStarted, isSignedIn }: PricingSectionProps) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
          {/* Left Editorial Statement (5 cols) */}
          <div className="min-w-0 lg:col-span-5">
            <h2 className="font-display text-3xl font-extrabold tracking-[-0.025em] text-[#131722] sm:text-4xl">
              Free forever, with every feature unlocked.
            </h2>
            <p className="mt-3 max-w-[44ch] text-base leading-relaxed text-[#4B5568]">
              Other testimonial tools charge $20 to $59 every month just to keep your own customer reviews online. VouchVoice is $0 with no credit card, no trial timers, and no caps per business.
            </p>

            <div className="mt-7 flex items-baseline gap-2 border-y border-[#E5E9F0] py-5">
              <span className="font-display tabular-nums text-5xl font-extrabold tracking-tight text-[#131722]">
                $0
              </span>
              <span className="text-sm font-medium text-[#576278]">
                per month, forever
              </span>
            </div>

            <ul className="mt-6 space-y-2.5 text-sm text-[#364055]">
              {INCLUDED_FEATURES.map((feat) => (
                <li key={feat} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2142E7]" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <button
                type="button"
                onClick={onGetStarted}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#2142E7] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#1935C7]"
              >
                {isSignedIn ? 'Open your studio' : 'Start collecting free'}
              </button>
            </div>
          </div>

          {/* Right Hairline Comparison Table (7 cols) */}
          <div className="min-w-0 lg:col-span-7">
            <div className="overflow-hidden rounded-2xl border border-[#DCE2EC] bg-[#F4F6F8]">
              <div className="border-b border-[#DCE2EC] bg-white px-5 py-4 sm:px-6">
                <h3 className="font-display text-lg font-bold text-[#131722]">
                  How VouchVoice compares to Senja and Testimonial.to
                </h3>
              </div>
              <div className="overflow-x-auto bg-white">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E9F0] text-xs font-semibold text-[#576278]">
                      <th className="px-5 py-3.5">Feature</th>
                      <th className="px-5 py-3.5 font-bold text-[#2142E7]">VouchVoice</th>
                      <th className="px-5 py-3.5">Senja</th>
                      <th className="px-5 py-3.5">Testimonial.to</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF1F6]">
                    <tr>
                      <td className="px-5 py-3.5 font-semibold text-[#131722]">
                        20s voice note cleanup
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-[#131722]">
                        Included free
                      </td>
                      <td className="px-5 py-3.5 text-[#576278]">
                        <XIcon className="mr-1 inline h-3.5 w-3.5 text-[#E63B2E]" />
                        Video &amp; text focus
                      </td>
                      <td className="px-5 py-3.5 text-[#576278]">
                        <XIcon className="mr-1 inline h-3.5 w-3.5 text-[#E63B2E]" />
                        Video &amp; text focus
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3.5 font-semibold text-[#131722]">
                        Review limits
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-[#131722]">Unlimited</td>
                      <td className="px-5 py-3.5 text-[#576278]">Tiered quotas</td>
                      <td className="px-5 py-3.5 text-[#576278]">2 video cap on starter</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3.5 font-semibold text-[#131722]">
                        Multiple brand spaces
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-[#131722]">
                        Unlimited ($0 extra)
                      </td>
                      <td className="px-5 py-3.5 text-[#576278]">Higher paid plans</td>
                      <td className="px-5 py-3.5 text-[#576278]">Higher paid plans</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3.5 font-semibold text-[#131722]">
                        Hide branding &amp; HTML export
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-[#131722]">Included free</td>
                      <td className="px-5 py-3.5 text-[#576278]">Paid plans only</td>
                      <td className="px-5 py-3.5 text-[#576278]">Paid plans only</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3.5 font-semibold text-[#131722]">
                        Import &amp; share reviews
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-[#131722]">
                        Google Maps, PH, LinkedIn, CSV
                      </td>
                      <td className="px-5 py-3.5 text-[#576278]">Import focused</td>
                      <td className="px-5 py-3.5 text-[#576278]">Import focused</td>
                    </tr>
                    <tr className="bg-[#EEF2FF]/70">
                      <td className="px-5 py-4 font-bold text-[#131722]">Monthly cost</td>
                      <td className="tabular-nums px-5 py-4 font-extrabold text-[#2142E7]">
                        $0 forever
                      </td>
                      <td className="tabular-nums px-5 py-4 text-[#4B5568]">$29–$59+/mo</td>
                      <td className="tabular-nums px-5 py-4 text-[#4B5568]">$20–$50+/mo</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
