import type { ReviewTone, TranscriptAnalysis } from './types';

const HESITATION_FILLERS =
  /\b(?:um+|uh+|uhh+|uhm+|erm+|er+|hmm+|mhm+|ah+)\b[,.\s]*/gi;

const PHRASE_FILLERS =
  /\b(?:you know what i mean|you know|i mean|to be completely honest|to be honest|honestly speaking|kind of like|sort of like|sort of|kind of|at the end of the day|like i said)\b[,.\s]*/gi;

const ADVERB_CRUTCHES =
  /(?:^|[\s,])\b(?:basically|literally|actually)\b(?=[,\s]|$)/gi;

const CONTEXTUAL_LIKE =
  /(?:,\s*like\s*,|\blike,\s+|(?<=\b(?:was|is|are|were|felt|feels|spent|took|saved))\s+like\s+(?=(?:super|really|so|totally|way|very|pretty|kind|sort|um|uh|\d)\b))/gi;

const STUTTER_WORDS =
  /\b(i|we|you|they|it|he|she|the|a|an|is|was|are|were|very|really|so|to|and|that|this|in|on|for|my|our)\s+\1\b/gi;

const LEAD_IN_NOISE =
  /^(?:so\s+yeah[,.\s]*|yeah[,.\s]+|well[,.\s]+|okay\s+so[,.\s]+|okay[,.\s]+|so[,.\s]+|anyway[,.\s]+)+/i;

const TAG_RULES: Array<{ tag: string; pattern: RegExp }> = [
  { tag: 'Speed', pattern: /\b(fast|quick|seconds|minutes|instant|speed|rapid|hours)\b/i },
  { tag: 'Ease of Use', pattern: /\b(easy|simple|intuitive|clean|one[- ]tap|effortless|smooth)\b/i },
  { tag: 'ROI & Growth', pattern: /\b(roi|revenue|sales|conversions?|customers?|leads?|clients?|doubled|tripled|\dx|\d+%|\$\d+)\b/i },
  { tag: 'Voice-First', pattern: /\b(voice|audio|mic|microphone|speak|talking|camera|video)\b/i },
  { tag: 'Pricing', pattern: /\b(price|pricing|cheap|affordable|worth|lifetime|subscription|save[sd]?\s+\$)\b/i },
  { tag: 'Support', pattern: /\b(support|team|helpful|responsive|onboarding)\b/i },
];

function countMatches(text: string, regex: RegExp): number {
  let count = 0;
  regex.lastIndex = 0;
  if (!regex.global) {
    return regex.test(text) ? 1 : 0;
  }
  while (regex.exec(text) !== null) {
    count += 1;
  }
  regex.lastIndex = 0;
  return count;
}

function normalizePunctuation(input: string): string {
  let out = input
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*,+/g, ',')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/([,.!?]){2,}/g, '$1')
    .replace(/^[,.\s]+/, '')
    .trim();

  // Capitalize standalone "i" and contractions like "i'm", "i've", "i'll", "i'd"
  out = out.replace(/\bi(?=(?:'(?:m|ve|ll|d|re))?\b)/g, 'I');

  // Split overly long run-on speech at natural pivots
  out = out.replace(/,\s+(and honestly|and then|so now|so overall|plus|and now)\s+/gi, '. $1 ');

  const sentences = out
    .split(/(?<=[.!?])\s+|\s*;\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => {
      const cleaned = s.replace(/^[,.\s]+/, '');
      if (!cleaned) return '';
      const capped = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      return /[.!?]$/.test(capped) ? capped : `${capped}.`;
    })
    .filter(Boolean);

  return sentences.join(' ').replace(/\s+/g, ' ').trim();
}

export function extractOutcomeMetric(text: string): string | null {
  const patterns = [
    /\b\d+(?:\.\d+)?x(?:\s+(?:more|faster|higher|better|lift|increase|growth))?/i,
    /\b\d+%(?:\s+(?:more|faster|higher|increase|boost|drop|reduction|lift|saved))?/i,
    /\$\d[\d,]*(?:\.\d+)?(?:\s*(?:\/mo|\/month|a month|saved|in revenue|MRR))?/i,
    /\b(?:saves?|saved|saving|cut|cutting|reduced?|reduces?|spent|eliminated?)\s+(?:over\s+|around\s+|nearly\s+)?\d+(?:\.\d+)?\s+(?:hours?|hrs?|minutes?|mins?|days?|weeks?)(?:\s+(?:a|per)\s+(?:week|day|month))?/i,
    /\b(?:in|under)\s+\d+\s+(?:seconds?|minutes?|mins?|hours?)\b/i,
    /\b(?:half the time|twice as fast|10x faster)\b/i,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) return m[0].trim();
  }
  return null;
}

export function extractTags(text: string): string[] {
  const tags: string[] = [];
  for (const rule of TAG_RULES) {
    if (rule.pattern.test(text)) {
      tags.push(rule.tag);
    }
  }
  return tags.length > 0 ? tags.slice(0, 4) : ['Customer Story'];
}

export function extractPullQuote(text: string): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) return '';

  let best = sentences[0];
  let bestScore = -1;

  for (const s of sentences) {
    const words = s.split(/\s+/).length;
    let score = 0;
    if (words >= 5 && words <= 18) score += 4;
    else if (words <= 24) score += 2;
    if (/\d|%|\$|x\b/i.test(s)) score += 3;
    if (/\b(love|best|saved|changed|game[- ]?changer|recommend|instant|finally|zero|effortless|worth)\b/i.test(s)) {
      score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }

  return best.replace(/[.]+$/, '').trim();
}

