export type PlanTier = 'free';

export type WallLayout = 'masonry' | 'grid' | 'marquee' | 'spotlight' | 'badge';

export type WallTheme = 'paper' | 'midnight' | 'cream' | 'indigo';

export type ReviewTone = 'authentic' | 'crisp' | 'results';

export type TestimonialSource =
  | 'voice'
  | 'text'
  | 'senja_import'
  | 'testimonial_to_import'
  | 'google_import'
  | 'producthunt_import'
  | 'linkedin_import'
  | 'csv_import';

export type TestimonialStatus = 'pending' | 'approved' | 'archived';

export type SyndicationTarget =
  | 'linkedin'
  | 'google_maps'
  | 'product_hunt'
  | 'x'
  | 'webhook';

export interface SpacePrompts {
  step1: string;
  step2: string;
  step3: string;
}

export interface SpaceConfig {
  id: string;
  workspaceId: string;
  slug: string;
  name: string;
  tagline: string;
  brandColor: string;
  theme: WallTheme;
  layout: WallLayout;
  cardRadius: 'sharp' | 'soft' | 'pill';
  showRatings: boolean;
  showVoiceBadge: boolean;
  showMetrics: boolean;
  showCompany: boolean;
  hidePoweredBy: boolean;
  prompts: SpacePrompts;
  googleMapsPlaceUrl: string;
  productHuntSlug: string;
  linkedinHandle: string;
  webhookUrl: string;
  createdAt: string;
}

export interface Testimonial {
  id: string;
  spaceSlug: string;
  authorName: string;
  authorRole: string;
  authorCompany: string;
  authorAvatarColor: string;
  rating: number;
  rawTranscript: string;
  cleanedText: string;
  pullQuote: string;
  tone: ReviewTone;
  outcomeMetric: string | null;
  source: TestimonialSource;
  durationSec: number | null;
  hasAudio: boolean;
  audioKey: string | null;
  status: TestimonialStatus;
  featured: boolean;
  syndicatedTargets: SyndicationTarget[];
  tags: string[];
  fillersRemovedCount: number;
  createdAt: string;
  approvedAt: string | null;
}

export interface SyndicationEvent {
  id: string;
  spaceSlug: string;
  testimonialId: string;
  target: SyndicationTarget;
  status: 'sent' | 'handoff_copied' | 'intent_opened' | 'failed';
  detail: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerUserId: string;
  plan: PlanTier;
  licenseKey: string | null;
  hasCustomAiKey: boolean;
  aiProvider: 'built_in' | 'openai' | 'gemini';
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  workspaceId: string;
  isDemo?: boolean;
}

export interface TranscriptAnalysis {
  rawTranscript: string;
  cleanedByTone: Record<ReviewTone, string>;
  recommendedTone: ReviewTone;
  pullQuote: string;
  outcomeMetric: string | null;
  tags: string[];
  fillersRemovedCount: number;
  originalWordCount: number;
  cleanedWordCount: number;
  engine: 'built_in' | 'openai' | 'gemini';
}
