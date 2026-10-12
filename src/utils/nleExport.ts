import { ReelScript, Segment } from '../types';

/**
 * Format seconds to SMPTE timecode (HH:MM:SS:FF or HH:MM:SS,mmm)
 */
export function formatSMPTETimecode(seconds: number, fps: number = 30): string {
  const safeSec = Math.max(0, seconds);
  const hrs = Math.floor(safeSec / 3600);
  const mins = Math.floor((safeSec % 3600) / 60);
  const secs = Math.floor(safeSec % 60);
  const frames = Math.floor((safeSec % 1) * fps);

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}:${pad(frames)}`;
}

/**
 * Format seconds to SRT timecode (00:00:00,000)
 */
export function formatSRTTimecode(seconds: number): string {
  const safeSec = Math.max(0, seconds);
  const hrs = Math.floor(safeSec / 3600);
  const mins = Math.floor((safeSec % 3600) / 60);
  const secs = Math.floor(safeSec % 60);
  const ms = Math.floor((safeSec % 1) * 1000);

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
}

/**
 * Format seconds to WebVTT timecode (00:00:00.000)
 */
export function formatVTTTimecode(seconds: number): string {
  return formatSRTTimecode(seconds).replace(',', '.');
}

/**
 * Parse timecode string "00:00 - 00:03" or seconds
 */
export function parseTimecodeRange(timecode: string, fallbackIndex: number = 0, defaultDuration: number = 3): { startSec: number; endSec: number } {
  try {
    const parts = timecode.split('-').map(s => s.trim());
    if (parts.length === 2) {
      const parseSingle = (tc: string): number => {
        const segs = tc.split(':').map(Number);
        if (segs.length === 2) {
          return segs[0] * 60 + segs[1];
        } else if (segs.length === 3) {
          return segs[0] * 3600 + segs[1] * 60 + segs[2];
        }
        return Number(tc) || 0;
      };
      const start = parseSingle(parts[0]);
      const end = parseSingle(parts[1]);
      if (end > start) {
        return { startSec: start, endSec: end };
      }
    }
  } catch {}

  const startSec = fallbackIndex * defaultDuration;
  return { startSec, endSec: startSec + defaultDuration };
}

/**
 * 1. Structured NLE JSON Timeline Interchange Schema
 * Optimized for DaVinci Resolve Python/Lua API, Premiere Pro CEP / ExtendScript, and AI Automation
 */
export interface NLEStructuredTimeline {
  version: string;
  generator: string;
  exportedAt: string;
  project: {
    title: string;
    targetPlatform: string;
    framerate: number;
    resolution: {
      width: number;
      height: number;
      aspectRatio: string;
      orientation: 'vertical' | 'horizontal';
    };
    totalDurationSeconds: number;
    totalDurationTimecode: string;
  };
  editorialMetadata: {
    viralityScore: number;
    hookType: string;
    startingPunchline: string;
    closingLoopPunchline: string;
    hashtags: string[];
    whyItWillBlowUp: string[];
  };
  timelineTracks: {
    videoTracks: {
      trackIndex: number;
      name: string;
      type: 'A-Roll_Speaker' | 'B-Roll_Overlays' | 'Kinetic_Captions';
      clips: any[];
    }[];
    audioTracks: {
      trackIndex: number;
      name: string;
      type: 'Dialogue_Voiceover' | 'Sound_Effects' | 'Background_Music';
      clips: any[];
    }[];
  };
  markers: {
    timecode: string;
    seconds: number;
    color: string;
    name: string;
    comment: string;
  }[];
  rawAssetsManifest: {
    suggestedBRollSearches: string[];
    suggestedSFXFiles: string[];
    spokenVoiceoverScript: string;
  };
}

export function generateStructuredNLEJSON(reel: ReelScript, platform: string = 'reels'): NLEStructuredTimeline {
  const fps = 30;
  const segments = reel.segments.map((seg, idx) => {
    const range = (seg.startSec !== undefined && seg.endSec !== undefined && seg.endSec > seg.startSec)
      ? { startSec: seg.startSec, endSec: seg.endSec }
      : parseTimecodeRange(seg.timecode, idx, 3);
    return { ...seg, ...range, duration: Math.max(1, range.endSec - range.startSec) };
  });

  const totalDuration = segments.reduce((max, s) => Math.max(max, s.endSec), 0) || 30;

  // Video Track 1: A-Roll (Primary Speaker Cut) with Auto Punch-In Zooms
  const aRollClips = segments.map((seg, idx) => {
    // Dynamic camera punch-in on hook and key punchlines (every other scene or hook)
    const isPunchIn = idx === 0 || idx % 2 === 1;
    return {
      clipIndex: idx + 1,
      name: `Scene_${idx + 1}_Speaker_A-Roll`,
      inPointSec: seg.startSec,
      outPointSec: seg.endSec,
      durationSec: seg.duration,
      timecodeIn: formatSMPTETimecode(seg.startSec, fps),
      timecodeOut: formatSMPTETimecode(seg.endSec, fps),
      cameraMotion: {
        zoomScalePercent: isPunchIn ? 115 : 100,
        framingType: isPunchIn ? 'Close-up Punch-in' : 'Medium Shot',
        punchInTransitionSec: 0.15,
      },
      visualPrompt: seg.visualCue,
      spokenDialogue: seg.spokenScript,
    };
  });

  // Video Track 2: B-Roll & Graphics Overlays
  const bRollClips = segments
    .filter(seg => (seg.bRollKeywords && seg.bRollKeywords.length > 0) || seg.visualCue.toLowerCase().includes('b-roll') || seg.visualCue.toLowerCase().includes('cut to'))
    .map((seg, idx) => ({
      clipIndex: idx + 1,
      name: `BRoll_Overlay_${idx + 1}`,
      inPointSec: seg.startSec + 0.5,
      outPointSec: Math.min(seg.endSec, seg.startSec + 2.5),
      keywords: seg.bRollKeywords || [],
      visualDescription: seg.visualCue,
      overlayMode: 'Cutaway / Picture-in-Picture / Full Frame',
    }));

  // Video Track 3: Kinetic Captions & On-Screen Titles
  const captionClips = segments.map((seg, idx) => ({
    clipIndex: idx + 1,
    name: `Caption_Scene_${idx + 1}`,
    inPointSec: seg.startSec,
    outPointSec: seg.endSec,
    timecodeIn: formatSMPTETimecode(seg.startSec, fps),
    timecodeOut: formatSMPTETimecode(seg.endSec, fps),
    text: seg.onScreenText || seg.spokenScript,
    spokenScript: seg.spokenScript,
    stylePreset: idx === 0 ? 'Hormozi_Hook_Yellow' : 'Viral_Karaoke_HighEnergy',
    styling: {
      fontFamily: 'Montserrat-Black / Futura-Bold',
      fontSizePt: idx === 0 ? 76 : 64,
      fillColor: idx === 0 ? '#FBBF24' : '#FFFFFF',
      strokeColor: '#000000',
      strokeWidthPx: 8,
      shadowColor: 'rgba(0,0,0,0.85)',
      verticalAlignment: 'center-bottom',
      yPositionPercent: 78,
    },
  }));

  // Audio Track 1: Spoken Voiceover
  const dialogueClips = segments.map((seg, idx) => ({
    clipIndex: idx + 1,
    name: `VO_Scene_${idx + 1}`,
    inPointSec: seg.startSec,
    outPointSec: seg.endSec,
    spokenLine: seg.spokenScript,
    timecodeIn: formatSMPTETimecode(seg.startSec, fps),
    timecodeOut: formatSMPTETimecode(seg.endSec, fps),
  }));

  // Audio Track 2: SFX Cues
  const sfxClips = segments
    .filter(seg => seg.soundEffect && seg.soundEffect !== 'None' && seg.soundEffect !== '-')
    .map((seg, idx) => ({
      clipIndex: idx + 1,
      name: `SFX_${seg.soundEffect.replace(/[^a-zA-Z0-9]/g, '_')}`,
      triggerSec: seg.startSec,
      timecode: formatSMPTETimecode(seg.startSec, fps),
      soundEffectDescription: seg.soundEffect,
      recommendedVolumeDb: -6,
    }));

  // Audio Track 3: Background Music Track
  const bgmClips = [
    {
      name: 'BGM_Viral_Underscore',
      inPointSec: 0,
      outPointSec: totalDuration,
      musicMood: segments[0]?.musicMood || 'Upbeat, high-retention cinematic lo-fi or bassline',
      duckingUnderDialogueDb: -18,
    },
  ];

  // Timeline Markers
  const markers = [
    {
      timecode: formatSMPTETimecode(0, fps),
      seconds: 0,
      color: 'Yellow',
      name: 'Hook Zone (0-3s)',
      comment: `Opening Hook: "${reel.startingPunchline}"`,
    },
    ...segments.slice(1).map((seg, i) => ({
      timecode: formatSMPTETimecode(seg.startSec, fps),
      seconds: seg.startSec,
      color: seg.soundEffect ? 'Cyan' : 'Green',
      name: `Scene ${i + 2} Cut`,
      comment: `${seg.visualCue} | SFX: ${seg.soundEffect || 'none'}`,
    })),
    {
      timecode: formatSMPTETimecode(Math.max(0, totalDuration - 2), fps),
      seconds: Math.max(0, totalDuration - 2),
      color: 'Magenta',
      name: 'Seamless Loop Punchline',
      comment: `Closing Loop Hook: "${reel.closingPunchline}"`,
    },
  ];

  // Gather unique B-Roll searches and SFX
  const suggestedBRoll = Array.from(
    new Set(segments.flatMap(s => s.bRollKeywords || []).filter(Boolean))
  );
  const suggestedSFX = Array.from(
    new Set(segments.map(s => s.soundEffect).filter(Boolean).filter(s => s !== '-' && s !== 'None'))
  );

  return {
    version: '1.0.0',
    generator: 'ViralCut AI NLE Pipeline Engine',
    exportedAt: new Date().toISOString(),
    project: {
      title: reel.title,
      targetPlatform: platform,
      framerate: fps,
      resolution: {
        width: 1080,
        height: 1920,
        aspectRatio: '9:16',
        orientation: 'vertical',
      },
      totalDurationSeconds: totalDuration,
      totalDurationTimecode: formatSMPTETimecode(totalDuration, fps),
    },
    editorialMetadata: {
      viralityScore: reel.viralityScore,
      hookType: reel.hookType,
      startingPunchline: reel.startingPunchline,
      closingLoopPunchline: reel.closingPunchline,
      hashtags: reel.hashtags,
      whyItWillBlowUp: reel.whyItWillBlowUp || [],
    },
    timelineTracks: {
      videoTracks: [
        { trackIndex: 1, name: 'V1 - Speaker A-Roll (Auto Zoom Punch-ins)', type: 'A-Roll_Speaker', clips: aRollClips },
        { trackIndex: 2, name: 'V2 - B-Roll & Visual Cutaways', type: 'B-Roll_Overlays', clips: bRollClips },
        { trackIndex: 3, name: 'V3 - Kinetic Dynamic Captions', type: 'Kinetic_Captions', clips: captionClips },
      ],
      audioTracks: [
        { trackIndex: 1, name: 'A1 - Spoken Dialogue (Voiceover)', type: 'Dialogue_Voiceover', clips: dialogueClips },
        { trackIndex: 2, name: 'A2 - Retention Sound Effects (SFX)', type: 'Sound_Effects', clips: sfxClips },
        { trackIndex: 3, name: 'A3 - Background Music (Ducked)', type: 'Background_Music', clips: bgmClips },
      ],
    },
    markers,
    rawAssetsManifest: {
      suggestedBRollSearches: suggestedBRoll,
      suggestedSFXFiles: suggestedSFX,
      spokenVoiceoverScript: segments.map(s => s.spokenScript).join(' '),
    },
  };
}

/**
 * 2. Final Cut Pro XML (FCP XML v5) for Adobe Premiere Pro & DaVinci Resolve
 * Can be imported via Premiere Pro File > Import or DaVinci Resolve File > Import > Timeline...
 */
export function generatePremiereProXML(reel: ReelScript, platform: string = 'reels'): string {
  const fps = 30;
  const segments = reel.segments.map((seg, idx) => {
    const range = (seg.startSec !== undefined && seg.endSec !== undefined && seg.endSec > seg.startSec)
      ? { startSec: seg.startSec, endSec: seg.endSec }
      : parseTimecodeRange(seg.timecode, idx, 3);
    const startFrame = Math.round(range.startSec * fps);
    const endFrame = Math.round(range.endSec * fps);
    return { ...seg, startFrame, endFrame, durationFrames: Math.max(fps, endFrame - startFrame) };
  });

  const totalFrames = segments.reduce((max, s) => Math.max(max, s.endFrame), 0) || fps * 30;
  const cleanTitle = reel.title.replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' }[c] || c));

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="5">
  <sequence id="sequence-1">
    <name>${cleanTitle} (${platform.toUpperCase()})</name>
    <duration>${totalFrames}</duration>
    <rate>
      <timebase>${fps}</timebase>
      <ntsc>FALSE</ntsc>
    </rate>
    <timecode>
      <rate>
        <timebase>${fps}</timebase>
        <ntsc>FALSE</ntsc>
      </rate>
      <string>00:00:00:00</string>
      <frame>0</frame>
      <displayformat>NDF</displayformat>
    </timecode>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <rate>
              <timebase>${fps}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <width>1080</width>
            <height>1920</height>
            <anamorphic>FALSE</anamorphic>
            <pixelaspectratio>square</pixelaspectratio>
            <fielddominance>none</fielddominance>
            <colordepth>24</colordepth>
          </samplecharacteristics>
        </format>
        <!-- TRACK V1: Primary Speaker A-Roll Cuts -->
        <track>
`;

  segments.forEach((seg, idx) => {
    const clipName = `Scene_${idx + 1}_${seg.visualCue.slice(0, 25).replace(/[^a-zA-Z0-9 ]/g, '') || 'Speaker'}`;
    const comment = `Visual: ${seg.visualCue} | Caption: ${seg.onScreenText || seg.spokenScript}`;
    xml += `          <clipitem id="clipitem-v1-${idx + 1}">
            <name>${clipName}</name>
            <duration>${seg.durationFrames}</duration>
            <rate>
              <timebase>${fps}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <start>${seg.startFrame}</start>
            <end>${seg.endFrame}</end>
            <in>0</in>
            <out>${seg.durationFrames}</out>
            <comments>${comment}</comments>
            <marker>
              <name>Scene ${idx + 1}</name>
              <comment>${seg.spokenScript.replace(/[&<>'"]/g, '')}</comment>
              <in>0</in>
              <out>0</out>
            </marker>
          </clipitem>
`;
  });

  xml += `        </track>
        <!-- TRACK V2: Kinetic Captions & Titles (Generator Titles) -->
        <track>
`;

  segments.forEach((seg, idx) => {
    const captionText = (seg.onScreenText || seg.spokenScript).replace(/[&<>'"]/g, '');
    xml += `          <generatoritem id="generator-v2-${idx + 1}">
            <name>Caption: ${captionText.slice(0, 20)}</name>
            <duration>${seg.durationFrames}</duration>
            <rate>
              <timebase>${fps}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <start>${seg.startFrame}</start>
            <end>${seg.endFrame}</end>
            <in>0</in>
            <out>${seg.durationFrames}</out>
            <effect>
              <name>Text</name>
              <effectid>Text</effectid>
              <effecttype>generator</effecttype>
              <mediatype>video</mediatype>
              <parameter>
                <parameterid>str</parameterid>
                <name>Text</name>
                <value>${captionText}</value>
              </parameter>
              <parameter>
                <parameterid>font</parameterid>
                <name>Font</name>
                <value>Montserrat-Black</value>
              </parameter>
              <parameter>
                <parameterid>size</parameterid>
                <name>Size</name>
                <value>64</value>
              </parameter>
            </effect>
          </generatoritem>
`;
  });

  xml += `        </track>
      </video>
      <audio>
        <numOutputChannels>2</numOutputChannels>
        <format>
          <samplecharacteristics>
            <depth>16</depth>
            <samplerate>48000</samplerate>
          </samplecharacteristics>
        </format>
        <!-- TRACK A1: Voiceover Dialogue -->
        <track>
`;

  segments.forEach((seg, idx) => {
    xml += `          <clipitem id="clipitem-a1-${idx + 1}">
            <name>VO_Scene_${idx + 1}</name>
            <duration>${seg.durationFrames}</duration>
            <rate>
              <timebase>${fps}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <start>${seg.startFrame}</start>
            <end>${seg.endFrame}</end>
            <in>0</in>
            <out>${seg.durationFrames}</out>
            <comments>${seg.spokenScript.replace(/[&<>'"]/g, '')}</comments>
          </clipitem>
`;
  });

  xml += `        </track>
        <!-- TRACK A2: SFX Markers -->
        <track>
`;

  segments.filter(s => s.soundEffect && s.soundEffect !== '-' && s.soundEffect !== 'None').forEach((seg, idx) => {
    const sfxDurationFrames = fps * 1; // 1 second sfx hit
    xml += `          <clipitem id="clipitem-a2-${idx + 1}">
            <name>SFX_${seg.soundEffect.replace(/[^a-zA-Z0-9]/g, '_')}</name>
            <duration>${sfxDurationFrames}</duration>
            <rate>
              <timebase>${fps}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <start>${seg.startFrame}</start>
            <end>${seg.startFrame + sfxDurationFrames}</end>
            <in>0</in>
            <out>${sfxDurationFrames}</out>
            <comments>Sound effect trigger: ${seg.soundEffect.replace(/[&<>'"]/g, '')}</comments>
          </clipitem>
`;
  });

  xml += `        </track>
      </audio>
    </media>
  </sequence>
</xmeml>
`;

  return xml;
}

/**
 * 3. CMX 3600 EDL (Edit Decision List) for DaVinci Resolve
 */
export function generateDaVinciEDL(reel: ReelScript, platform: string = 'reels'): string {
  const fps = 30;
  const segments = reel.segments.map((seg, idx) => {
    const range = (seg.startSec !== undefined && seg.endSec !== undefined && seg.endSec > seg.startSec)
      ? { startSec: seg.startSec, endSec: seg.endSec }
      : parseTimecodeRange(seg.timecode, idx, 3);
    return { ...seg, ...range, duration: Math.max(1, range.endSec - range.startSec) };
  });

  let edl = `TITLE: VIRALCUT_${reel.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30).toUpperCase()}\n`;
  edl += `FCM: NON-DROP FRAME\n\n`;

  segments.forEach((seg, idx) => {
    const eventNum = String(idx + 1).padStart(3, '0');
    const srcIn = formatSMPTETimecode(0, fps);
    const srcOut = formatSMPTETimecode(seg.duration, fps);
    const recIn = formatSMPTETimecode(seg.startSec, fps);
    const recOut = formatSMPTETimecode(seg.endSec, fps);

    // Standard CMX 3600 event line: 001  AX  V  C  00:00:00:00 00:00:03:00 00:00:00:00 00:00:03:00
    edl += `${eventNum}  AX       V     C        ${srcIn} ${srcOut} ${recIn} ${recOut}\n`;
    edl += `* FROM CLIP NAME: SCENE_${idx + 1}_${seg.visualCue.slice(0, 30).replace(/[\r\n]/g, '')}\n`;
    edl += `* CAPTION: ${seg.onScreenText || seg.spokenScript}\n`;
    if (seg.soundEffect && seg.soundEffect !== '-') {
      edl += `* SFX CUE: ${seg.soundEffect}\n`;
    }
    if (seg.bRollKeywords && seg.bRollKeywords.length > 0) {
      edl += `* B-ROLL TAGS: ${seg.bRollKeywords.join(', ')}\n`;
    }
    edl += `\n`;
  });

  return edl;
}

/**
 * 4. SubRip (.SRT) Caption File
 */
export function generateSRTSubtitles(reel: ReelScript): string {
  const segments = reel.segments.map((seg, idx) => {
    const range = (seg.startSec !== undefined && seg.endSec !== undefined && seg.endSec > seg.startSec)
      ? { startSec: seg.startSec, endSec: seg.endSec }
      : parseTimecodeRange(seg.timecode, idx, 3);
    return { ...seg, ...range };
  });

  return segments
    .map((seg, idx) => {
      const start = formatSRTTimecode(seg.startSec);
      const end = formatSRTTimecode(seg.endSec);
      const text = seg.spokenScript || seg.onScreenText || '';
      return `${idx + 1}\n${start} --> ${end}\n${text}\n`;
    })
    .join('\n');
}

/**
 * 5. WebVTT (.VTT) Subtitle File
 */
export function generateVTTSubtitles(reel: ReelScript): string {
  const segments = reel.segments.map((seg, idx) => {
    const range = (seg.startSec !== undefined && seg.endSec !== undefined && seg.endSec > seg.startSec)
      ? { startSec: seg.startSec, endSec: seg.endSec }
      : parseTimecodeRange(seg.timecode, idx, 3);
    return { ...seg, ...range };
  });

  let vtt = `WEBVTT - ViralCut Reel Subtitles: ${reel.title}\n\n`;
  segments.forEach((seg, idx) => {
    const start = formatVTTTimecode(seg.startSec);
    const end = formatVTTTimecode(seg.endSec);
    const text = seg.spokenScript || seg.onScreenText || '';
    vtt += `${idx + 1}\n${start} --> ${end}\n${text}\n\n`;
  });
  return vtt;
}

/**
 * Helper to download any string content as a client-side file
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
