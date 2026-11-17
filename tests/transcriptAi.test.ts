import { describe, expect, it } from 'vitest';
import { cleanTranscriptLocally } from '../shared/transcriptAi';

describe('cleanTranscriptLocally', () => {
  it('strips hesitation fillers and stutters while preserving intentional "like"', () => {
    const raw =
      'Um, so before using VouchVoice, I I really like how clean it is, uh, and it was, like, super fast, you know? Basically we cut review collection down to 20 seconds and boosted signups by 35%.';

    const result = cleanTranscriptLocally(raw, 'VouchVoice');

    expect(result.fillersRemovedCount).toBeGreaterThanOrEqual(4);
    expect(result.cleanedByTone.authentic).toContain('I really like how clean it is');
    expect(result.cleanedByTone.authentic).not.toMatch(/\b(um|uh|you know|basically)\b/i);
    expect(result.cleanedByTone.authentic).not.toContain('I I ');
    expect(result.outcomeMetric).toMatch(/35%/i);
    expect(result.recommendedTone).toBe('results');
    expect(result.cleanedByTone.results.startsWith('We cut') || result.cleanedByTone.results.includes('35%')).toBe(true);
    expect(result.pullQuote.length).toBeGreaterThan(10);
  });

  it('produces distinct crisp and authentic outputs for multi-sentence voice notes', () => {
    const raw =
      'Okay so I started using PulseDeck last month because our roadmap was chaos. Honestly I hate recording videos on camera. Now our whole team saves 5 hours a week and I recommend it to every founder.';
    const res = cleanTranscriptLocally(raw, 'PulseDeck');

    expect(res.outcomeMetric).toMatch(/5 hours/i);
    expect(res.tags).toContain('Speed');
    expect(res.cleanedByTone.crisp.length).toBeLessThanOrEqual(res.cleanedByTone.authentic.length);
  });
});
