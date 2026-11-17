import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Copy,
  Inbox,
  KeyRound,
  Mic,
  Palette,
  Plus,
  RefreshCw,
  Send,
  Upload,
} from 'lucide-react';
import { api, type TestimonialWithAudio } from '../lib/api';
import { StudioInboxTab } from '../components/studio/StudioInboxTab';
import { StudioWallTab } from '../components/studio/StudioWallTab';
import { StudioSyndicateTab } from '../components/studio/StudioSyndicateTab';
import { StudioImportTab } from '../components/studio/StudioImportTab';
import { NewSpaceModal, PlanSettingsModal } from '../components/studio/StudioModals';
import type {
  PlanTier,
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

type StudioTab = 'inbox' | 'wall' | 'syndicate' | 'import';

/** Authenticated multi-brand founder studio (`/studio`). */
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

  const [showNewSpace, setShowNewSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceTagline, setNewSpaceTagline] = useState('');
  const [newSpaceColor, setNewSpaceColor] = useState('#4f46e5');

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
    window.setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    if (!activeSpace) return;
    setWebhookInput(activeSpace.webhookUrl || '');
    setGoogleUrlInput(activeSpace.googleMapsPlaceUrl || '');
    setPhSlugInput(activeSpace.productHuntSlug || '');
    setLoading(true);
    api
      .getSpaceTestimonials(activeSpace.slug)
      .then((res) => {
        setTestimonials(res.testimonials);
        setEvents(res.events);
        const firstApproved = res.testimonials.find((t) => t.status === 'approved');
        setSelectedSynId(firstApproved?.id ?? res.testimonials[0]?.id ?? '');
      })
      .catch((err) => showToast(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [activeSpace?.slug]);

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://vouchvoice.vercel.app';

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Copied ${label}`);
    } catch {
      showToast('Copy failed — select manually');
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
      showToast(`Created brand space "${res.space.name}" at $0 extra`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create space');
    }
  };

  const handlePatchSpace = async (patch: Partial<SpaceConfig>) => {
    if (!activeSpace) return;
    try {
      const res = await api.updateSpace(activeSpace.slug, patch);
      onSpacesUpdated(spaces.map((s) => (s.slug === res.space.slug ? res.space : s)));
      showToast('Saved customization');
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
      showToast('Updated testimonial');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeSpace) return;
    try {
      await api.deleteTestimonial(activeSpace.slug, id);
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
      showToast('Deleted testimonial');
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
      showToast(err instanceof Error ? err.message : 'Syndication failed');
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
      showToast(`Imported ${res.importedCount} testimonials into ${activeSpace.name}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handlePlanChange = async (plan: PlanTier) => {
    try {
      const res = await api.updateWorkspace({ plan });
      onWorkspaceUpdated(res.workspace);
      showToast(
        `Workspace switched to ${
          plan === 'lifetime_79'
            ? '$79 Lifetime License'
            : plan === 'maintenance_9'
            ? '$9/mo Maintenance'
            : 'Free Starter'
        }`
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Plan update failed');
    }
  };

  const handleSaveAiKey = async () => {
    const res = await api.updateWorkspace({
      aiProvider: customAiKey.trim() ? 'openai' : 'built_in',
      customAiKey: customAiKey.trim() || null,
    });
    onWorkspaceUpdated(res.workspace);
    setCustomAiKey('');
    showToast('AI provider updated');
  };

  const handleResetDemo = async () => {
    try {
      const res = await api.resetDemo();
      onWorkspaceUpdated(res.workspace);
      onSpacesUpdated(res.spaces);
      setActiveSlug(res.spaces[0]?.slug ?? '');
      showToast('Demo workspace reset');
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
        <h2 className="text-xl font-bold">No spaces yet</h2>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {toast && (
        <div className="fixed right-5 bottom-5 z-50 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xl">
          {toast}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {workspace.name} · {spaces.length} Brand {spaces.length === 1 ? 'Space' : 'Spaces'} ($0 extra)
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <select
                value={activeSpace.slug}
                onChange={(e) => setActiveSlug(e.target.value)}
                className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-extrabold text-slate-900 outline-none focus:border-indigo-500"
              >
                {spaces.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name} (/{s.slug})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowNewSpace(true)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Brand Space</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => copyText(`${origin}/collect/${activeSpace.slug}`, 'Voice Collector link')}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Copy className="h-3.5 w-3.5 text-indigo-600" />
            <span>Copy Collector Link</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate(`/collect/${activeSpace.slug}`)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700"
          >
            <Mic className="h-3.5 w-3.5" />
            <span>Open Collector</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate(`/wall/${activeSpace.slug}`)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            <span>Public Wall</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setShowPlanModal(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
          >
            <KeyRound className="h-3.5 w-3.5 text-emerald-400" />
            <span>
              {workspace.plan === 'lifetime_79'
                ? 'Lifetime ($79)'
                : workspace.plan === 'maintenance_9'
                ? '$9/mo Plan'
                : 'Free Plan'}
            </span>
          </button>

          {user.isDemo && (
            <button
              type="button"
              onClick={handleResetDemo}
              title="Reset demo data"
              className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(
          [
            { id: 'inbox', label: 'Testimonials Inbox', icon: Inbox, count: testimonials.length },
            { id: 'wall', label: 'Wall of Love & Embeds', icon: Palette },
            { id: 'syndicate', label: 'Two-Way Syndication', icon: Send },
            { id: 'import', label: 'Switch from Senja / Import', icon: Upload },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
                active
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {'count' in tab && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
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
          workspacePlan={workspace.plan}
          testimonials={testimonials}
          origin={origin}
          embedType={embedType}
          onEmbedTypeChange={setEmbedType}
          onPatchSpace={handlePatchSpace}
          onCopyText={copyText}
          onCollectClick={() => onNavigate(`/collect/${activeSpace.slug}`)}
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
        onSelectPlan={handlePlanChange}
        onSaveAiKey={handleSaveAiKey}
        onClose={() => setShowPlanModal(false)}
      />
    </div>
  );
}
