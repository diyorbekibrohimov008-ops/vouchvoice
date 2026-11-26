import { useEffect, useRef, useState } from 'react';
import { blobToBase64, uint8ToBase64DataUrl } from '../lib/api';
import { synthesizeDemoWav } from '../../shared/demoAudio';

const MAX_AUDIO_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB backend cap

const SAMPLE_VOICE_TRANSCRIPTS = [
  'Um, so before using PulseDeck AI, I was like spending literally 3 hours every week sorting customer notes, you know? Honestly I hate recording videos on camera, so this 20-second voice note took zero effort. Now our team ships 2x faster and saved $400 a month.',
  'Uh yeah, I started using this because I really like simple tools, you know? Basically onboarding took under 5 minutes and our signup conversion jumped 28% in the first week. Definitely recommend it to small business owners.',
];

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

/** Manages browser microphone capture, live waveform bars, SpeechRecognition captions, sample audio, and file upload. */
export function useVoiceRecorder(onError: (msg: string | null) => void) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(Array(20).fill(18));
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/webm');
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [playingPreview, setPlayingPreview] = useState(false);
  const [rawTranscript, setRawTranscript] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const speechRef = useRef<SpeechRecognitionInstance | null>(null);
  const timerRef = useRef<number | null>(null);
  const animRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const stopPreviewAudio = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (mountedRef.current) setPlayingPreview(false);
  };

  const replacePreviewUrl = (nextUrl: string | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    if (!mountedRef.current) {
      if (nextUrl) URL.revokeObjectURL(nextUrl);
      previewUrlRef.current = null;
      return;
    }
    previewUrlRef.current = nextUrl;
    setAudioPreviewUrl(nextUrl);
  };

  const stopStreams = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animRef.current !== null) {
      window.cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    try {
      speechRef.current?.stop();
    } catch {
      // ignore
    }
    speechRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopStreams();
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const startRecording = async () => {
    onError(null);
    stopPreviewAudio();

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onError('Microphone recording is unavailable in this browser. Try the sample voice note or upload audio below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;

      const isSupported = typeof MediaRecorder.isTypeSupported === 'function';
      const preferredMime =
        isSupported && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : isSupported && MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        try {
          const mime = recorder.mimeType || 'audio/webm';
          const blob = new Blob(chunks, { type: mime });
          if (blob.size === 0 || !mountedRef.current) return;
          const b64 = await blobToBase64(blob);
          if (!mountedRef.current) return;
          setAudioMimeType(mime);
          setAudioBase64(b64);
          replacePreviewUrl(URL.createObjectURL(blob));
        } catch {
          if (mountedRef.current) {
            onError('Could not process the recorded audio. Please try again or type your review.');
          }
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
      setSeconds(0);

      const AudioCtxCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxCtor) {
        try {
          const ctx = new AudioCtxCtor();
          audioCtxRef.current = ctx;
          const src = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          src.connect(analyser);
          const freq = new Uint8Array(analyser.frequencyBinCount);

          const tickWave = () => {
            analyser.getByteFrequencyData(freq);
            const bars = Array.from({ length: 20 }, (_, i) => {
              const val = freq[i % freq.length] ?? 0;
              return Math.max(14, Math.min(100, Math.round((val / 255) * 100)));
            });
            setLevels(bars);
            animRef.current = window.requestAnimationFrame(tickWave);
          };
          tickWave();
        } catch {
          // Waveform visualization is optional; keep recording even if AudioContext fails
        }
      }

      timerRef.current = window.setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);

      const win = window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
      };
      const SpeechCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechCtor) {
        try {
          const sr = new SpeechCtor();
          sr.continuous = true;
          sr.interimResults = true;
          sr.lang = 'en-US';
          sr.onresult = (ev) => {
            let finalText = '';
            for (let i = 0; i < ev.results.length; i++) {
              finalText += ev.results[i][0].transcript + ' ';
            }
            setRawTranscript(finalText.trim());
          };
          sr.onerror = () => {};
          sr.start();
          speechRef.current = sr;
        } catch {
          // SpeechRecognition is optional; keep microphone recording active
        }
      }
    } catch {
      stopStreams();
      setRecording(false);
      onError('Microphone permission was denied. You can still upload an audio file or try the sample voice note.');
    }
  };

  const stopRecording = () => {
    setRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopStreams();
    setLevels(Array(20).fill(18));
  };

  const handleSampleVoice = () => {
    onError(null);
    stopPreviewAudio();
    const sampleIdx = Math.floor(Math.random() * SAMPLE_VOICE_TRANSCRIPTS.length);
    const wavBytes = synthesizeDemoWav(sampleIdx + 3, 2.2);
    const dataUrl = uint8ToBase64DataUrl(wavBytes, 'audio/wav');
    const copy = new Uint8Array(wavBytes.byteLength);
    copy.set(wavBytes);
    const blobUrl = URL.createObjectURL(new Blob([copy.buffer], { type: 'audio/wav' }));
    setAudioBase64(dataUrl);
    setAudioMimeType('audio/wav');
    replacePreviewUrl(blobUrl);
    setSeconds(18);
    setRawTranscript(SAMPLE_VOICE_TRANSCRIPTS[sampleIdx]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    onError(null);
    stopPreviewAudio();

    if (file.size > MAX_AUDIO_UPLOAD_BYTES) {
      onError('Audio file is too large (max 5 MB). Please choose a shorter clip.');
      return;
    }

    try {
      const b64 = await blobToBase64(file);
      setAudioBase64(b64);
      setAudioMimeType(file.type || 'audio/webm');
      replacePreviewUrl(URL.createObjectURL(file));
      if (!seconds) setSeconds(20);
    } catch {
      onError('Could not read that audio file. Please try another clip or type your review.');
    }
  };

  const toggleAudioPreview = () => {
    if (!audioPreviewUrl) return;
    if (playingPreview && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPlayingPreview(false);
      return;
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    const audio = new Audio(audioPreviewUrl);
    previewAudioRef.current = audio;
    setPlayingPreview(true);
    audio.play().catch(() => setPlayingPreview(false));
    audio.onended = () => setPlayingPreview(false);
  };

  return {
    recording,
    seconds,
    levels,
    audioBase64,
    audioMimeType,
    audioPreviewUrl,
    playingPreview,
    rawTranscript,
    setRawTranscript,
    startRecording,
    stopRecording,
    handleSampleVoice,
    handleFileUpload,
    toggleAudioPreview,
  };
}
