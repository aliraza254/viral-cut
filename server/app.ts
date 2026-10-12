import express from 'express';
import { Type } from '@google/genai';
import { ai } from './gemini';
import { fetchYouTubeData } from './youtube';
import {
  generateContentWithFallback,
  safeJsonParse,
  extractErrorMessage,
} from './geminiRunner';

export function createApiApp() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Extract YouTube metadata & transcript
  app.post('/api/extract-youtube', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'YouTube URL or Video ID is required' });
      }

      const info = await fetchYouTubeData(url);
      return res.json(info);
    } catch (error: any) {
      console.error('Error in /api/extract-youtube:', error);
      return res.status(400).json({
        error: error.message || 'Failed to extract YouTube video information',
      });
    }
  });

  // Transcribe uploaded video/audio track & generate timed subtitles
  app.post('/api/transcribe-video', async (req, res) => {
    try {
      const {
        audioBase64,
        mimeType = 'audio/wav',
        language = 'auto',
        videoTitle = 'Uploaded Video',
      } = req.body;

      if (!audioBase64) {
        return res.status(400).json({ error: 'Audio track base64 data is required for transcription' });
      }

      const isRomanUrdu = language === 'roman-urdu';

      const prompt = `You are an expert audio transcriber and viral video subtitle synchronizer for short-form video (TikTok, Instagram Reels, YouTube Shorts).
Your task is to transcribe the speech from this audio recording with precise timestamps and generate high-impact subtitle segments.

LANGUAGE INSTRUCTIONS:
${isRomanUrdu
  ? `- The speech is expected to be in conversational ROMAN URDU (Urdu written in Latin/English alphabet) or Urdu/English mix. Transcribe in natural Roman Urdu (e.g. "Yeh video aapke liye bohot zaroori hai", "Aap yeh ghalti bilkul mat karein").`
  : `- Transcribe the speech accurately in the spoken language (primarily English). If mixed, transcribe naturally.`}

SUBTITLE REQUIREMENTS:
1. Break down the speech into punchy, chronological subtitle lines (approx 1 to 4 seconds each, ideal for fast-paced viral mobile video captions).
2. For each subtitle segment, provide:
   - id: index string (e.g. "sub-1", "sub-2")
   - startSec: number (exact timestamp in seconds from beginning of audio)
   - endSec: number (exact timestamp in seconds when speech finishes)
   - timecode: formatted string e.g. "00:00 - 00:03"
   - text: verbatim words spoken. Capitalize key viral emphasis words (e.g. "NEVER start a business like THIS").
   - onScreenText: 2 to 4 words punchy sticker / headline text for the video editor (e.g. "BIG MISTAKE ❌", "WATCH THIS").
   - visualCue: recommended camera action or cut (e.g. "Punch-in zoom on speaker", "Wide shot", "Cut to B-Roll").
   - soundEffect: suggested sound effect for this transition (e.g. "Whoosh", "Pop", "Ding", "Impact boom").
   - words: array of word-level objects: [{ word: string, startSec: number, endSec: number }]
3. Also provide:
   - fullTranscript: complete verbatim transcript text with [MM:SS] timestamps at paragraphs.
   - detectedLanguage: detected language e.g. "English" or "Roman Urdu"
   - durationSec: total estimated duration in seconds
   - summary: 1-2 sentence concise summary of the video content
   - suggestedTitle: engaging creator title for this video clip

Return ONLY a valid JSON object matching the requested schema.`;

      // Multi-model fallback list with automatic retry on 503 high demand spikes
      const { response, usedModel } = await generateContentWithFallback({
        models: ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'],
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: audioBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedLanguage: { type: Type.STRING },
              durationSec: { type: Type.NUMBER },
              summary: { type: Type.STRING },
              suggestedTitle: { type: Type.STRING },
              fullTranscript: { type: Type.STRING },
              subtitles: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    startSec: { type: Type.NUMBER },
                    endSec: { type: Type.NUMBER },
                    timecode: { type: Type.STRING },
                    text: { type: Type.STRING },
                    onScreenText: { type: Type.STRING },
                    visualCue: { type: Type.STRING },
                    soundEffect: { type: Type.STRING },
                    words: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          word: { type: Type.STRING },
                          startSec: { type: Type.NUMBER },
                          endSec: { type: Type.NUMBER },
                        },
                        required: ['word', 'startSec', 'endSec'],
                      },
                    },
                  },
                  required: ['startSec', 'endSec', 'timecode', 'text'],
                },
              },
            },
            required: ['detectedLanguage', 'fullTranscript', 'subtitles'],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Transcription model did not return any subtitle text');
      }

      const parsed = safeJsonParse(responseText);
      return res.json({ ...parsed, _engine: usedModel });
    } catch (error: any) {
      console.error('Error in /api/transcribe-video:', error);
      const cleanMsg = extractErrorMessage(error);
      return res.status(500).json({
        error: cleanMsg || 'Failed to transcribe audio and extract subtitles from video',
      });
    }
  });

  // Generate Viral Reels / Shorts Scripts
  app.post('/api/generate-viral-reels', async (req, res) => {
    try {
      const {
        transcript,
        videoTitle = 'Video',
        platform = 'reels', // 'reels' | 'tiktok' | 'shorts'
        language = 'english', // 'english' | 'roman-urdu'
        viralStyle = 'pattern-interrupt',
        clipDuration = '30-60s',
        targetAudience = 'general mobile audience seeking engaging insights',
        strategyFeedback = '',
      } = req.body;

      if (!transcript || transcript.trim().length < 20) {
        return res.status(400).json({ error: 'Please provide a valid transcript or video content.' });
      }

      const isRomanUrdu = language === 'roman-urdu';

      const systemInstruction = `You are a world-class viral short-form retention director and master scriptwriter for YouTube Shorts, Instagram Reels, and TikTok (working with top creators like Alex Hormozi, MrBeast, Colin & Samir, Ali Abdaal).

Your goal: Take a long-form video transcript or topic and engineer 2 to 3 DISTINCT, high-probability viral short scripts (15-60s) that WILL blow up on the algorithms.

CRITICAL REQUIREMENTS:
1. OUTPUT LANGUAGE:
   ${
     isRomanUrdu
       ? `**MANDATORY LANGUAGE: URDU (ROMAN) / ROMAN URDU**
   - The spokenScript, startingPunchline, closingPunchline, soundBiteQuote, and onScreenText MUST be written in natural, punchy, conversational ROMAN URDU (Urdu written using the English/Latin alphabet, e.g., "Agar aap abhi tak yeh ghalti kar rahay hain toh foran ruk jayen!", "99% log yeh baat bilkul nahi jaantay...", "Yeh secret aapki growth ko 10x kar dega").
   - You can include common modern creator English buzzwords where natural (like "views", "video", "content", "algorithm", "secret", "money", "offer"), exactly like top Pakistani and South Asian viral creators speak.
   - Do NOT use Arabic/Urdu script (نستعلیق), ONLY use Latin/English letters (Roman Urdu).
   - Visual cues and sound effect descriptions can remain in English for the video editor.`
       : `**LANGUAGE: ENGLISH**
   - All spoken text, hooks, and on-screen text must be in fluent, compelling English.`
   }
2. DO NOT simply copy or summarize the original video verbatim! The new content must be FRESH, punchy, conversational, and completely adapted for high-speed mobile retention.
3. STARTING PUNCHLINE (THE HOOK): Must stop the thumb scroll in the first 0 to 2.5 seconds. Use visceral pattern-interrupts, contrarian statements, emotional stakes, or curiosity loops. Never start with "Hey guys", "In this video", or weak intros.
4. CLOSING PUNCHLINE & INFINITE LOOP: The ending line must be memorable, punchy, and ideally link back into the starting hook so the video loops endlessly without a noticeable seam.
5. STRUCTURED SEGMENTS WITH TIMESTAMPS: Break each short into 4-6 chronological segments (e.g. 00:00-00:03, 00:03-00:12, etc.).
6. FOR EVERY SEGMENT PROVIDE:
   - timecode (e.g. "00:00 - 00:03")
   - startSec & endSec (numbers)
   - spokenScript: The exact words for the creator to say into the camera (use ALL-CAPS or *asterisks* on punchy emphasis words).
   - visualCue: Precise camera direction & creator action (e.g., "Close-up rapid zoom, lean in, drop sunglasses", "Wide shot, pacing in front of whiteboard").
   - onScreenText: 2 to 5 words kinetic subtitle / sticker overlay for the editor (e.g., ${isRomanUrdu ? '"KABHI NA KARO ❌", "99% GHATAY MEIN"' : '"NEVER DO THIS ❌", "99% WRONG"'}).
   - soundEffect: Editor audio cue (e.g., "Bass drop + Record scratch", "Glitch swoosh", "Pop sound").
   - bRollKeywords: 2-3 exact stock footage search terms (e.g., ["exhausted office worker", "clocks spinning fast"]).
   - musicMood: Backing track recommendation (e.g., "Fast dark phonk beat", "Lofi mystery chord").
7. VIRALITY ANALYSIS: Explain why this reel has high viral potential, the hook mechanics, predicted retention score (0-100), and expected retention curve.
${strategyFeedback ? `\nADAPTATION FROM PAST PERFORMANCE STRATEGY:\n${strategyFeedback}` : ''}
`;

      const prompt = `Analyze this video transcript and generate 2 to 3 viral ${platform.toUpperCase()} scripts in "${viralStyle}" style, target length ${clipDuration}.
OUTPUT LANGUAGE REQUIREMENT: ${isRomanUrdu ? 'ROMAN URDU (Urdu in Latin/English alphabet)' : 'ENGLISH'}.

Video Title: ${videoTitle}
Target Audience: ${targetAudience}

Transcript Content:
"""
${transcript.slice(0, 16000)}
"""

Generate a complete JSON response matching the required schema. Ensure the starting line is intensely magnetic and the visual scene cues give the video editor exact instructions.`;

      const { response } = await generateContentWithFallback({
        models: ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'],
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reels: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING, description: 'Catchy viral title' },
                    hookType: { type: Type.STRING, description: 'Pattern Interrupt / Contrarian Truth / Curiosity Gap / etc.' },
                    startingPunchline: { type: Type.STRING, description: 'The intense 0-3 second spoken hook' },
                    closingPunchline: { type: Type.STRING, description: 'The final punchline / seamless loop line' },
                    estimatedDuration: { type: Type.STRING, description: 'e.g. 42s' },
                    viralityScore: { type: Type.NUMBER, description: 'Predicted virality score between 75 and 99' },
                    whyItWillBlowUp: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: '3 reasons why viewers will watch and share this'
                    },
                    soundBiteQuote: { type: Type.STRING, description: 'Short memorable quote for comments or cover image' },
                    hashtags: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: '5 high-impact viral tags'
                    },
                    segments: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          timecode: { type: Type.STRING, description: 'e.g. 00:00 - 00:03' },
                          startSec: { type: Type.NUMBER },
                          endSec: { type: Type.NUMBER },
                          spokenScript: { type: Type.STRING, description: 'Spoken line' },
                          visualCue: { type: Type.STRING, description: 'Camera direction, actor gesture' },
                          onScreenText: { type: Type.STRING, description: 'Short bold caption overlay' },
                          soundEffect: { type: Type.STRING, description: 'Audio sound effect' },
                          bRollKeywords: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                          },
                          musicMood: { type: Type.STRING },
                        },
                        required: ['timecode', 'startSec', 'endSec', 'spokenScript', 'visualCue', 'onScreenText', 'soundEffect'],
                      },
                    },
                    retentionGraph: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          second: { type: Type.NUMBER },
                          retentionPct: { type: Type.NUMBER },
                        },
                        required: ['second', 'retentionPct'],
                      },
                    },
                  },
                  required: [
                    'id',
                    'title',
                    'hookType',
                    'startingPunchline',
                    'closingPunchline',
                    'estimatedDuration',
                    'viralityScore',
                    'whyItWillBlowUp',
                    'soundBiteQuote',
                    'hashtags',
                    'segments',
                    'retentionGraph',
                  ],
                },
              },
            },
            required: ['reels'],
          },
        },
      });

      const responseText = response.text || '{}';
      const parsedData = safeJsonParse(responseText);

      return res.json(parsedData);
    } catch (error: any) {
      console.error('Error generating reels:', error);
      const cleanMsg = extractErrorMessage(error);
      return res.status(500).json({
        error: cleanMsg || 'Failed to generate viral reels scripts',
      });
    }
  });

  // Real-Time Streaming Generation Endpoint
  app.post('/api/generate-viral-reels-stream', async (req, res) => {
    try {
      const {
        transcript,
        videoTitle = 'Video',
        platform = 'reels',
        language = 'english',
        viralStyle = 'pattern-interrupt',
        clipDuration = '30-60s',
        targetAudience = 'general mobile audience seeking engaging insights',
        strategyFeedback = '',
      } = req.body;

      if (!transcript || transcript.trim().length < 20) {
        return res.status(400).json({ error: 'Please provide a valid transcript or video content.' });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const isRomanUrdu = language === 'roman-urdu';

      const systemInstruction = `You are a world-class viral short-form retention director and master scriptwriter for YouTube Shorts, Instagram Reels, and TikTok (working with top creators like Alex Hormozi, MrBeast, Colin & Samir, Ali Abdaal).

Your goal: Take a long-form video transcript or topic and engineer 2 to 3 DISTINCT, high-probability viral short scripts (15-60s) that WILL blow up on the algorithms.

CRITICAL REQUIREMENTS:
1. OUTPUT LANGUAGE:
   ${
     isRomanUrdu
       ? `**MANDATORY LANGUAGE: URDU (ROMAN) / ROMAN URDU**
   - The spokenScript, startingPunchline, closingPunchline, soundBiteQuote, and onScreenText MUST be written in natural, punchy, conversational ROMAN URDU (Urdu written using the English/Latin alphabet, e.g., "Agar aap abhi tak yeh ghalti kar rahay hain toh foran ruk jayen!", "99% log yeh baat bilkul nahi jaantay...", "Yeh secret aapki growth ko 10x kar dega").
   - You can include common modern creator English buzzwords where natural (like "views", "video", "content", "algorithm", "secret", "money", "offer"), exactly like top Pakistani and South Asian viral creators speak.
   - Do NOT use Arabic/Urdu script (نستعلیق), ONLY use Latin/English letters (Roman Urdu).
   - Visual cues and sound effect descriptions can remain in English for the video editor.`
       : `**LANGUAGE: ENGLISH**
   - All spoken text, hooks, and on-screen text must be in fluent, compelling English.`
   }
2. DO NOT simply copy or summarize the original video verbatim! The new content must be FRESH, punchy, conversational, and completely adapted for high-speed mobile retention.
3. STARTING PUNCHLINE (THE HOOK): Must stop the thumb scroll in the first 0 to 2.5 seconds. Use visceral pattern-interrupts, contrarian statements, emotional stakes, or curiosity loops. Never start with "Hey guys", "In this video", or weak intros.
4. CLOSING PUNCHLINE & INFINITE LOOP: The ending line must be memorable, punchy, and ideally link back into the starting hook so the video loops endlessly without a noticeable seam.
5. STRUCTURED SEGMENTS WITH TIMESTAMPS: Break each short into 4-6 chronological segments (e.g. 00:00-00:03, 00:03-00:12, etc.).
6. FOR EVERY SEGMENT PROVIDE:
   - timecode (e.g. "00:00 - 00:03")
   - startSec & endSec (numbers)
   - spokenScript: The exact words for the creator to say into the camera (use ALL-CAPS or *asterisks* on punchy emphasis words).
   - visualCue: Precise camera direction & creator action.
   - onScreenText: 2 to 5 words kinetic subtitle / sticker overlay for the editor.
   - soundEffect: Editor audio cue.
   - bRollKeywords: 2-3 exact stock footage search terms.
   - musicMood: Backing track recommendation.
7. VIRALITY ANALYSIS: Explain why this reel has high viral potential, the hook mechanics, predicted retention score (0-100), and expected retention curve.
${strategyFeedback ? `\nADAPTATION FROM PAST PERFORMANCE STRATEGY:\n${strategyFeedback}` : ''}
`;

      const prompt = `Analyze this video transcript and generate 2 to 3 viral ${platform.toUpperCase()} scripts in "${viralStyle}" style, target length ${clipDuration}.
OUTPUT LANGUAGE REQUIREMENT: ${isRomanUrdu ? 'ROMAN URDU (Urdu in Latin/English alphabet)' : 'ENGLISH'}.

Video Title: ${videoTitle}
Target Audience: ${targetAudience}

Transcript Content:
"""
${transcript.slice(0, 16000)}
"""

Generate a complete JSON response matching the required schema. Ensure the starting line is intensely magnetic and the visual scene cues give the video editor exact instructions.`;

      const streamModels = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
      let streamResponse: any = null;
      let streamErr: any = null;

      const streamConfig = {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reels: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  hookType: { type: Type.STRING },
                  startingPunchline: { type: Type.STRING },
                  closingPunchline: { type: Type.STRING },
                  estimatedDuration: { type: Type.STRING },
                  viralityScore: { type: Type.NUMBER },
                  whyItWillBlowUp: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  soundBiteQuote: { type: Type.STRING },
                  hashtags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  segments: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        timecode: { type: Type.STRING },
                        startSec: { type: Type.NUMBER },
                        endSec: { type: Type.NUMBER },
                        spokenScript: { type: Type.STRING },
                        visualCue: { type: Type.STRING },
                        onScreenText: { type: Type.STRING },
                        soundEffect: { type: Type.STRING },
                        bRollKeywords: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                        musicMood: { type: Type.STRING },
                      },
                      required: ['timecode', 'startSec', 'endSec', 'spokenScript', 'visualCue', 'onScreenText', 'soundEffect'],
                    },
                  },
                  retentionGraph: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        second: { type: Type.NUMBER },
                        retentionPct: { type: Type.NUMBER },
                      },
                      required: ['second', 'retentionPct'],
                    },
                  },
                },
                required: [
                  'id',
                  'title',
                  'hookType',
                  'startingPunchline',
                  'closingPunchline',
                  'estimatedDuration',
                  'viralityScore',
                  'whyItWillBlowUp',
                  'soundBiteQuote',
                  'hashtags',
                  'segments',
                  'retentionGraph',
                ],
              },
            },
          },
          required: ['reels'],
        },
      };

      for (const model of streamModels) {
        try {
          streamResponse = await ai.models.generateContentStream({
            model,
            contents: prompt,
            config: streamConfig,
          });
          break;
        } catch (err: any) {
          streamErr = err;
          console.warn(`[Stream] Model ${model} failed, trying backup model...`);
        }
      }

      if (!streamResponse) {
        throw streamErr || new Error('All models failed to initialize stream');
      }

      for await (const chunk of streamResponse) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error('Error in streaming reels:', error);
      const cleanMsg = extractErrorMessage(error);
      res.write(`data: ${JSON.stringify({ error: cleanMsg || 'Streaming failed' })}\n\n`);
      res.end();
    }
  });

  // Regenerate Hook Variations
  app.post('/api/regenerate-hook', async (req, res) => {
    try {
      const { scriptTopic, currentHook, reelTitle, language = 'english' } = req.body;
      const isRomanUrdu = language === 'roman-urdu';

      const prompt = `You are a viral hook specialist for TikTok and Reels.
Reel Topic: ${reelTitle || 'Topic'}
Current Hook: "${currentHook || 'None'}"
Context Summary: ${scriptTopic ? scriptTopic.slice(0, 600) : ''}
OUTPUT LANGUAGE: ${
  isRomanUrdu
    ? 'ROMAN URDU (Urdu written in English/Latin letters, e.g., "Agar aap abhi tak...", "Yeh aik ghalti...", conversational Pakistani/South Asian creator style)'
    : 'ENGLISH'
}

Generate 4 completely different high-converting opening hooks (0-3s starting punchlines) that grab immediate attention:
1. Pattern Interrupt (Shocking, contrarian, counter-intuitive)
2. High-Stakes / Warning ("Stop doing X immediately" or "You are losing X")
3. Curiosity Loop (Withholds information so viewer MUST stay to find out)
4. Story / Emotional Hook (Pulls viewer into an immediate relatable narrative)

Ensure spokenLine and onScreenText are in ${isRomanUrdu ? 'ROMAN URDU' : 'ENGLISH'}.
Visual cues can be in English for the video editor.`;

      const { response } = await generateContentWithFallback({
        models: ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'],
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hooks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    spokenLine: { type: Type.STRING },
                    onScreenText: { type: Type.STRING },
                    visualCue: { type: Type.STRING },
                    predictedRetentionImpact: { type: Type.STRING },
                  },
                  required: ['type', 'spokenLine', 'onScreenText', 'visualCue'],
                },
              },
            },
            required: ['hooks'],
          },
        },
      });

      const data = safeJsonParse(response.text || '{}');
      return res.json(data);
    } catch (error: any) {
      console.error('Error in regenerate-hook:', error);
      const cleanMsg = extractErrorMessage(error);
      return res.status(500).json({ error: cleanMsg || 'Failed to regenerate hooks' });
    }
  });

  // Analytics Dynamic Strategy Optimizer
  app.post('/api/adjust-strategy', async (req, res) => {
    try {
      const { performanceLogs } = req.body;

      const prompt = `You are an elite short-form algorithmic data scientist. Analyze these performance logs from a creator's posted TikTok, Reels, and Shorts:
${JSON.stringify(performanceLogs, null, 2)}

Provide strategic conclusions and updated prompt directives to maximize average view duration and virality in their upcoming scripts:
1. Identify the top performing hook styles and patterns.
2. Identify what caused drop-offs or lower engagement.
3. Formulate 3 specific strategic script directives for future generations.
4. Suggest optimal video duration range and pacing (words per minute).`;

      const { response } = await generateContentWithFallback({
        models: ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'],
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topHookInsights: { type: Type.STRING },
              dropOffAnalysis: { type: Type.STRING },
              directives: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              optimalDuration: { type: Type.STRING },
              pacingRecommendation: { type: Type.STRING },
              updatedPromptWeighting: { type: Type.STRING },
            },
            required: ['topHookInsights', 'dropOffAnalysis', 'directives', 'optimalDuration', 'updatedPromptWeighting'],
          },
        },
      });

      const data = safeJsonParse(response.text || '{}');
      return res.json(data);
    } catch (error: any) {
      console.error('Error in adjust-strategy:', error);
      const cleanMsg = extractErrorMessage(error);
      return res.status(500).json({ error: cleanMsg || 'Failed to optimize strategy' });
    }
  });

  // Text-To-Speech (TTS) Voice Generation Endpoint
  app.post('/api/tts/generate', async (req, res) => {
    try {
      const {
        text,
        engine = 'gemini', // 'gemini' | 'elevenlabs'
        voice = 'Kore',
        elevenLabsApiKey,
        modelId = 'eleven_multilingual_v2',
        stability = 0.5,
        similarityBoost = 0.75,
      } = req.body;

      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Text to speak is required' });
      }

      // Clean text of markdown asterisks and timecodes
      const cleanText = text
        .replace(/\*+/g, '')
        .replace(/\[\d\d:\d\d\s*-\s*\d\d:\d\d\]/g, '')
        .trim();

      if (engine === 'elevenlabs') {
        const apiKey = elevenLabsApiKey || process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return res.status(400).json({
            error:
              'ElevenLabs API key is required. Please provide your ElevenLabs API Key in the TTS settings or set ELEVENLABS_API_KEY.',
          });
        }

        const voiceId = voice || '21m00Tcm4TlvDq8ikWAM'; // Default Rachel

        const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: modelId,
            voice_settings: {
              stability: Number(stability),
              similarity_boost: Number(similarityBoost),
            },
          }),
        });

        if (!elevenRes.ok) {
          const errBody = await elevenRes.text();
          let parsedMsg = errBody;
          try {
            const parsed = JSON.parse(errBody);
            parsedMsg = parsed.detail?.message || parsed.message || errBody;
          } catch {}
          return res.status(elevenRes.status).json({
            error: `ElevenLabs Error (${elevenRes.status}): ${parsedMsg}`,
          });
        }

        const arrayBuffer = await elevenRes.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString('base64');

        return res.json({
          audioBase64: base64Audio,
          mimeType: 'audio/mpeg',
          format: 'mp3',
          fileName: `voiceover_elevenlabs_${Date.now()}.mp3`,
        });
      }

      // Default: Google Studio Neural TTS (gemini-3.8-flash-lite-tts)
      const allowedGeminiVoices = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];
      const geminiVoice = allowedGeminiVoices.includes(voice) ? voice : 'Kore';

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: geminiVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error('TTS model returned empty audio data');
      }

      return res.json({
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
        format: 'wav',
        fileName: `voiceover_gemini_${geminiVoice.toLowerCase()}_${Date.now()}.wav`,
      });
    } catch (error: any) {
      console.error('Error generating TTS audio:', error);
      return res.status(500).json({
        error: error.message || 'Failed to generate Text-To-Speech audio',
      });
    }
  });

  return app;
}
