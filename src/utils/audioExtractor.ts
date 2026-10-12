import { VideoSubtitleSegment } from '../types';
import { formatSRTTimecode, formatVTTTimecode } from './nleExport';

/**
 * Encodes an ArrayBuffer or Uint8Array into a base64 string in chunks to avoid stack overflow.
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 32768;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

/**
 * Encodes a 1-channel (mono) Float32Array PCM into a standard 16-bit PCM WAV ArrayBuffer.
 */
export function encodeMonoWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Write ASCII string helper
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // chunkSize
  writeString(8, 'WAVE');

  // fmt subchunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // audioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // numChannels
  view.setUint32(24, sampleRate, true); // sampleRate
  view.setUint32(28, byteRate, true); // byteRate
  view.setUint16(32, blockAlign, true); // blockAlign
  view.setUint16(34, 16, true); // bitsPerSample

  // data subchunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write 16-bit PCM samples with clipping
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  return buffer;
}

/**
 * Resamples an AudioBuffer to target sample rate (default 16000Hz mono)
 */
export function resampleToMono16k(audioBuffer: AudioBuffer, targetSampleRate: number = 16000): Float32Array {
  const origLength = audioBuffer.length;
  const origRate = audioBuffer.sampleRate;
  const channels = audioBuffer.numberOfChannels;

  // Mix down to mono first if stereo/multichannel
  const monoSamples = new Float32Array(origLength);
  for (let c = 0; c < channels; c++) {
    const channelData = audioBuffer.getChannelData(c);
    for (let i = 0; i < origLength; i++) {
      monoSamples[i] += channelData[i] / channels;
    }
  }

  if (origRate === targetSampleRate) {
    return monoSamples;
  }

  // Linear interpolation resampling
  const newLength = Math.round((origLength * targetSampleRate) / origRate);
  const resampled = new Float32Array(newLength);
  const ratio = (origLength - 1) / (newLength - 1);

  for (let i = 0; i < newLength; i++) {
    const origIndex = i * ratio;
    const low = Math.floor(origIndex);
    const high = Math.min(low + 1, origLength - 1);
    const weight = origIndex - low;
    resampled[i] = monoSamples[low] * (1 - weight) + monoSamples[high] * weight;
  }

  return resampled;
}

/**
 * Extracts and compresses audio track from a video or audio file into a 16kHz mono WAV Base64.
 * This is lightweight (~1.9MB per 60s) and ideal for Gemini speech-to-text.
 */
export async function extractAudioFromMediaFile(
  file: File,
  maxDurationSec: number = 240,
  onStatus?: (status: string) => void
): Promise<{
  audioBase64: string;
  mimeType: string;
  durationSec: number;
  sampleRate: number;
}> {
  onStatus?.('Reading media file...');
  const arrayBuffer = await file.arrayBuffer();

  onStatus?.('Decoding audio track with Web Audio API...');
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Web Audio API is not supported in this browser.');
  }

  const audioContext = new AudioContextClass();
  let audioBuffer: AudioBuffer;

  try {
    // Slice to protect buffer if reused
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
  } catch (err: any) {
    console.warn('Native decodeAudioData failed, checking direct fallback:', err);
    throw new Error(
      `Could not decode audio from "${file.name}". Ensure the file contains a valid audio track (MP4, WebM, MOV, MP3, WAV, M4A).`
    );
  } finally {
    if (audioContext.state !== 'closed') {
      audioContext.close().catch(() => {});
    }
  }

  const origDuration = audioBuffer.duration;
  onStatus?.(`Audio track decoded (${Math.round(origDuration)}s). Resampling to 16kHz mono...`);

  // Cap duration if needed
  let samplesToProcess = audioBuffer;
  if (origDuration > maxDurationSec) {
    const targetLength = Math.floor(maxDurationSec * audioBuffer.sampleRate);
    const clippedBuffer = new AudioBuffer({
      numberOfChannels: audioBuffer.numberOfChannels,
      length: targetLength,
      sampleRate: audioBuffer.sampleRate,
    });
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      clippedBuffer.copyToChannel(audioBuffer.getChannelData(c).subarray(0, targetLength), c);
    }
    samplesToProcess = clippedBuffer;
  }

  const mono16kSamples = resampleToMono16k(samplesToProcess, 16000);
  onStatus?.('Packaging 16-bit WAV PCM buffer...');
  const wavBuffer = encodeMonoWav(mono16kSamples, 16000);
  const uint8View = new Uint8Array(wavBuffer);

  onStatus?.('Converting audio to base64 payload...');
  const base64 = uint8ArrayToBase64(uint8View);

  return {
    audioBase64: base64,
    mimeType: 'audio/wav',
    durationSec: Math.min(origDuration, maxDurationSec),
    sampleRate: 16000,
  };
}

/**
 * Converts extracted subtitles array to SubRip (.SRT) format
 */
export function subtitlesToSRT(subtitles: VideoSubtitleSegment[]): string {
  return subtitles
    .map((sub, index) => {
      const idx = index + 1;
      const start = formatSRTTimecode(sub.startSec);
      const end = formatSRTTimecode(sub.endSec);
      const text = sub.text.trim();
      return `${idx}\n${start} --> ${end}\n${text}\n`;
    })
    .join('\n');
}

/**
 * Converts extracted subtitles array to WebVTT (.VTT) format
 */
export function subtitlesToVTT(subtitles: VideoSubtitleSegment[]): string {
  const header = 'WEBVTT\n\n';
  const body = subtitles
    .map((sub, index) => {
      const idx = index + 1;
      const start = formatVTTTimecode(sub.startSec);
      const end = formatVTTTimecode(sub.endSec);
      const text = sub.text.trim();
      return `${idx}\n${start} --> ${end}\n${text}\n`;
    })
    .join('\n');
  return header + body;
}

/**
 * Converts extracted subtitles array to structured JSON
 */
export function subtitlesToJSON(subtitles: VideoSubtitleSegment[], metadata?: Record<string, any>): string {
  return JSON.stringify(
    {
      format: 'viralcut_subtitles_v1',
      exportedAt: new Date().toISOString(),
      metadata,
      subtitles,
    },
    null,
    2
  );
}
