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
    setLoading(true);
    api
      .getPublicSpace(slug)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-slate-500">Loading Wall of Love…</div>
    );
  }

  if (!data) {
    return (
      <div className="p-12 text-center">
        <h1 className="text-xl font-bold text-slate-900">Wall not found</h1>
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
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
            <span>
              {data.stats.averageRating}/5 average · {data.stats.totalApproved} verified reviews ({data.stats.voiceCount} voice notes)
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {data.space.name} — Wall of Love
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">{data.space.tagline}</p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate(`/collect/${slug}`)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-md transition hover:opacity-95"
          style={{ backgroundColor: data.space.brandColor }}
        >
          <Mic className="h-4 w-4" />
          <span>Leave a 20s Voice Review</span>
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
