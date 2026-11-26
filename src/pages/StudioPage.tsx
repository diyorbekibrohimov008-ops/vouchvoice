import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Copy,
  Inbox,
  Link2,
  Palette,
  Plus,
  RefreshCw,
  Settings,
  Upload,
} from 'lucide-react';
import { api, type TestimonialWithAudio } from '../lib/api';
import { StudioInboxTab } from '../components/studio/StudioInboxTab';
import { StudioWallTab } from '../components/studio/StudioWallTab';
import { StudioSyndicateTab } from '../components/studio/StudioSyndicateTab';
import { StudioImportTab } from '../components/studio/StudioImportTab';
import { NewSpaceModal, PlanSettingsModal } from '../components/studio/StudioModals';
import type {
  SpaceConfig,
  SyndicationEvent,
  SyndicationTarget,
  TestimonialStatus,
  UserProfile,
  Workspace,
} from '../../shared/types';

interface StudioPageProps {
  user: UserProfile;
  workspace: Workspace;
  spaces: SpaceConfig[];
  onWorkspaceUpdated: (ws: Workspace) => void;
  onSpacesUpdated: (spaces: SpaceConfig[]) => void;
  onNavigate: (path: string) => void;
}

type StudioTab = 'inbox' | 'wall' | 'import' | 'syndicate';

