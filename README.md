# VouchVoice

Voice-prompted AI testimonials, customizable "Wall of Love" widgets, and two-way syndication — built as an anti-paywall, 100% free alternative to Senja and Testimonial.to.

> [!WARNING]
> **Project Status — Work in Progress (Not Fully Ready)**
> This project is currently under active development and is **not fully ready for production**. Some parts, features, or workflow steps will fail or behave unexpectedly. We are actively working on fixing all remaining issues.

## Key Features

- **20-Second Voice-Prompted AI Transcripts (`/collect/:slug`)**: Guided 3-prompt mobile-first voice recorder (`MediaRecorder` + live Web Audio waveform + Web Speech API) with built-in zero-key disfluency cleanup (or optional OpenAI Whisper + GPT-4o-mini BYOK) and 1-tap customer approval.
- **Customizable Wall of Love & Universal Embed (`/wall/:slug`, `/embed.js`)**: Shadow DOM `<script src="/embed.js">` widget, iframe embed, React snippet, and **Standalone Self-Hosted HTML Bundle export** across Masonry, Grid, Marquee, Spotlight, and Floating Pill layouts.
- **Two-Way Syndication Hub (`/studio`)**:
  - **Outbound**: 1-tap clipboard + deep-link handoff to Google Maps & Product Hunt upon approval, auto-generated LinkedIn founder posts + downloadable SVG quote cards, X post intents, and outbound webhook delivery.
  - **Inbound**: 30-second migration importer for Senja JSON, Testimonial.to CSV, and raw text reviews.
- **100% Free Forever ($0/mo — All Features Unlocked)**: Unlimited brand spaces at $0 extra per space, unlimited voice notes, white-label branding removal, standalone HTML export, and two-way syndication — completely free forever with no paywalls, no trials, and no credit card required.

## Local Development

```bash
npm install
npm test
npm run dev
```