function makeCrispVariant(authentic: string): string {
  const sentences = authentic
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(LEAD_IN_NOISE, '').trim())
    .map((s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : ''))
    .filter(Boolean);

  if (sentences.length <= 2) return sentences.join(' ');

  // Keep first impact sentence and last recommendation/closing sentence
  const picked = [sentences[0]];
  const metricIdx = sentences.findIndex((s, i) => i > 0 && /\d|%|\$|x\b/i.test(s));
  if (metricIdx > 0) {
    picked.push(sentences[metricIdx]);
  }
  const last = sentences[sentences.length - 1];
  if (!picked.includes(last) && picked.length < 3) {
    picked.push(last);
  }
  return picked.join(' ');
}

function makeResultsVariant(authentic: string): string {
  const sentences = authentic
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 1) return authentic;

  const outcomeIdx = sentences.findIndex((s) =>
    /\d|%|\$|x\b|\b(saved|doubled|tripled|cut|faster|conversions?|revenue|approved)\b/i.test(s)
  );
  if (outcomeIdx <= 0) return makeCrispVariant(authentic);

  const reordered = [
    sentences[outcomeIdx],
    ...sentences.filter((_, idx) => idx !== outcomeIdx),
  ];
  return reordered.slice(0, 3).join(' ');
}

export function cleanTranscriptLocally(rawTranscript: string, brandName?: string): TranscriptAnalysis {
  const raw = rawTranscript.trim();
  const originalWordCount = raw ? raw.split(/\s+/).length : 0;

  if (!raw) {
    return {
      rawTranscript: '',
      cleanedByTone: { authentic: '', crisp: '', results: '' },
      recommendedTone: 'authentic',
      pullQuote: '',
      outcomeMetric: null,
      tags: ['Customer Story'],
      fillersRemovedCount: 0,
      originalWordCount: 0,
      cleanedWordCount: 0,
      engine: 'built_in',
    };
  }

  let fillersCount = 0;
  let working = raw;

  fillersCount += countMatches(working, HESITATION_FILLERS);
  working = working.replace(HESITATION_FILLERS, ' ');

  fillersCount += countMatches(working, PHRASE_FILLERS);
  working = working.replace(PHRASE_FILLERS, ' ');

  fillersCount += countMatches(working, CONTEXTUAL_LIKE);
  working = working.replace(CONTEXTUAL_LIKE, ' ');

  fillersCount += countMatches(working, ADVERB_CRUTCHES);
  working = working.replace(ADVERB_CRUTCHES, ' ');

  // Collapse stutter repetitions (run twice for triple stutters)
  for (let pass = 0; pass < 2; pass++) {
    const stutters = countMatches(working, STUTTER_WORDS);
    fillersCount += stutters;
    working = working.replace(STUTTER_WORDS, '$1');
  }

  working = working.replace(LEAD_IN_NOISE, '');

  if (brandName && brandName.trim().length > 2) {
    const cleanBrand = brandName.trim();
    const targetLower = cleanBrand.toLowerCase();
    const lowerWorking = working.toLowerCase();
    let idx = lowerWorking.indexOf(targetLower);
    while (idx !== -1) {
      const prevChar = idx > 0 ? working[idx - 1] : ' ';
      const nextChar = idx + cleanBrand.length < working.length ? working[idx + cleanBrand.length] : ' ';
      const isBoundaryBefore = !/[A-Za-z0-9_]/.test(prevChar);
      const isBoundaryAfter = !/[A-Za-z0-9_]/.test(nextChar);
      if (isBoundaryBefore && isBoundaryAfter) {
        working = working.slice(0, idx) + cleanBrand + working.slice(idx + cleanBrand.length);
      }
      idx = lowerWorking.indexOf(targetLower, idx + cleanBrand.length);
    }
  }

  const authentic = normalizePunctuation(working);
  const crisp = makeCrispVariant(authentic);
  const results = makeResultsVariant(authentic);
  const outcomeMetric = extractOutcomeMetric(authentic);
  const recommendedTone: ReviewTone = outcomeMetric ? 'results' : 'authentic';
  const pullQuote = extractPullQuote(authentic);
  const tags = extractTags(authentic);
  const cleanedWordCount = authentic ? authentic.split(/\s+/).length : 0;

  return {
    rawTranscript: raw,
    cleanedByTone: {
      authentic,
      crisp,
      results,
    },
    recommendedTone,
    pullQuote,
    outcomeMetric,
    tags,
    fillersRemovedCount: fillersCount,
    originalWordCount,
    cleanedWordCount,
    engine: 'built_in',
  };
}
