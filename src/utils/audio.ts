/**
 * Web Speech API speech synthesis utility for real-time script preview and teleprompter playback.
 */

class SpeechPreviewer {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking = false;
  private onEndCallback: (() => void) | null = null;
  private onBoundaryCallback: ((charIndex: number) => void) | null = null;
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.voices = this.synth.getVoices();
      if (typeof this.synth.addEventListener === 'function') {
        this.synth.addEventListener('voiceschanged', () => {
          if (this.synth) this.voices = this.synth.getVoices();
        });
      } else if ('onvoiceschanged' in this.synth) {
        this.synth.onvoiceschanged = () => {
          if (this.synth) this.voices = this.synth.getVoices();
        };
      }
    }
  }

  public speak(
    text: string,
    rate = 1.1,
    onEnd?: () => void,
    onBoundary?: (charIndex: number) => void,
    language?: 'english' | 'roman-urdu'
  ): boolean {
    if (!this.synth) return false;

    this.stop();
    this.onEndCallback = onEnd || null;
    this.onBoundaryCallback = onBoundary || null;

    // Clean markdown asterisks or cues from spoken text
    const cleanText = text
      .replace(/\*+/g, '')
      .replace(/\[\d\d:\d\d\s*-\s*\d\d:\d\d\]/g, '')
      .trim();

    if (!cleanText) return false;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = rate;
    utterance.pitch = 1.0;

    // Pick best voice
    const voices = this.voices.length > 0 ? this.voices : this.synth.getVoices();
    let selectedVoice = null;

    if (language === 'roman-urdu') {
      selectedVoice =
        voices.find((v) => v.lang === 'en-IN' || v.lang.startsWith('ur') || v.lang.startsWith('hi')) ||
        voices.find((v) => v.lang.startsWith('en'));
    } else {
      selectedVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'))
        ) || voices.find((v) => v.lang.startsWith('en'));
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    const clearWatchdog = () => {
      if (this.watchdogTimer) {
        clearTimeout(this.watchdogTimer);
        this.watchdogTimer = null;
      }
    };

    const finish = () => {
      clearWatchdog();
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (this.onEndCallback) {
        const cb = this.onEndCallback;
        this.onEndCallback = null;
        cb();
      }
    };

    utterance.onend = finish;

    utterance.onerror = (e) => {
      console.warn('[SpeechPreviewer] Utterance error, completing gracefully:', e);
      finish();
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word' && this.onBoundaryCallback) {
        this.onBoundaryCallback(event.charIndex);
      }
    };

    // Calculate maximum expected duration + safety padding for Chrome hang protection
    const wordCount = Math.max(1, cleanText.split(/\s+/).length);
    const expectedDurationMs = Math.max(2000, ((wordCount / 2.2) * 1000) / rate + 1500);
    this.watchdogTimer = setTimeout(() => {
      if (this.isSpeaking) {
        console.warn('[SpeechPreviewer] Chrome audio watchdog triggered, advancing to prevent freeze');
        finish();
      }
    }, expectedDurationMs);

    this.currentUtterance = utterance;
    this.isSpeaking = true;

    try {
      if (this.synth.paused) {
        this.synth.resume();
      }
      this.synth.speak(utterance);
      return true;
    } catch {
      finish();
      return false;
    }
  }

  public pause() {
    if (this.synth && this.synth.speaking) {
      try {
        this.synth.pause();
      } catch {}
    }
  }

  public resume() {
    if (this.synth && this.synth.paused) {
      try {
        this.synth.resume();
      } catch {}
    }
  }

  public stop() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.onEndCallback = null;
    this.onBoundaryCallback = null;
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }
  }

  public isActive(): boolean {
    return this.isSpeaking;
  }
}

export const speechPreviewer = new SpeechPreviewer();
