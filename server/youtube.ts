import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  author: string;
  thumbnailUrl: string;
  transcript?: string;
  hasTranscript: boolean;
  audioPath?: string;
  mimeType?: string;
}

export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
}

/**
 * Attempt to extract YouTube video metadata, subtitles, and/or audio stream
 * using the Python yt-dlp CLI engine.
 */
async function fetchViaPythonExtractor(url: string): Promise<YouTubeVideoInfo | null> {
  try {
    const scriptPath = path.resolve(process.cwd(), 'backend', 'app', 'extract_cli.py');
    const pythonExe = process.platform === 'win32' ? 'python' : 'python3';

    const { stdout } = await execFileAsync(pythonExe, [scriptPath, '--url', url], {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });

    const parsed = JSON.parse(stdout.trim());
    if (parsed.error) {
      console.warn('[Python Extractor] Subprocess error:', parsed.error);
      return null;
    }

    return {
      videoId: parsed.videoId,
      title: parsed.title,
      author: parsed.author,
      thumbnailUrl: parsed.thumbnailUrl,
      transcript: parsed.transcript || undefined,
      hasTranscript: Boolean(parsed.hasTranscript),
      audioPath: parsed.audioPath || undefined,
      mimeType: parsed.mimeType || undefined,
    };
  } catch (err: any) {
    console.warn('[Python Extractor] Subprocess failed or python unavailable, falling back:', err?.message || err);
    return null;
  }
}

export async function fetchYouTubeData(urlOrId: string): Promise<YouTubeVideoInfo> {
  const videoId = extractYouTubeId(urlOrId);
  if (!videoId) {
    throw new Error('Invalid YouTube URL or Video ID. Please check the link and try again.');
  }

  // 1. Primary: High-accuracy extraction via yt-dlp Python engine
  const pyResult = await fetchViaPythonExtractor(urlOrId);
  if (pyResult && (pyResult.hasTranscript || pyResult.audioPath)) {
    return pyResult;
  }

  let title = pyResult?.title || `YouTube Video (${videoId})`;
  let author = pyResult?.author || 'Creator';
  const thumbnailUrl = pyResult?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  // 2. Try to fetch oEmbed details if title is still default
  try {
    const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      if (oembed.title) title = oembed.title;
      if (oembed.author_name) author = oembed.author_name;
    }
  } catch (err) {
    console.warn('oEmbed fetch failed:', err);
  }

  // 2. Try to fetch transcript from watch page caption tracks
  let transcript = '';
  try {
    const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (watchRes.ok) {
      const html = await watchRes.text();
      // Look for captionTracks in ytInitialPlayerResponse
      const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});(?:var|\s*<\/script>)/);
      if (playerMatch) {
        try {
          const playerData = JSON.parse(playerMatch[1]);
          const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          if (Array.isArray(captionTracks) && captionTracks.length > 0) {
            // Find English track first, or fallback to first track
            const enTrack = captionTracks.find((t: any) => t.languageCode === 'en' || t.languageCode?.startsWith('en')) || captionTracks[0];
            if (enTrack?.baseUrl) {
              const captionRes = await fetch(enTrack.baseUrl);
              if (captionRes.ok) {
                const xmlText = await captionRes.text();
                // Parse <text start="X" dur="Y">clean text</text>
                const textMatches = Array.from(xmlText.matchAll(/<text start="([\d\.]+)"(?: dur="([\d\.]+)")?[^>]*>(.*?)<\/text>/g));
                if (textMatches.length > 0) {
                  transcript = textMatches
                    .map((m) => {
                      const start = parseFloat(m[1]);
                      const min = Math.floor(start / 60);
                      const sec = Math.floor(start % 60);
                      const timeStr = `[${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}]`;
                      const decoded = m[3]
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/\n/g, ' ')
                        .trim();
                      return `${timeStr} ${decoded}`;
                    })
                    .filter((line) => line.length > 8)
                    .join('\n');
                }
              }
            }
          }
        } catch (parseErr) {
          console.warn('Failed parsing caption JSON:', parseErr);
        }
      }
    }
  } catch (err) {
    console.warn('Watch page caption scrape failed:', err);
  }

  return {
    videoId,
    title,
    author,
    thumbnailUrl,
    transcript: transcript || undefined,
    hasTranscript: Boolean(transcript && transcript.length > 50),
  };
}
