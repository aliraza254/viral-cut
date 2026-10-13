/**
 * Unified Multi-LLM and Speech Transcription Engine for ViralCut.
 * Supports:
 * 1. Google Gemini (Gemini 3.8 Flash, Flash Latest)
 * 2. OpenAI (GPT-4o, GPT-4o-mini, Whisper API)
 * 3. Anthropic Claude (Claude 3.7 Sonnet, Claude 3.5 Sonnet, Haiku)
 *
 * Implements automatic provider failover and graceful fallbacks.
 */

import { ai } from './gemini';
import { generateContentWithFallback, safeJsonParse, extractErrorMessage } from './geminiRunner';

export type LlmProvider = 'auto' | 'gemini' | 'openai' | 'claude';

export interface ProviderStatus {
  gemini: { hasKey: boolean; maskedKey: string | null };
  openai: { hasKey: boolean; maskedKey: string | null };
  claude: { hasKey: boolean; maskedKey: string | null };
  activeProvider: string;
}

export function getProviderStatus(): ProviderStatus {
  const geminiKey = process.env.GEMINI_API_KEY?.trim() || '';
  const openaiKey = process.env.OPENAI_API_KEY?.trim() || '';
  const claudeKey = process.env.ANTHROPIC_API_KEY?.trim() || '';

  const mask = (key: string) =>
    key.length > 8 ? `${key.slice(0, 5)}...${key.slice(-4)}` : null;

  let active = 'none';
  if (geminiKey) active = 'gemini';
  else if (openaiKey) active = 'openai';
  else if (claudeKey) active = 'claude';

  return {
    gemini: {
      hasKey: Boolean(geminiKey && geminiKey.length > 10),
      maskedKey: mask(geminiKey),
    },
    openai: {
      hasKey: Boolean(openaiKey && openaiKey.length > 15),
      maskedKey: mask(openaiKey),
    },
    claude: {
      hasKey: Boolean(claudeKey && claudeKey.length > 15),
      maskedKey: mask(claudeKey),
    },
    activeProvider: active,
  };
}

/**
 * Invokes OpenAI chat completions with JSON mode
 */
async function callOpenAI(messages: { role: string; content: string }[], model = 'gpt-4o') {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  });

  const data = (await response.json()) as any;
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI request failed: ${response.statusText}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned empty message content');
  return safeJsonParse(content);
}

/**
 * Invokes Anthropic Claude messages API
 */
async function callClaude(prompt: string, systemPrompt: string, model = 'claude-3-5-sonnet-20241022') {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: `${systemPrompt}\nIMPORTANT: Respond with ONLY a valid, raw JSON object. Do not include markdown codeblocks or preamble text.`,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = (await response.json()) as any;
  if (!response.ok) {
    throw new Error(data.error?.message || `Claude request failed: ${response.statusText}`);
  }

  const text = data.content?.[0]?.text;
  if (!text) throw new Error('Claude returned empty content');
  return safeJsonParse(text);
}

/**
 * Transcribes audio via OpenAI Whisper API
 */
export async function transcribeWithOpenAIWhisper(audioBuffer: Buffer, fileName = 'audio.wav') {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/wav' });
  formData.append('file', blob, fileName);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');
  formData.append('timestamp_granularities[]', 'segment');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  const data = (await response.json()) as any;
  if (!response.ok) {
    throw new Error(data.error?.message || 'OpenAI Whisper API failed');
  }

  const rawSegments = data.segments || [];
  const subtitles = rawSegments.map((s: any, idx: number) => {
    const start = round2(s.start);
    const end = round2(s.end);
    const mins1 = Math.floor(start / 60);
    const secs1 = Math.floor(start % 60);
    const mins2 = Math.floor(end / 60);
    const secs2 = Math.floor(end % 60);
    const timecode = `[${String(mins1).padStart(2, '0')}:${String(secs1).padStart(2, '0')} - ${String(mins2).padStart(2, '0')}:${String(secs2).padStart(2, '0')}]`;
    const text = s.text.trim();

    return {
      id: `sub-${idx + 1}`,
      startSec: start,
      endSec: end,
      timecode,
      text,
      onScreenText: text.split(/\s+/).slice(0, 3).join(' ').toUpperCase(),
      visualCue: idx % 2 === 0 ? 'Close-up punch-in on speaker' : 'Wide cut',
      soundEffect: idx === 0 ? 'Whoosh' : '-',
      words: (s.words || []).map((w: any) => ({
        word: w.word.trim(),
        startSec: round2(w.start),
        endSec: round2(w.end),
      })),
    };
  });

  return {
    engine: 'openai_whisper_api',
    detectedLanguage: data.language || 'English',
    durationSec: round2(data.duration || (subtitles[subtitles.length - 1]?.endSec ?? 30)),
    fullTranscript: data.text || '',
    subtitles,
    summary: 'Transcribed via OpenAI Whisper API',
    suggestedTitle: fileName.replace(/\.[^/.]+$/, ''),
  };
}

function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export interface GenerateReelsOptions {
  transcript: string;
  videoTitle?: string;
  platform?: string;
  language?: 'english' | 'roman-urdu';
  viralStyle?: string;
  clipDuration?: string;
  targetAudience?: string;
  strategyFeedback?: string;
  provider?: LlmProvider;
}

