import { useEffect, useState } from 'react';
import { Mic } from 'lucide-react';
import { api, type PublicSpaceResponse } from '../lib/api';
import type { ReviewTone, TranscriptAnalysis } from '../../shared/types';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { CollectorRecordStep } from '../components/collector/CollectorRecordStep';
import { CollectorReviewStep } from '../components/collector/CollectorReviewStep';
import { CollectorDoneStep } from '../components/collector/CollectorDoneStep';

interface CollectorPageProps {
  slug: string;
  onNavigate: (path: string) => void;
}

/** Public 20-second voice testimonial collector page (`/collect/:slug`). */
export function CollectorPage({ slug, onNavigate }: CollectorPageProps) {
  const [spaceData, setSpaceData] = useState<PublicSpaceResponse | null>(null);
  const [loadingSpace, setLoadingSpace] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'record' | 'review' | 'done'>('record');
  const [activePromptIdx, setActivePromptIdx] = useState(0);

  const [polishing, setPolishing] = useState(false);
  const [analysis, setAnalysis] = useState<TranscriptAnalysis | null>(null);
  const [selectedTone, setSelectedTone] = useState<ReviewTone>('authentic');
  const [editedText, setEditedText] = useState('');
  const [pullQuote, setPullQuote] = useState('');

  const [rating, setRating] = useState(5);
  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState('');
  const [authorCompany, setAuthorCompany] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [handoff, setHandoff] = useState<{
    googleMapsUrl: string | null;
    productHuntUrl: string | null;
  } | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);

  const recorder = useVoiceRecorder(setError);

  useEffect(() => {
    setLoadingSpace(true);
    api
      .getPublicSpace(slug)
      .then((res) => {
        setSpaceData(res);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Space not found'))
      .finally(() => setLoadingSpace(false));
  }, [slug]);

  const handlePolish = async () => {
    if (!recorder.rawTranscript.trim() && !recorder.audioBase64) {
      setError('Record a quick voice note, load a sample, or type a couple sentences first.');
      return;
    }
    setError(null);
    setPolishing(true);
    try {
      const res = await api.polishTranscript({
        rawTranscript:
          recorder.rawTranscript.trim() ||
          `Um, I really love using ${spaceData?.space.name ?? 'this product'}, it saved me hours every week and works super cleanly.`,
        brandName: spaceData?.space.name,
        spaceSlug: slug,
        audioBase64: recorder.audioBase64,
        audioMimeType: recorder.audioMimeType,
      });
      setAnalysis(res);
      setSelectedTone(res.recommendedTone);
      setEditedText(res.cleanedByTone[res.recommendedTone]);
      setPullQuote(res.pullQuote);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clean transcript');
    } finally {
      setPolishing(false);
    }
  };

  const handleToneChange = (tone: ReviewTone) => {
    setSelectedTone(tone);
    if (analysis) {
      setEditedText(analysis.cleanedByTone[tone]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !editedText.trim()) {
      setError('Please enter your name and review text.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.submitPublicTestimonial(slug, {
        authorName,
        authorRole,
        authorCompany,
        rating,
        rawTranscript: recorder.rawTranscript || editedText,
        cleanedText: editedText,
        pullQuote,
        tone: selectedTone,
        outcomeMetric: analysis?.outcomeMetric ?? null,
        tags: analysis?.tags ?? ['Customer Story'],
        fillersRemovedCount: analysis?.fillersRemovedCount ?? 0,
        source: recorder.audioBase64 ? 'voice' : 'text',
        durationSec: recorder.audioBase64 ? recorder.seconds || 18 : null,
        audioBase64: recorder.audioBase64,
        audioMimeType: recorder.audioMimeType,
      });
      setHandoff(res.handoff);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyAndLaunch = async (target: 'google' | 'producthunt', url: string) => {
    try {
      await navigator.clipboard.writeText(editedText);
      setCopiedTarget(target);
      window.setTimeout(() => setCopiedTarget(null), 3000);
    } catch {
      // ignore clipboard restrictions
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loadingSpace) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-slate-500">
        Loading collector…
      </div>
    );
  }

  if (!spaceData) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-slate-900">Space not found</h1>
        <p className="mt-2 text-sm text-slate-500">{error || 'This collection link is unavailable.'}</p>
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="mt-5 cursor-pointer rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white"
        >
          Go home
        </button>
      </div>
    );
  }

  const { space } = spaceData;
  const prompts = [space.prompts.step1, space.prompts.step2, space.prompts.step3];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <div className="mb-6 text-center">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold text-white shadow-sm"
          style={{ backgroundColor: space.brandColor }}
        >
          <Mic className="h-3.5 w-3.5" />
          <span>{space.name}</span>
        </span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Skip the camera — leave a 20-second voice note
        </h1>
        <p className="mt-2 text-sm text-slate-600">{space.tagline}</p>
      </div>

      {step === 'record' && (
        <CollectorRecordStep
          brandColor={space.brandColor}
          prompts={prompts}
          activePromptIdx={activePromptIdx}
          onSelectPrompt={setActivePromptIdx}
          recording={recorder.recording}
          seconds={recorder.seconds}
          levels={recorder.levels}
          hasAudio={Boolean(recorder.audioBase64)}
          audioPreviewUrl={recorder.audioPreviewUrl}
          playingPreview={recorder.playingPreview}
          rawTranscript={recorder.rawTranscript}
          onChangeTranscript={recorder.setRawTranscript}
          polishing={polishing}
          error={error}
          onStartRecording={recorder.startRecording}
          onStopRecording={recorder.stopRecording}
          onSampleVoice={recorder.handleSampleVoice}
          onFileUpload={recorder.handleFileUpload}
          onTogglePreview={recorder.toggleAudioPreview}
          onPolish={handlePolish}
        />
      )}

      {step === 'review' && (
        <CollectorReviewStep
          analysis={analysis}
          selectedTone={selectedTone}
          onToneChange={handleToneChange}
          pullQuote={pullQuote}
          onPullQuoteChange={setPullQuote}
          editedText={editedText}
          onEditedTextChange={setEditedText}
          rating={rating}
          onRatingChange={setRating}
          authorName={authorName}
          onAuthorNameChange={setAuthorName}
          authorRole={authorRole}
          onAuthorRoleChange={setAuthorRole}
          authorCompany={authorCompany}
          onAuthorCompanyChange={setAuthorCompany}
          error={error}
          submitting={submitting}
          onBack={() => setStep('record')}
          onSubmit={handleSubmit}
        />
      )}

      {step === 'done' && (
        <CollectorDoneStep
          slug={slug}
          spaceName={space.name}
          authorName={authorName}
          editedText={editedText}
          handoff={handoff}
          copiedTarget={copiedTarget}
          onCopyAndLaunch={handleCopyAndLaunch}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
