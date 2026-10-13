/**
 * Contract Validators for ViralCut API & Frontend Context Contracts
 * Strictly validates data objects against PROJECT.md § Interface Contracts.
 */

export interface ValidationError {
  field: string;
  expected: string;
  actual: any;
}

export class ContractValidator {
  /**
   * Validates GET /api/health response contract:
   * { status: "ok", version: string, ffmpeg_available: boolean, python_version: string }
   */
  static validateHealthResponse(data: any): ValidationError[] {
    const errors: ValidationError[] = [];
    if (!data || typeof data !== 'object') {
      return [{ field: 'root', expected: 'object', actual: typeof data }];
    }
    if (data.status !== 'ok') {
      errors.push({ field: 'status', expected: '"ok"', actual: data.status });
    }
    if (typeof data.version !== 'string' || !data.version) {
      errors.push({ field: 'version', expected: 'non-empty string', actual: data.version });
    }
    if (typeof data.ffmpeg_available !== 'boolean') {
      errors.push({ field: 'ffmpeg_available', expected: 'boolean', actual: typeof data.ffmpeg_available });
    }
    if (typeof data.python_version !== 'string') {
      errors.push({ field: 'python_version', expected: 'string', actual: typeof data.python_version });
    }
    return errors;
  }

  /**
   * Validates POST /api/extract-youtube request contract:
   * { url: string, preferred_quality?: string }
   */
  static validateExtractYoutubeRequest(data: any): ValidationError[] {
    const errors: ValidationError[] = [];
    if (!data || typeof data !== 'object') {
      return [{ field: 'root', expected: 'object', actual: typeof data }];
    }
    if (typeof data.url !== 'string' || !data.url.trim()) {
      errors.push({ field: 'url', expected: 'non-empty string', actual: data.url });
    }
    if (data.preferred_quality !== undefined && typeof data.preferred_quality !== 'string') {
      errors.push({ field: 'preferred_quality', expected: 'optional string', actual: typeof data.preferred_quality });
    }
    return errors;
  }

  /**
   * Validates POST /api/extract-youtube response contract:
   * { video_id: string, title: string, duration: number, audio_url: string, video_url?: string }
   */
  static validateExtractYoutubeResponse(data: any): ValidationError[] {
    const errors: ValidationError[] = [];
    if (!data || typeof data !== 'object') {
      return [{ field: 'root', expected: 'object', actual: typeof data }];
    }
    if (typeof data.video_id !== 'string' || !data.video_id) {
      errors.push({ field: 'video_id', expected: 'string', actual: data.video_id });
    }
    if (typeof data.title !== 'string') {
      errors.push({ field: 'title', expected: 'string', actual: data.title });
    }
    if (typeof data.duration !== 'number' || data.duration < 0) {
      errors.push({ field: 'duration', expected: 'non-negative number', actual: data.duration });
    }
    if (typeof data.audio_url !== 'string' || !data.audio_url) {
      errors.push({ field: 'audio_url', expected: 'string URL', actual: data.audio_url });
    }
    if (data.video_url !== undefined && typeof data.video_url !== 'string') {
      errors.push({ field: 'video_url', expected: 'optional string URL', actual: typeof data.video_url });
    }
    return errors;
  }

  /**
   * Validates POST /api/transcribe response contract:
   * { transcript: string, language: string, segments: Array<{ start: number, end: number, text: string }> }
   */
  static validateTranscribeResponse(data: any): ValidationError[] {
    const errors: ValidationError[] = [];
    if (!data || typeof data !== 'object') {
      return [{ field: 'root', expected: 'object', actual: typeof data }];
    }
    if (typeof data.transcript !== 'string') {
      errors.push({ field: 'transcript', expected: 'string', actual: typeof data.transcript });
    }
    if (typeof data.language !== 'string') {
      errors.push({ field: 'language', expected: 'string', actual: typeof data.language });
    }
    if (!Array.isArray(data.segments)) {
      errors.push({ field: 'segments', expected: 'Array', actual: typeof data.segments });
    } else {
      for (let i = 0; i < data.segments.length; i++) {
        const seg = data.segments[i];
        if (typeof seg.start !== 'number' || typeof seg.end !== 'number' || typeof seg.text !== 'string') {
          errors.push({
            field: `segments[${i}]`,
            expected: '{ start: number, end: number, text: string }',
            actual: JSON.stringify(seg),
          });
          break;
        }
      }
    }
    return errors;
  }

