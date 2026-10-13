/**
 * ViralCut Centralized Typed API Client
 * Interfaces with the Python FastAPI backend engine (port 8000) and companion Express routes.
 */

export interface HealthCheckResponse {
  status: string;
  service?: string;
  version?: string;
  python_version?: string;
  ffmpeg_available?: boolean;
  ffmpeg_path?: string;
  timestamp?: string;
}

export interface YouTubeExtractRequest {
  url: string;
  preferred_quality?: string;
  extract_audio?: boolean;
}

export interface YouTubeExtractResponse {
  video_id: string;
  title: string;
  author?: string;
  duration: number;
  thumbnail_url?: string;
  audio_url?: string;
  video_url?: string;
  transcript?: string;
  has_transcript?: boolean;
  status?: string;
}

export interface SubtitleWord {
  word: string;
  start: number;
  end: number;
}

export interface SubtitleSegmentPayload {
  id?: string;
  start: number;
  end: number;
  text: string;
  timecode?: string;
  words?: SubtitleWord[];
  on_screen_text?: string;
  visual_cue?: string;
  sound_effect?: string;
}

export interface TranscribePayload {
  audio_url?: string;
  audio_base64?: string;
  mime_type?: string;
  language?: string;
  video_title?: string;
}

export interface TranscribeResponse {
  transcript: string;
  language: string;
  segments: SubtitleSegmentPayload[];
  duration_sec?: number;
  summary?: string;
  suggested_title?: string;
  engine?: string;
}

export type CaptionPreset = 'hormozi' | 'beast' | 'clean' | 'neon';

export interface CaptionStyleConfig {
  preset?: CaptionPreset;
  font_family?: string;
  font_size?: number;
  primary_color?: string;
  outline_color?: string;
  outline_width?: number;
  all_caps?: boolean;
  position?: 'bottom' | 'center' | 'top';
  margin_v?: number;
}

export interface RenderVideoPayload {
  video_url?: string;
  video_base64?: string;
  subtitles: SubtitleSegmentPayload[];
  style_preset?: CaptionPreset;
  style?: CaptionStyleConfig;
  output_format?: 'mp4' | 'webm';
  aspect_ratio?: '9:16' | '16:9';
}

export interface RenderVideoResponse {
  task_id: string;
  status: 'completed' | 'pending' | 'failed';
  output_url?: string;
  output_filename?: string;
  duration_sec?: number;
  render_log?: string;
  error?: string;
}

const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '';

/**
 * Core generic request helper with JSON parsing and offline backend diagnostics.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errMsg =
        data?.detail ||
        data?.error ||
        data?.message ||
        `Request to ${endpoint} failed with HTTP status ${res.status}`;
      throw new Error(typeof errMsg === 'object' ? JSON.stringify(errMsg) : errMsg);
    }

    return data as T;
  } catch (err: unknown) {
    if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
      throw new Error(
        `ViralCut backend service unavailable at ${url}. Please ensure either Vite dev server or Python FastAPI backend (http://127.0.0.1:8000) is running.`
      );
    }
    throw err;
  }
}

/**
 * Standardized API client instance.
 */
export const apiClient = {
  /**
   * Check system health and FFmpeg / Python environment status.
   */
  checkHealth: (): Promise<HealthCheckResponse> => {
    return apiRequest<HealthCheckResponse>('/api/health');
  },

  /**
   * Extract video stream URLs and auto-captions from a YouTube URL.
   */
  extractYoutube: (
    url: string,
    preferred_quality?: string
  ): Promise<YouTubeExtractResponse> => {
    return apiRequest<YouTubeExtractResponse>('/api/extract-youtube', {
      method: 'POST',
      body: JSON.stringify({ url, preferred_quality }),
    });
  },

  /**
   * Transcribe spoken audio using multimodal AI.
   */
  transcribeAudio: (payload: TranscribePayload): Promise<TranscribeResponse> => {
    return apiRequest<TranscribeResponse>('/api/transcribe', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Burn synchronized subtitles into 9:16 vertical short-form video using FFmpeg.
   */
  renderVideo: (payload: RenderVideoPayload): Promise<RenderVideoResponse> => {
    return apiRequest<RenderVideoResponse>('/api/render-video', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        style_preset: payload.style_preset || 'hormozi',
        aspect_ratio: payload.aspect_ratio || '9:16',
      }),
    });
  },

  /**
   * Regenerate hook variation for viral short-form scripts.
   */
  regenerateHook: (payload: {
    scriptTopic: string;
    currentHook: string;
    reelTitle: string;
    language?: string;
  }) => {
    return apiRequest<{ hooks: unknown[] }>('/api/regenerate-hook', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Optimize viral retention strategy based on analytics logs.
   */
  adjustStrategy: (performanceLogs: unknown[]) => {
    return apiRequest<unknown>('/api/adjust-strategy', {
      method: 'POST',
      body: JSON.stringify({ performanceLogs }),
    });
  },

  /**
   * Generate text-to-speech voiceover.
   */
  generateTTS: (payload: unknown) => {
    return apiRequest<{ audioBase64: string; mimeType: string }>('/api/tts/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

export default apiClient;
