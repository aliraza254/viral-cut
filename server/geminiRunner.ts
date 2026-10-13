import { ai } from './gemini';

/**
 * Checks if a Gemini API error is transient (e.g. 503 high demand spike, 429 rate limit, 500, network error)
 */
export function isTransientGeminiError(error: any): boolean {
  if (!error) return false;
  const str = typeof error === 'string'
    ? error
    : `${error.message || ''} ${error.status || ''} ${error.code || ''} ${JSON.stringify(error)}`;
  const lower = str.toLowerCase();
  return (
    lower.includes('503') ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('spikes in demand') ||
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('overloaded') ||
    lower.includes('temporarily') ||
    lower.includes('please try again later') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout') ||
    lower.includes('fetch failed')
  );
}

/**
 * Extracts a clean, human-readable error message from an API error
 */
export function extractErrorMessage(error: any): string {
  if (!error) return 'Unknown error';
  const str = String(error?.message || error);
  if (
    str.includes('invalid_grant') ||
    str.includes('API key') ||
    str.includes('API_KEY') ||
    str.includes('CREDENTIALS_MISSING') ||
    !process.env.GEMINI_API_KEY
  ) {
    return 'Gemini API Key is missing or invalid. Please add your GEMINI_API_KEY in the .env file (get a free key at https://aistudio.google.com/app/apikey).';
  }
  if (typeof error === 'string') {
    try {
      const parsed = JSON.parse(error);
      if (parsed.error?.message) return parsed.error.message;
    } catch {}
    return error;
  }
  if (error.message) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed.error?.message) return parsed.error.message;
    } catch {}
    return error.message;
  }
  return String(error);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Removes markdown formatting (```json ... ```) and extracts pure JSON
 */
export function cleanJsonText(raw: string): string {
  if (!raw) return '{}';
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  return cleaned.trim();
}

/**
 * Parses JSON safely from Gemini responses, including nested markdown codeblocks
 */
export function safeJsonParse<T = any>(raw: string): T {
  const cleaned = cleanJsonText(raw);
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      } catch {}
    }
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(cleaned.substring(firstBracket, lastBracket + 1));
      } catch {}
    }
    throw new Error(`Failed to parse model JSON: ${cleaned.slice(0, 200)}...`);
  }
}

export interface FallbackOptions {
  models: string[];
  contents: any;
  config?: any;
  maxRetriesPerModel?: number;
  initialDelayMs?: number;
}

/**
 * Executes a Gemini request with automatic multi-model fallback and backoff retry.
 * Prevents 503 high-demand spike failures by retrying and falling back to alternative models.
 */
export async function generateContentWithFallback(options: FallbackOptions) {
  const {
    models,
    contents,
    config,
    maxRetriesPerModel = 2,
    initialDelayMs = 1200,
  } = options;

  let lastError: any = null;

  for (let mIdx = 0; mIdx < models.length; mIdx++) {
    const model = models[mIdx];
    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      try {
        console.log(`[GeminiRunner] Invoking "${model}" (attempt ${attempt}/${maxRetriesPerModel})...`);
        const response = await ai.models.generateContent({
          model,
          contents,
          config,
        });

        if (response && response.text) {
          console.log(`[GeminiRunner] Success with model "${model}"!`);
          return { response, usedModel: model };
        }
        throw new Error(`Model ${model} returned empty response`);
      } catch (err: any) {
        lastError = err;
        const msg = extractErrorMessage(err);
        const isTransient = isTransientGeminiError(err);
        console.warn(`[GeminiRunner] Model "${model}" failed (attempt ${attempt}): ${msg}`);

        // If it's a transient 503/429/quota spike, wait and retry on same model if attempts remain
        if (isTransient && attempt < maxRetriesPerModel) {
          const delay = initialDelayMs * Math.pow(1.5, attempt - 1);
          console.log(`[GeminiRunner] High demand/transient spike detected. Retrying "${model}" in ${delay}ms...`);
          await sleep(delay);
          continue;
        }

        // If schema is not supported by this model, try without schema but with JSON mimeType if fallback permits
        if (msg.includes('schema') && config?.responseSchema) {
          try {
            console.log(`[GeminiRunner] Retrying "${model}" without responseSchema...`);
            const fallbackConfig = { ...config };
            delete fallbackConfig.responseSchema;
            const response = await ai.models.generateContent({
              model,
              contents,
              config: fallbackConfig,
            });
            if (response && response.text) {
              console.log(`[GeminiRunner] Success with model "${model}" (no schema)!`);
              return { response, usedModel: model };
            }
          } catch (noSchemaErr) {
            console.warn(`[GeminiRunner] Retry without schema on "${model}" failed.`);
          }
        }

        // Otherwise move to the next model in the list
        break;
      }
    }
  }

  throw lastError;
}