/**
 * Universal Viral Reel Script Generation with automatic multi-provider fallback.
 * Provider chain: Gemini -> OpenAI (GPT-4o) -> Anthropic Claude (3.5 Sonnet).
 */
export async function generateViralReelsUnified(options: GenerateReelsOptions) {
  const {
    transcript,
    videoTitle = 'Video',
    platform = 'reels',
    language = 'english',
    viralStyle = 'pattern-interrupt',
    clipDuration = '30-60s',
    targetAudience = 'general mobile audience seeking engaging insights',
    strategyFeedback = '',
    provider = 'auto',
  } = options;

  const isRomanUrdu = language === 'roman-urdu';

  const systemInstruction = `You are a world-class viral short-form retention director and master scriptwriter for YouTube Shorts, Instagram Reels, and TikTok.

Your goal: Take a long-form video transcript or topic and engineer 2 to 3 DISTINCT, high-probability viral short scripts (15-60s) that WILL blow up on the algorithms.

CRITICAL REQUIREMENTS:
1. OUTPUT LANGUAGE:
   ${
     isRomanUrdu
       ? `**MANDATORY LANGUAGE: URDU (ROMAN) / ROMAN URDU**
   - The spokenScript, startingPunchline, closingPunchline, soundBiteQuote, and onScreenText MUST be written in natural, punchy, conversational ROMAN URDU (Urdu written using the English/Latin alphabet, e.g., "Agar aap abhi tak yeh ghalti kar rahay hain toh foran ruk jayen!", "99% log yeh baat bilkul nahi jaantay...", "Yeh secret aapki growth ko 10x kar dega").
   - You can include common modern creator English buzzwords where natural (like "views", "video", "content", "algorithm", "secret", "money", "offer").
   - Do NOT use Arabic/Urdu script (نستعلیق), ONLY use Latin/English letters (Roman Urdu).
   - Visual cues and sound effect descriptions can remain in English for the video editor.`
       : `**LANGUAGE: ENGLISH**
   - All spoken text, hooks, and on-screen text must be in fluent, compelling English.`
   }
2. FRESH & ADAPTED: DO NOT copy the video transcript verbatim.
3. STARTING PUNCHLINE: Stop the thumb scroll in 0 to 2.5 seconds.
4. CLOSING PUNCHLINE & LOOP: Memorable closing line that loops back seamlessly to the hook.
5. Provide 4-6 chronological segments per reel with timecode, startSec, endSec, spokenScript, visualCue, onScreenText, soundEffect.

Return valid JSON with key "reels": [ { id, title, hookType, startingPunchline, closingPunchline, estimatedDuration, viralityScore, whyItWillBlowUp, soundBiteQuote, hashtags, segments, retentionGraph } ].`;

  const prompt = `Analyze this video transcript and generate 2 to 3 viral ${platform.toUpperCase()} scripts in "${viralStyle}" style, target length ${clipDuration}.
OUTPUT LANGUAGE REQUIREMENT: ${isRomanUrdu ? 'ROMAN URDU (Urdu in Latin/English alphabet)' : 'ENGLISH'}.

Video Title: ${videoTitle}
Target Audience: ${targetAudience}

Transcript:
"""
${transcript.slice(0, 16000)}
"""`;

  // Build provider priority chain based on available API keys and user preference
  const chain: ('gemini' | 'openai' | 'claude')[] = [];

  const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 15);
  const hasClaude = Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 15);

  if (provider === 'gemini') {
    if (hasGemini) chain.push('gemini');
    if (hasOpenAI) chain.push('openai');
    if (hasClaude) chain.push('claude');
  } else if (provider === 'openai') {
    if (hasOpenAI) chain.push('openai');
    if (hasGemini) chain.push('gemini');
    if (hasClaude) chain.push('claude');
  } else if (provider === 'claude') {
    if (hasClaude) chain.push('claude');
    if (hasGemini) chain.push('gemini');
    if (hasOpenAI) chain.push('openai');
  } else {
    // Auto: Prefer Gemini (free/fast), then OpenAI, then Claude
    if (hasGemini) chain.push('gemini');
    if (hasOpenAI) chain.push('openai');
    if (hasClaude) chain.push('claude');
  }

  if (chain.length === 0) {
    throw new Error(
      'No AI API Key is configured. Please add a Gemini, OpenAI, or Claude API key in Settings (or .env).'
    );
  }

  let lastError: any = null;

  for (const currentProvider of chain) {
    try {
      console.log(`[Universal LLM] Attempting generation with provider: "${currentProvider}"...`);

      if (currentProvider === 'gemini') {
        const { response, usedModel } = await generateContentWithFallback({
          models: ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'],
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
          },
        });
        const parsed = safeJsonParse(response.text || '{}');
        return { ...parsed, _provider: 'gemini', _model: usedModel };
      }

      if (currentProvider === 'openai') {
        const parsed = await callOpenAI([
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt },
        ], 'gpt-4o');
        return { ...parsed, _provider: 'openai', _model: 'gpt-4o' };
      }

      if (currentProvider === 'claude') {
        const parsed = await callClaude(prompt, systemInstruction, 'claude-3-5-sonnet-20241022');
        return { ...parsed, _provider: 'claude', _model: 'claude-3-5-sonnet-20241022' };
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Universal LLM] Provider "${currentProvider}" failed: ${err.message || err}. Trying next fallback...`);
    }
  }

  throw lastError || new Error('All configured LLM providers failed.');
}
