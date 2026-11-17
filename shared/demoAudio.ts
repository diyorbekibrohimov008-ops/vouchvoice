/**
 * Generates a compact, valid 8kHz mono 16-bit PCM WAV buffer with a gentle
 * harmonic cadence so seeded and sample voice testimonials have real playable audio.
 */
export function synthesizeDemoWav(seed = 1, durationSec = 2.0): Uint8Array {
  const sampleRate = 8000;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const baseFreqs = [220, 261.63, 293.66, 329.63, 392.0];
  const baseFreq = baseFreqs[Math.abs(seed) % baseFreqs.length];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope =
      Math.min(1, t / 0.08) *
      Math.min(1, (durationSec - t) / 0.15) *
      (0.55 + 0.45 * Math.sin(2 * Math.PI * 3.2 * t));
    const formant =
      Math.sin(2 * Math.PI * (baseFreq + 14 * Math.sin(2 * Math.PI * 2.1 * t)) * t) * 0.55 +
      Math.sin(2 * Math.PI * baseFreq * 1.5 * t) * 0.25 +
      Math.sin(2 * Math.PI * baseFreq * 2.0 * t) * 0.12;
    const sample = Math.max(-1, Math.min(1, formant * envelope * 0.35));
    view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
  }

  return new Uint8Array(buffer);
}