  /**
   * Validates POST /api/render-video request contract:
   * { video_url: string, subtitles: Array<{ start: number, end: number, text: string }>, style_preset: "hormozi" | "beast" | "clean" | "neon", output_format?: "mp4" | "webm" }
   */
  static validateRenderVideoRequest(data: any): ValidationError[] {
    const errors: ValidationError[] = [];
    if (!data || typeof data !== 'object') {
      return [{ field: 'root', expected: 'object', actual: typeof data }];
    }
    if (typeof data.video_url !== 'string' || !data.video_url) {
      errors.push({ field: 'video_url', expected: 'string URL', actual: data.video_url });
    }
    if (!Array.isArray(data.subtitles)) {
      errors.push({ field: 'subtitles', expected: 'Array of subtitles', actual: typeof data.subtitles });
    }
    const validPresets = ['hormozi', 'beast', 'clean', 'neon'];
    if (!validPresets.includes(data.style_preset)) {
      errors.push({ field: 'style_preset', expected: validPresets.join(' | '), actual: data.style_preset });
    }
    if (data.output_format !== undefined && !['mp4', 'webm'].includes(data.output_format)) {
      errors.push({ field: 'output_format', expected: '"mp4" | "webm"', actual: data.output_format });
    }
    return errors;
  }

  /**
   * Validates POST /api/render-video response contract:
   * { task_id: string, status: "pending" | "completed" | "failed", output_url?: string, error?: string }
   */
  static validateRenderVideoResponse(data: any): ValidationError[] {
    const errors: ValidationError[] = [];
    if (!data || typeof data !== 'object') {
      return [{ field: 'root', expected: 'object', actual: typeof data }];
    }
    if (typeof data.task_id !== 'string' || !data.task_id) {
      errors.push({ field: 'task_id', expected: 'string', actual: data.task_id });
    }
    const validStatus = ['pending', 'completed', 'failed'];
    if (!validStatus.includes(data.status)) {
      errors.push({ field: 'status', expected: validStatus.join(' | '), actual: data.status });
    }
    if (data.status === 'completed' && (!data.output_url || typeof data.output_url !== 'string')) {
      errors.push({ field: 'output_url', expected: 'string URL when completed', actual: data.output_url });
    }
    if (data.status === 'failed' && (!data.error || typeof data.error !== 'string')) {
      errors.push({ field: 'error', expected: 'error message string when failed', actual: data.error });
    }
    return errors;
  }

  /**
   * Validates Frontend ProjectContext contract:
   * { activeTool: 'caption-studio' | 'viral-generator', setActiveTool: Function, activeProject: any, currentReels: any[], uploadedMedia: any, transferToCaptionStudio: Function }
   */
  static validateProjectContextState(state: any): ValidationError[] {
    const errors: ValidationError[] = [];
    if (!state || typeof state !== 'object') {
      return [{ field: 'root', expected: 'object', actual: typeof state }];
    }
    const validTools = ['caption-studio', 'viral-generator'];
    if (!validTools.includes(state.activeTool)) {
      errors.push({ field: 'activeTool', expected: '"caption-studio" | "viral-generator"', actual: state.activeTool });
    }
    if (typeof state.setActiveTool !== 'function') {
      errors.push({ field: 'setActiveTool', expected: 'function', actual: typeof state.setActiveTool });
    }
    if (typeof state.transferToCaptionStudio !== 'function') {
      errors.push({ field: 'transferToCaptionStudio', expected: 'function', actual: typeof state.transferToCaptionStudio });
    }
    if (!Array.isArray(state.currentReels)) {
      errors.push({ field: 'currentReels', expected: 'Array', actual: typeof state.currentReels });
    }
    if (state.uploadedMedia === undefined) {
      errors.push({ field: 'uploadedMedia', expected: 'defined object or null', actual: state.uploadedMedia });
    }
    return errors;
  }
}
