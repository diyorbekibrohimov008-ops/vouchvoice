import { describe, expect, it } from 'vitest';
import { parseImportPayload } from '../shared/importer';

describe('parseImportPayload', () => {
  it('parses Senja JSON exports cleanly', () => {
    const json = JSON.stringify([
      {
        customer_name: 'Alex Morgan',
        role: 'Founder',
        company: 'TrackFlow',
        rating: 5,
        text: 'Um, TrackFlow literally doubled our activation rate in 2 weeks.',
      },
      {
        customer_name: 'Lina Wu',
        role: 'PM',
        rating: 4,
        quote: 'Super intuitive setup.',
      },
    ]);

    const rows = parseImportPayload(json, 'senja_import', 'TrackFlow');
    expect(rows).toHaveLength(2);
    expect(rows[0].authorName).toBe('Alex Morgan');
    expect(rows[0].text).not.toMatch(/\bum\b/i);
    expect(rows[1].rating).toBe(4);
    expect(rows[0].source).toBe('senja_import');
  });

  it('parses CSV exports from Testimonial.to', () => {
    const csv = [
      'customerName,customerTitle,customerCompany,rating,testimonialText',
      '"Sam Lee","CEO","Acme Ops",5,"Saved us $400 a month right away!"',
      '"Nina Patel","Designer","Studio Nine",5,"Love the clean embeds."',
    ].join('\n');

    const rows = parseImportPayload(csv, 'testimonial_to_import');
    expect(rows).toHaveLength(2);
    expect(rows[0].authorCompany).toBe('Acme Ops');
    expect(rows[0].text).toContain('$400');
  });
});
