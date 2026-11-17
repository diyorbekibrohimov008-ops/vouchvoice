import type { TestimonialSource } from './types';
import { cleanTranscriptLocally } from './transcriptAi';

export interface ImportedReviewInput {
  authorName: string;
  authorRole: string;
  authorCompany: string;
  rating: number;
  text: string;
  source: TestimonialSource;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

export function detectImportSource(raw: string): TestimonialSource {
  const lower = raw.toLowerCase();
  if (lower.includes('senja') || lower.includes('customer_name') || lower.includes('approved_at')) {
    return 'senja_import';
  }
  if (lower.includes('testimonial.to') || lower.includes('testimonialtext') || lower.includes('customercompany')) {
    return 'testimonial_to_import';
  }
  if (lower.includes('google') && lower.includes('maps')) return 'google_import';
  if (lower.includes('producthunt') || lower.includes('product hunt')) return 'producthunt_import';
  if (lower.includes('linkedin')) return 'linkedin_import';
  return 'csv_import';
}

export function parseImportPayload(
  rawInput: string,
  preferredSource?: TestimonialSource,
  brandName?: string
): ImportedReviewInput[] {
  const trimmed = rawInput.trim();
  if (!trimmed) return [];

  const detectedSource = preferredSource ?? detectImportSource(trimmed);

  // 1. JSON array or object with items/testimonials/reviews array (Senja / Testimonial.to export format)
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed)
        ? parsed
        : parsed.testimonials ?? parsed.reviews ?? parsed.items ?? parsed.data ?? [];
      if (Array.isArray(list)) {
        return list
          .map((item: Record<string, unknown>) => {
            const text = String(
              item.cleanedText ??
                item.text ??
                item.quote ??
                item.testimonialText ??
                item.content ??
                item.comment ??
                item.body ??
                ''
            ).trim();
            if (!text) return null;
            const authorName = String(
              item.authorName ??
                item.author ??
                item.customer_name ??
                item.customerName ??
                item.name ??
                'Verified Customer'
            ).trim();
            const authorRole = String(
              item.authorRole ?? item.role ?? item.title ?? item.customerTitle ?? 'Customer'
            ).trim();
            const authorCompany = String(
              item.authorCompany ?? item.company ?? item.customerCompany ?? ''
            ).trim();
            const ratingNum = Number(item.rating ?? item.stars ?? item.score ?? 5);
            const rating = Number.isFinite(ratingNum) ? Math.max(1, Math.min(5, Math.round(ratingNum))) : 5;
            const cleaned = cleanTranscriptLocally(text, brandName).cleanedByTone.authentic;
            return {
              authorName,
              authorRole,
              authorCompany,
              rating,
              text: cleaned || text,
              source: detectedSource,
            };
          })
          .filter((x): x is ImportedReviewInput => x !== null);
      }
    } catch {
      // Fall through to CSV/line parser
    }
  }

  // 2. CSV with header row
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2 && lines[0].includes(',')) {
    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const looksLikeHeader = headers.some((h) =>
      ['name', 'author', 'customer', 'text', 'quote', 'review', 'testimonial', 'content'].some((k) =>
        h.includes(k)
      )
    );
    if (looksLikeHeader) {
      const findIdx = (keys: string[]) => headers.findIndex((h) => keys.some((k) => h.includes(k)));
      const nameIdx = findIdx(['name', 'author', 'customer']);
      const roleIdx = findIdx(['role', 'title', 'job']);
      const companyIdx = findIdx(['company', 'org', 'brand']);
      const ratingIdx = findIdx(['rating', 'star', 'score']);
      const textIdx = findIdx(['text', 'quote', 'review', 'testimonial', 'content', 'comment', 'body']);

      const results: ImportedReviewInput[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const text = (textIdx >= 0 ? cols[textIdx] : cols[cols.length - 1] ?? '').trim();
        if (!text) continue;
        const ratingNum = ratingIdx >= 0 ? Number(cols[ratingIdx]) : 5;
        results.push({
          authorName: (nameIdx >= 0 ? cols[nameIdx] : '') || 'Verified Customer',
          authorRole: (roleIdx >= 0 ? cols[roleIdx] : '') || 'Customer',
          authorCompany: companyIdx >= 0 ? cols[companyIdx] || '' : '',
          rating: Number.isFinite(ratingNum) && ratingNum > 0 ? Math.max(1, Math.min(5, Math.round(ratingNum))) : 5,
          text: cleanTranscriptLocally(text, brandName).cleanedByTone.authentic || text,
          source: detectedSource,
        });
      }
      if (results.length > 0) return results;
    }
  }

  // 3. Plain-text multi-line reviews ("Quote" - Name, Role @ Company)
  return lines
    .map((line) => {
      const dashSplit = line.match(/^["“]?(.+?)["”]?\s+[—–-]\s+([^,@]+?)(?:,\s*([^@]+?))?(?:\s*@\s*(.+))?$/);
      if (dashSplit) {
        return {
          authorName: dashSplit[2].trim(),
          authorRole: (dashSplit[3] ?? 'Customer').trim(),
          authorCompany: (dashSplit[4] ?? '').trim(),
          rating: 5,
          text: cleanTranscriptLocally(dashSplit[1].trim(), brandName).cleanedByTone.authentic,
          source: detectedSource,
        };
      }
      return {
        authorName: 'Imported Reviewer',
        authorRole: 'Customer',
        authorCompany: '',
        rating: 5,
        text: cleanTranscriptLocally(line, brandName).cleanedByTone.authentic,
        source: detectedSource,
      };
    })
    .filter((item) => item.text.length > 0);
}
