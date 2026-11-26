import { useEffect, useState } from 'react';
import { Mic, Star } from 'lucide-react';
import { api, type PublicSpaceResponse } from '../lib/api';
import { WallPreview } from '../components/WallPreview';

interface PublicWallPageProps {
  slug: string;
  embedMode?: boolean;
  onNavigate: (path: string) => void;
}

export function PublicWallPage({ slug, embedMode = false, onNavigate }: PublicWallPageProps) {
  const [data, setData] = useState<PublicSpaceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getPublicSpace(slug)
      .then((res) => {
        if (active) setData(res);
      })
      .catch(() => {
        if (active) setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-[#576278]">Loading customer reviews…</div>
    );
  }

  if (!data) {
    return (
      <div className="p-12 text-center">
        <h1 className="font-display text-xl font-bold text-[#131722]">Review page not found</h1>
      </div>
    );
  }

  if (embedMode) {
    return (
      <div className="p-3">
        <WallPreview
          space={data.space}
          testimonials={data.testimonials}
          onCollectClick={() => window.open(`/collect/${slug}`, '_blank', 'noopener')}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[#E5E9F0] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#4B5568]">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
            <span className="tabular-nums">
              {data.stats.averageRating}/5 average across {data.stats.totalApproved} verified reviews ({data.stats.voiceCount} voice notes)
            </span>
          </div>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-[-0.025em] text-[#131722] sm:text-4xl">
            {data.space.name} customer reviews
          </h1>
          <p className="mt-1.5 text-sm text-[#4B5568]">{data.space.tagline}</p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate(`/collect/${slug}`)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition hover:opacity-95"
          style={{ backgroundColor: data.space.brandColor || '#2142e7' }}
        >
          <Mic className="h-4 w-4" />
          <span>Leave a 20s voice review</span>
        </button>
      </div>

      <WallPreview
        space={data.space}
        testimonials={data.testimonials}
        onCollectClick={() => onNavigate(`/collect/${slug}`)}
      />
    </div>
  );
}