/** Authenticated review studio (`/studio`). */
export function StudioPage({
  user,
  workspace,
  spaces,
  onWorkspaceUpdated,
  onSpacesUpdated,
  onNavigate,
}: StudioPageProps) {
  const [activeSlug, setActiveSlug] = useState<string>(spaces[0]?.slug ?? '');
  const [activeTab, setActiveTab] = useState<StudioTab>('inbox');

  const [testimonials, setTestimonials] = useState<TestimonialWithAudio[]>([]);
  const [events, setEvents] = useState<SyndicationEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | TestimonialStatus | 'voice'>('all');
  const [toast, setToast] = useState<string | null>(null);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [showNewSpace, setShowNewSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceTagline, setNewSpaceTagline] = useState('');
  const [newSpaceColor, setNewSpaceColor] = useState('#2142e7');

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [customAiKey, setCustomAiKey] = useState('');

  const [embedType, setEmbedType] = useState<'script' | 'iframe' | 'react'>('script');

  const [selectedSynId, setSelectedSynId] = useState<string>('');
  const [webhookInput, setWebhookInput] = useState('');
  const [googleUrlInput, setGoogleUrlInput] = useState('');
  const [phSlugInput, setPhSlugInput] = useState('');

  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);

  const activeSpace = useMemo(
    () => spaces.find((s) => s.slug === activeSlug) ?? spaces[0],
    [spaces, activeSlug]
  );

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3200);
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeSpace) return;
    let active = true;
    audioRef.current?.pause();
    setPlayingId(null);
    setWebhookInput(activeSpace.webhookUrl || '');
    setGoogleUrlInput(activeSpace.googleMapsPlaceUrl || '');
    setPhSlugInput(activeSpace.productHuntSlug || '');
    setLoading(true);
    api
      .getSpaceTestimonials(activeSpace.slug)
      .then((res) => {
        if (!active) return;
        setTestimonials(res.testimonials);
        setEvents(res.events);
        const firstApproved = res.testimonials.find((t) => t.status === 'approved');
        setSelectedSynId(firstApproved?.id ?? res.testimonials[0]?.id ?? '');
      })
      .catch((err) => {
        if (active) showToast(err instanceof Error ? err.message : 'Failed to load reviews');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeSpace?.slug]);

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://vouchvoice.vercel.app';

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Copied ${label}`);
    } catch {
      showToast('Copy failed — select and copy manually');
    }
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createSpace({
        name: newSpaceName,
        tagline: newSpaceTagline,
        brandColor: newSpaceColor,
      });
      onSpacesUpdated([...spaces, res.space]);
      setActiveSlug(res.space.slug);
      setShowNewSpace(false);
      setNewSpaceName('');
      setNewSpaceTagline('');
      showToast(`Added "${res.space.name}" at $0 extra`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add brand space');
    }
  };

  const handlePatchSpace = async (patch: Partial<SpaceConfig>) => {
    if (!activeSpace) return;
    try {
      const res = await api.updateSpace(activeSpace.slug, patch);
      onSpacesUpdated(spaces.map((s) => (s.slug === res.space.slug ? res.space : s)));
      showToast('Saved changes');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleTestimonialPatch = async (
    id: string,
    patch: Parameters<typeof api.updateTestimonial>[2]
  ) => {
    if (!activeSpace) return;
    try {
      const res = await api.updateTestimonial(activeSpace.slug, id, patch);
      setTestimonials((prev) => prev.map((t) => (t.id === id ? res.testimonial : t)));
      showToast('Review updated');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update review');
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeSpace) return;
    try {
      await api.deleteTestimonial(activeSpace.slug, id);
      if (playingId === id) {
        audioRef.current?.pause();
        setPlayingId(null);
      }
      setTestimonials((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (selectedSynId === id) {
          setSelectedSynId(next[0]?.id ?? '');
        }
        return next;
      });
      showToast('Review deleted');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleSyndicate = async (target: SyndicationTarget) => {
    if (!activeSpace || !selectedSynId) return;
    try {
      const res = await api.syndicateTestimonial(activeSpace.slug, {
        testimonialId: selectedSynId,
        target,
      });
      setEvents((prev) => [res.event, ...prev]);
      setTestimonials((prev) => prev.map((t) => (t.id === res.testimonial.id ? res.testimonial : t)));

      if (target === 'linkedin') {
        await copyText(res.drafts.linkedinPost, 'LinkedIn post');
        window.open(res.drafts.linkedinShareUrl, '_blank', 'noopener,noreferrer');
      } else if (target === 'x') {
        window.open(res.drafts.xShareUrl, '_blank', 'noopener,noreferrer');
      } else if (target === 'google_maps') {
        await copyText(res.testimonial.cleanedText, 'approved review');
        window.open(res.drafts.googleMapsUrl, '_blank', 'noopener,noreferrer');
      } else if (target === 'product_hunt') {
        await copyText(res.testimonial.cleanedText, 'approved review');
        window.open(res.drafts.productHuntUrl, '_blank', 'noopener,noreferrer');
      } else if (target === 'webhook') {
        showToast(res.event.detail);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Share failed');
    }
  };

  const handleImport = async () => {
    if (!activeSpace || !importText.trim()) return;
    setImporting(true);
    try {
      const res = await api.importTestimonials(activeSpace.slug, { rawInput: importText });
      const refreshed = await api.getSpaceTestimonials(activeSpace.slug);
      setTestimonials(refreshed.testimonials);
      setImportText('');
      setActiveTab('inbox');
      showToast(`Imported ${res.importedCount} reviews into ${activeSpace.name}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleSaveAiKey = async () => {
    try {
      const res = await api.updateWorkspace({
        aiProvider: customAiKey.trim() ? 'openai' : 'built_in',
        customAiKey: customAiKey.trim() || null,
      });
      onWorkspaceUpdated(res.workspace);
      setCustomAiKey('');
      showToast('AI settings updated');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save AI settings');
    }
  };

  const handleResetDemo = async () => {
    try {
      const res = await api.resetDemo();
      onWorkspaceUpdated(res.workspace);
      onSpacesUpdated(res.spaces);
      setActiveSlug(res.spaces[0]?.slug ?? '');
      showToast('Demo studio reset');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Reset failed');
    }
  };

  const togglePlay = (t: TestimonialWithAudio) => {
    if (!t.audioUrl) return;
    if (playingId === t.id && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(t.audioUrl);
    audioRef.current = audio;
    setPlayingId(t.id);
    audio.play().catch(() => setPlayingId(null));
    audio.onended = () => setPlayingId(null);
  };

  if (!activeSpace) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#131722]">No brand spaces yet</h1>
        <p className="mt-2 text-sm text-[#4B5568]">
          Add your first brand space to start collecting 20-second voice reviews for free.
        </p>
        <button
          type="button"
          onClick={() => setShowNewSpace(true)}
          className="mt-5 cursor-pointer rounded-xl bg-[#2142E7] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1935C7]"
        >
          Add brand space
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {toast && (
        <div
          role="status"
          className="fixed right-5 bottom-5 z-50 rounded-xl bg-[#131722] px-4 py-3 text-xs font-bold text-white shadow-xl"
        >
          {toast}
        </div>
      )}

      {/* Studio Control Header */}
      <div className="rounded-2xl border border-[#DCE2EC] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#131722]">
              Review Studio
            </h1>
            <p className="mt-1 text-sm text-[#4B5568]">
              Collect customer reviews by voice in 20 seconds and put them on your website — free.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => copyText(`${origin}/collect/${activeSpace.slug}`, 'voice link')}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#2142E7] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1935C7]"
            >
              <Copy className="h-4 w-4" />
              <span>Copy voice link</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate(`/wall/${activeSpace.slug}`)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#CED6E3] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#131722] transition hover:bg-[#F4F6F8]"
            >
              <span>Preview page</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setShowPlanModal(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#CED6E3] bg-[#F4F6F8] px-3.5 py-2.5 text-xs font-semibold text-[#364055] transition hover:bg-[#E5E9F0]"
            >
              <Settings className="h-3.5 w-3.5 text-[#576278]" />
              <span>Optional AI settings</span>
            </button>

            {user.isDemo && (
              <button
                type="button"
                onClick={handleResetDemo}
                title="Reset demo data"
                aria-label="Reset demo data"
                className="inline-flex cursor-pointer items-center rounded-xl border border-[#CED6E3] p-2.5 text-[#576278] transition hover:bg-[#F4F6F8] hover:text-[#131722]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Brand Space Switcher & 3 Real Steps */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#E5E9F0] pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="business-select" className="text-xs font-semibold text-[#576278]">
              Brand space:
            </label>
            <select
              id="business-select"
              value={activeSpace.slug}
              onChange={(e) => setActiveSlug(e.target.value)}
              className="cursor-pointer rounded-xl border border-[#CED6E3] bg-[#F4F6F8] px-3 py-1.5 text-sm font-bold text-[#131722] focus:border-[#2142E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2142E7]/30"
            >
              {spaces.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowNewSpace(true)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#C9D6FF] bg-[#EEF2FF] px-3 py-1.5 text-xs font-bold text-[#2142E7] transition hover:bg-[#E0E7FF]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add brand space</span>
            </button>
          </div>

          <ol className="flex flex-wrap items-center gap-4 text-xs text-[#4B5568]">
            <li>
              <button
                type="button"
                onClick={() => setActiveTab('syndicate')}
                className="cursor-pointer font-semibold text-[#131722] hover:text-[#2142E7]"
              >
                1. Share your link
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setActiveTab('inbox')}
                className="cursor-pointer font-semibold text-[#131722] hover:text-[#2142E7]"
              >
                2. Approve reviews
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setActiveTab('wall')}
                className="cursor-pointer font-semibold text-[#131722] hover:text-[#2142E7]"
              >
                3. Copy the widget code
              </button>
            </li>
          </ol>
        </div>
      </div>

      {/* Plain-Language 4 Studio Tabs */}
      <div className="mt-5 flex flex-wrap gap-2">
        {(
          [
            { id: 'inbox', label: 'Reviews', icon: Inbox, count: testimonials.length },
            { id: 'wall', label: 'Website widget', icon: Palette },
            { id: 'import', label: 'Import', icon: Upload },
            { id: 'syndicate', label: 'Share link', icon: Link2 },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                active
                  ? 'bg-[#131722] text-white'
                  : 'border border-[#DCE2EC] bg-white text-[#475166] hover:bg-[#EEF1F6] hover:text-[#131722]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {'count' in tab && (
                <span
                  className={`tabular-nums rounded-md px-2 py-0.5 text-xs ${
                    active ? 'bg-white/20 text-white' : 'bg-[#EEF1F6] text-[#364055]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'inbox' && (
        <StudioInboxTab
          testimonials={testimonials}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          loading={loading}
          playingId={playingId}
          onTogglePlay={togglePlay}
          onPatchTestimonial={handleTestimonialPatch}
          onSyndicateClick={(id) => {
            setSelectedSynId(id);
            setActiveTab('syndicate');
          }}
          onDelete={handleDelete}
        />
      )}

      {activeTab === 'wall' && (
        <StudioWallTab
          space={activeSpace}
          testimonials={testimonials}
          origin={origin}
          embedType={embedType}
          onEmbedTypeChange={setEmbedType}
          onPatchSpace={handlePatchSpace}
          onCopyText={copyText}
          onCollectClick={() => onNavigate(`/collect/${activeSpace.slug}`)}
        />
      )}

      {activeTab === 'import' && (
        <StudioImportTab
          spaceName={activeSpace.name}
          importText={importText}
          onImportTextChange={setImportText}
          importing={importing}
          onImport={handleImport}
        />
      )}

      {activeTab === 'syndicate' && (
        <StudioSyndicateTab
          space={activeSpace}
          origin={origin}
          testimonials={testimonials}
          events={events}
          selectedSynId={selectedSynId}
          onSelectSynId={setSelectedSynId}
          googleUrlInput={googleUrlInput}
          onGoogleUrlChange={setGoogleUrlInput}
          phSlugInput={phSlugInput}
          onPhSlugChange={setPhSlugInput}
          webhookInput={webhookInput}
          onWebhookChange={setWebhookInput}
          onSaveSettings={() =>
            handlePatchSpace({
              googleMapsPlaceUrl: googleUrlInput,
              productHuntSlug: phSlugInput,
              webhookUrl: webhookInput,
            })
          }
          onSyndicate={handleSyndicate}
          onCopyText={copyText}
          onOpenCollector={() => onNavigate(`/collect/${activeSpace.slug}`)}
        />
      )}

      <NewSpaceModal
        open={showNewSpace}
        name={newSpaceName}
        tagline={newSpaceTagline}
        color={newSpaceColor}
        onNameChange={setNewSpaceName}
        onTaglineChange={setNewSpaceTagline}
        onColorChange={setNewSpaceColor}
        onClose={() => setShowNewSpace(false)}
        onSubmit={handleCreateSpace}
      />

      <PlanSettingsModal
        open={showPlanModal}
        workspace={workspace}
        customAiKey={customAiKey}
        onCustomAiKeyChange={setCustomAiKey}
        onSaveAiKey={handleSaveAiKey}
        onClose={() => setShowPlanModal(false)}
      />
    </div>
  );
}
