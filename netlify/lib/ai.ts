import { cleanTranscriptLocally } from '../../shared/transcriptAi';
import type { ReviewTone, TranscriptAnalysis } from '../../shared/types';

function getEnvVar(name: string): string | undefined {
  const netlifyGlobal = (globalThis as Record<string, unknown>).Netlify as
    | { env?: { get: (k: string) => string | undefined } }
    | undefined;
  return netlifyGlobal?.env?.get(name) ?? (typeof process !== 'undefined' ? process.env[name] : undefined);
}

export async function transcribeAudioWithOpenAI(
  audioBuffer: ArrayBuffer,
  mimeType: string,
  apiKey: string
): Promise<string | null> {
  try {
    const ext = mimeType.includes('mp4')
      ? 'mp4'
      : mimeType.includes('wav')
      ? 'wav'
      : mimeType.includes('mpeg')
      ? 'mp3'
      : 'webm';
    const form = new FormData();
    form.append('file', new Blob([audioBuffer], { type: mimeType }), `voice-note.${ext}`);
    form.append('model', 'whisper-1');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string };
    return data.text?.trim() || null;
  } catch {
    return null;
  }
}

export async function polishTranscriptWithLLM(params: {
  rawTranscript: string;
  brandName?: string;
  customKey?: string | null;
  preferredProvider?: 'built_in' | 'openai' | 'gemini';
}): Promise<TranscriptAnalysis> {
  const local = cleanTranscriptLocally(params.rawTranscript, params.brandName);
  if (!params.rawTranscript.trim()) return local;

  const openAiKey =
    (params.preferredProvider === 'openai' && params.customKey) ||
    getEnvVar('OPENAI_API_KEY') ||
    (params.customKey?.startsWith('sk-') ? params.customKey : undefined);

  if (openAiKey) {
    try {
      const prompt = `Clean up this raw spoken customer voice-note transcript for "${params.brandName || 'our product'}".
Remove filler words (um, uh, like, you know), stutters, and false starts while preserving 100% of the customer's factual claims and authentic tone. Never invent numbers or claims.
Return strict JSON:
{
  "authentic": "...",
  "crisp": "tight 2-sentence version",
  "results": "leads with measurable outcome if any, else crisp version",
  "pullQuote": "best 6-14 word punchy headline quote",
  "outcomeMetric": "exact metric mentioned or null",
  "recommendedTone": "authentic" | "crisp" | "results"
}
Transcript:
"""${params.rawTranscript}"""`;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = json.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content) as Partial<{
            authentic: string;
            crisp: string;
            results: string;
            pullQuote: string;
            outcomeMetric: string | null;
            recommendedTone: ReviewTone;
          }>;
          if (parsed.authentic) {
            return {
              ...local,
              cleanedByTone: {
                authentic: parsed.authentic,
                crisp: parsed.crisp || local.cleanedByTone.crisp,
                results: parsed.results || local.cleanedByTone.results,
              },
              pullQuote: parsed.pullQuote || local.pullQuote,
              outcomeMetric: parsed.outcomeMetric ?? local.outcomeMetric,
              recommendedTone: parsed.recommendedTone || local.recommendedTone,
              cleanedWordCount: parsed.authentic.split(/\s+/).length,
              engine: 'openai',
            };
          }
        }
      }
    } catch {
      // Fall back safely to built-in deterministic cleaner
    }
  }

  return local;
}
