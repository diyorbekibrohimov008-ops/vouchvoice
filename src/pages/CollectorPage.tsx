import { useEffect, useRef, useState } from 'react';
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
  const copyTimerRef = useRef<number | null>(null);

  const recorder = useVoiceRecorder(setError);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingSpace(true);
    api
      .getPublicSpace(slug)
      .then((res) => {
        if (!active) return;
        setSpaceData(res);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Space not found');
      })
      .finally(() => {
        if (active) setLoadingSpace(false);
      });
    return () => {
      active = false;
    };
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
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedTarget(null);
        copyTimerRef.current = null;
      }, 3000);
    } catch {
      // ignore clipboard restrictions
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loadingSpace) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-[#576278]">
        Loading voice recorder…
      </div>
    );
  }

  if (!spaceData) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold text-[#131722]">Review link not found</h1>
        <p className="mt-2 text-sm text-[#576278]">{error || 'This collection link is unavailable.'}</p>
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="mt-5 cursor-pointer rounded-xl bg-[#131722] px-5 py-2.5 text-sm font-bold text-white"
        >
          Go home
        </button>
      </div>
    );
  }

  const { space } = spaceData;
  const prompts = [space.prompts.step1, space.prompts.step2, space.prompts.step3];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <div className="mb-7">
        <p className="text-sm font-bold text-[#2142E7]">{space.name}</p>
        <h1 className="font-display mt-1.5 text-3xl font-extrabold tracking-[-0.025em] text-[#131722] sm:text-4xl">
          Skip the camera and leave a 20-second voice note
        </h1>
        <p className="mt-2 text-sm text-[#4B5568]">{space.tagline}</p>
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
