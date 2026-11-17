import type { SpaceConfig, Testimonial } from './types';

export interface SyndicationDrafts {
  linkedinPost: string;
  linkedinShareUrl: string;
  xPost: string;
  xShareUrl: string;
  googleMapsUrl: string;
  productHuntUrl: string;
}

export function buildSyndicationDrafts(
  testimonial: Testimonial,
  space: SpaceConfig,
  originUrl: string
): SyndicationDrafts {
  const attribution = [
    testimonial.authorName,
    testimonial.authorRole,
    testimonial.authorCompany,
  ]
    .filter(Boolean)
    .join(', ');

  const metricLine = testimonial.outcomeMetric
    ? `\n\nResult highlighted: ${testimonial.outcomeMetric}`
    : '';

  const voiceTag = testimonial.hasAudio
    ? ` (captured from a ${testimonial.durationSec ?? 20}s voice note)`
    : '';

  const wallLink = `${originUrl.replace(/\/$/, '')}/wall/${space.slug}`;

  const linkedinPost = [
    `What ${testimonial.authorName} told us after trying ${space.name}${voiceTag}:`,
    '',
    `"${testimonial.cleanedText}"`,
    `— ${attribution}${metricLine}`,
    '',
    `No scripted sales copy—just real customer proof.`,
    `See our Wall of Love: ${wallLink}`,
  ].join('\n');

  const xText = `"${testimonial.pullQuote || testimonial.cleanedText.slice(0, 140)}" — ${testimonial.authorName} on ${space.name} ${wallLink}`;

  const googleMapsUrl = space.googleMapsPlaceUrl?.trim()
    ? space.googleMapsPlaceUrl.trim()
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(space.name)}`;

  const productHuntSlug = space.productHuntSlug?.trim() || space.slug;
  const productHuntUrl = `https://www.producthunt.com/products/${encodeURIComponent(productHuntSlug)}/reviews`;

  return {
    linkedinPost,
    linkedinShareUrl: `https://www.linkedin.com/feed/?shareActive=true&mini=true&text=${encodeURIComponent(linkedinPost)}`,
    xPost: xText,
    xShareUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}`,
    googleMapsUrl,
    productHuntUrl,
  };
}
