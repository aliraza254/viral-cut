import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let cachedKey: string | undefined = undefined;
let cachedClient: GoogleGenAI | null = null;

export function getAi(): GoogleGenAI {
  const currentKey = process.env.GEMINI_API_KEY?.trim() || '';
  if (!cachedClient || cachedKey !== currentKey) {
    cachedKey = currentKey;
    cachedClient = new GoogleGenAI({
      apiKey: currentKey || 'placeholder_gemini_key',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedClient;
}

export const ai: GoogleGenAI = new Proxy({} as GoogleGenAI, {
  get(_target, prop) {
    const client = getAi();
    return (client as any)[prop];
  },
});
