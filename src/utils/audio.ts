/**
 * Web Speech API speech synthesis utility for real-time script preview and teleprompter playback.
 */

class SpeechPreviewer {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking = false;
  private onEndCallback: (() => void) | null = null;
  private onBoundaryCallback: ((charIndex: number) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
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
    const voices = this.synth.getVoices();
    let selectedVoice = null;

    if (language === 'roman-urdu') {
      // Prefer South Asian English / Urdu accented voices for natural Roman Urdu cadences
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

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (this.onEndCallback) {
        const cb = this.onEndCallback;
        this.onEndCallback = null;
        cb();
      }
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.onEndCallback = null;
      this.onBoundaryCallback = null;
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word' && this.onBoundaryCallback) {
        this.onBoundaryCallback(event.charIndex);
      }
    };

    this.currentUtterance = utterance;
    this.isSpeaking = true;
    try {
      this.synth.speak(utterance);
      return true;
    } catch {
      this.isSpeaking = false;
      this.currentUtterance = null;
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
