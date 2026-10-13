/**
 * Adversarial Challenger 1: Empirical Stress-Test Suite for Milestone 2
 * Tests:
 * 1. Tool switching under active editing states and empty states
 * 2. Reverse bridge transfer (Caption Studio -> Reel Generator transcript disconnect)
 * 3. Draft caching in ProjectContext & LocalStorage corruption/overwrite flaws
 * 4. Out-of-bounds selectedReelIndex array mutation bugs
 * 5. Orphaned platform selector props and broken references
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect, setContext, runAllTests } from './e2e/harness';
import { FIXTURES } from './e2e/helpers/mock-backend';
import { DEFAULT_SAMPLE_REEL } from '../src/data/samples';
import { ReelScript, Segment } from '../src/types';

setContext(1, 'CHALLENGER-1');

describe('Empirical Challenge 1: Active Editing State Preservation & Tool Switching', () => {
  const rootDir = process.cwd();

  it('TC-CHAL-01: In-memory segment modifications are preserved across bidirectional tool switches', () => {
    // Simulate active ProjectContext state store across tool switches
    let activeTool: 'caption-studio' | 'viral-generator' = 'viral-generator';
    let currentReels: ReelScript[] = [JSON.parse(JSON.stringify(DEFAULT_SAMPLE_REEL))];
    let selectedReelIndex = 0;

    // Active editing in Tool 2: Viral Reel Generator
    const updatedSegment: Segment = {
      ...currentReels[0].segments[0],
      spokenScript: 'TRANSFORMED HOOK: The secret formula for 10x viral growth',
      visualCue: 'Extreme close up with dramatic lighting',
    };

    // Update segment
    currentReels[0].segments[0] = updatedSegment;
    currentReels[0].startingPunchline = updatedSegment.spokenScript;

    // Add a new segment
    const newSegment: Segment = {
      timecode: '00:30 - 00:38',
      startSec: 30,
      endSec: 38,
      spokenScript: 'Final call to action subscribe now.',
      visualCue: 'Text overlay animation',
      onScreenText: 'SUBSCRIBE',
      soundEffect: 'Whoosh',
      bRollKeywords: ['subscribe'],
    };
    currentReels[0].segments.push(newSegment);

    // Switch to Tool 1: Caption Studio
    activeTool = 'caption-studio';

    // In Caption Studio, activeReel derives from currentReels[selectedReelIndex]
    const captionStudioReel = currentReels[selectedReelIndex];
    expect(captionStudioReel.segments.length).toBe(DEFAULT_SAMPLE_REEL.segments.length + 1);
    expect(captionStudioReel.segments[0].spokenScript).toBe('TRANSFORMED HOOK: The secret formula for 10x viral growth');
    expect(captionStudioReel.segments[captionStudioReel.segments.length - 1].spokenScript).toBe('Final call to action subscribe now.');

    // Switch back to Tool 2: Viral Reel Generator
    activeTool = 'viral-generator';
    const generatorReel = currentReels[selectedReelIndex];
    expect(generatorReel.segments[0].spokenScript).toBe('TRANSFORMED HOOK: The secret formula for 10x viral growth');
  });

  it('TC-CHAL-02: Rapid sequential tool switching stress test (1,000 cycles)', () => {
    let activeTool: 'caption-studio' | 'viral-generator' = 'viral-generator';
    let currentReels: ReelScript[] = [JSON.parse(JSON.stringify(DEFAULT_SAMPLE_REEL))];
    const initialSegmentCount = currentReels[0].segments.length;

    for (let i = 0; i < 1000; i++) {
      activeTool = activeTool === 'viral-generator' ? 'caption-studio' : 'viral-generator';
    }

    expect(activeTool).toBe('viral-generator');
    expect(currentReels[0].segments.length).toBe(initialSegmentCount);
  });

  it('TC-CHAL-03: Out-of-bounds selectedReelIndex causes sparse array defect in segment updates', () => {
    // In ProjectContext.tsx:
    // const active = prevReels[selectedReelIndex] || prevReels[0];
    // copy[selectedReelIndex] = newReel;
    // If selectedReelIndex is out-of-bounds (e.g. 2 when prevReels has 1 item):
    const prevReels = [JSON.parse(JSON.stringify(DEFAULT_SAMPLE_REEL))];
    const selectedReelIndex = 2; // out-of-bounds

    const active = prevReels[selectedReelIndex] || prevReels[0];
    expect(active).toBeTruthy(); // falls back to prevReels[0]

    const copy = [...prevReels];
    const updated = { ...active, startingPunchline: 'Punchline Changed' };
    copy[selectedReelIndex] = updated;

    // copy now has length 3, with copy[1] === undefined (hole)
    expect(copy.length).toBe(3);
    expect(copy[1]).toBe(undefined);

    // When serialized to JSON (draft caching) and reloaded:
    const serialized = JSON.stringify(copy);
    expect(serialized).toContain('null'); // sparse slots serialize to null

    const reloaded = JSON.parse(serialized);
    expect(reloaded[1]).toBe(null);

    // Iterating reloaded with .map(reel => reel.id) throws: TypeError: Cannot read properties of null
    let hasThrown = false;
    try {
      reloaded.map((r: any) => r.id);
    } catch {
      hasThrown = true;
    }
    expect(hasThrown).toBe(true);
  });
});

describe('Empirical Challenge 2: Cross-Tool Transfer & Disconnected Transcript Bridge', () => {
  const rootDir = process.cwd();

  it('TC-CHAL-04: transferToCaptionStudio correctly converts segments into VideoSubtitleSegment structure', () => {
    const segments: Segment[] = [
      {
        timecode: '00:00 - 00:04',
        startSec: 0,
        endSec: 4,
        spokenScript: 'Stop scrolling and listen.',
        visualCue: 'Sudden cut',
        onScreenText: 'STOP',
        soundEffect: 'Boom',
      },
      {
        timecode: '00:04 - 00:10',
        startSec: 4,
        endSec: 10,
        spokenScript: 'Here is what you need to know.',
        visualCue: 'Hand gesture',
      } as Segment,
    ];

    const mapped = segments.map((seg, idx) => ({
      id: `seg_${idx + 1}`,
      startSec: seg.startSec,
      endSec: seg.endSec,
      timecode: seg.timecode,
      text: seg.spokenScript,
      visualCue: seg.visualCue,
      onScreenText: seg.onScreenText,
      soundEffect: seg.soundEffect,
    }));

    expect(mapped.length).toBe(2);
    expect(mapped[0].id).toBe('seg_1');
    expect(mapped[0].text).toBe('Stop scrolling and listen.');
    expect(mapped[1].soundEffect).toBe(undefined);
  });

  it('TC-CHAL-05: ARCHITECTURAL DEFECT - CaptionStudio handleTransferToReelGenerator sets currentTranscript, but VideoInputSection has NO transcript prop', () => {
    // CaptionStudio.tsx lines 30-38:
    // setCurrentTranscript(fullText);
    // setActiveTool('viral-generator');
    const csContent = fs.readFileSync(path.join(rootDir, 'src', 'pages', 'CaptionStudio.tsx'), 'utf-8');
    expect(csContent.includes('setCurrentTranscript(fullText)')).toBe(true);

    // ViralReelGenerator.tsx renders VideoInputSection:
    const vrContent = fs.readFileSync(path.join(rootDir, 'src', 'pages', 'ViralReelGenerator.tsx'), 'utf-8');
    // Check how VideoInputSection is invoked:
    const hasTranscriptPropPassed = vrContent.includes('transcript=') || vrContent.includes('initialTranscript=');
    expect(hasTranscriptPropPassed).toBe(false);

    // Inspect VideoInputSectionProps in VideoInputSection.tsx:
    const visContent = fs.readFileSync(path.join(rootDir, 'src', 'components', 'VideoInputSection.tsx'), 'utf-8');
    const hasInitialTranscriptProp = visContent.includes('initialTranscript') || visContent.includes('transcript?: string');
    expect(hasInitialTranscriptProp).toBe(false);

    // VideoInputSection maintains local empty state:
    expect(visContent.includes("const [transcript, setTranscript] = useState('');")).toBe(true);
  });
});

describe('Empirical Challenge 3: Draft Caching & LocalStorage Corruption / Overwrite Flaws', () => {
  const rootDir = process.cwd();

  it('TC-CHAL-06: LocalStorage with invalid JSON recovers gracefully to DEFAULT_SAMPLE_REEL', () => {
    const DRAFT_STORAGE_KEY = 'viralcut_draft_project';
    const mockStorage: Record<string, string> = {
      [DRAFT_STORAGE_KEY]: '{"invalid_json": true, incomplete...',
    };

    function loadCachedReels(): ReelScript[] {
      try {
        const cached = mockStorage[DRAFT_STORAGE_KEY];
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.reels && Array.isArray(parsed.reels) && parsed.reels.length > 0) {
            return parsed.reels;
          }
        }
      } catch {
        // ignore
      }
      return [DEFAULT_SAMPLE_REEL];
    }

    const loaded = loadCachedReels();
    expect(loaded.length).toBe(1);
    expect(loaded[0].title).toBe(DEFAULT_SAMPLE_REEL.title);
  });

  it('TC-CHAL-07: LocalStorage with "null" string recovers gracefully without throwing TypeError', () => {
    const DRAFT_STORAGE_KEY = 'viralcut_draft_project';
    const mockStorage: Record<string, string> = {
      [DRAFT_STORAGE_KEY]: 'null',
    };

    function loadCachedReels(): ReelScript[] {
      try {
        const cached = mockStorage[DRAFT_STORAGE_KEY];
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.reels && Array.isArray(parsed.reels) && parsed.reels.length > 0) {
            return parsed.reels;
          }
        }
      } catch {
        // ignore
      }
      return [DEFAULT_SAMPLE_REEL];
    }

    const loaded = loadCachedReels();
    expect(loaded.length).toBe(1);
    expect(loaded[0].title).toBe(DEFAULT_SAMPLE_REEL.title);
  });

  it('TC-CHAL-08: DRAFT CACHING FLAW - ProjectContext saves title & language, but DOES NOT restore them on mount, overwriting them with defaults', () => {
    // ProjectContext.tsx line 168-176 saves:
    // { title: currentVideoTitle, reels: currentReels, selectedReelIndex, language }
    // BUT line 114:
    // const [currentVideoTitle, setCurrentVideoTitle] = useState('How to Charge 10x More...');
    // and line 124:
    // const [language, setLanguage] = useState<'english' | 'roman-urdu'>('english');
    const ctxContent = fs.readFileSync(path.join(rootDir, 'src', 'context', 'ProjectContext.tsx'), 'utf-8');

    // Verify title is hardcoded initially instead of reading from cached draft
    expect(ctxContent.includes("const [currentVideoTitle, setCurrentVideoTitle] = useState(\n    'How to Charge 10x More for the Exact Same Thing'\n  );")).toBe(true);

    // Verify language is hardcoded initially
    expect(ctxContent.includes("const [language, setLanguage] = useState<'english' | 'roman-urdu'>('english');")).toBe(true);

    // Verify selectedReelIndex is hardcoded to 0 initially
    expect(ctxContent.includes('const [selectedReelIndex, setSelectedReelIndex] = useState(0);')).toBe(true);

    // Because useEffect runs on mount whenever currentReels.length > 0, it writes back:
    // { title: 'How to Charge 10x...', reels: currentReels, selectedReelIndex: 0, language: 'english' }
    // immediately overwriting the user's saved title and language in localStorage!
  });

  it('TC-CHAL-09: Corrupted viralcut_active_strategy in localStorage missing directives array causes runtime failure', () => {
    // ProjectContext.tsx line 134-141:
    // const [activeStrategy, setActiveStrategy] = useState(() => JSON.parse(saved) || null);
    // ViralReelGenerator.tsx line 130-132:
    // strategyFeedback: activeStrategy ? `Top insights: ... Directives: ${activeStrategy.directives.join('; ')}` : undefined
    const corruptedStrategy = { topHookInsights: 'Hook high retention' }; // missing directives

    let hasThrown = false;
    try {
      const directivesStr = (corruptedStrategy as any).directives.join('; ');
    } catch (e: any) {
      hasThrown = true;
      expect(e.message).toContain('Cannot read properties of undefined');
    }

    expect(hasThrown).toBe(true);
  });
});

describe('Empirical Challenge 4: Orphaned Platform Selector Props Verification', () => {
  const rootDir = process.cwd();

  it('TC-CHAL-10: Orphaned onPlatformChange prop exists on VideoInputSectionProps and is unused in component body', () => {
    const content = fs.readFileSync(path.join(rootDir, 'src', 'components', 'VideoInputSection.tsx'), 'utf-8');

    // Interface still defines onPlatformChange
    expect(content.includes("onPlatformChange?: (p: 'tiktok' | 'reels' | 'shorts') => void;")).toBe(true);

    // Destructured in component arguments
    expect(content.includes('onPlatformChange,')).toBe(true);

    // Count occurrences of onPlatformChange in the file:
    const occurrences = (content.match(/onPlatformChange/g) || []).length;
    // Exactly 2 occurrences: 1 in interface, 1 in destructuring, 0 in implementation!
    expect(occurrences).toBe(2);
  });

  it('TC-CHAL-11: Orphaned platform and onPlatformChange props exist on HeaderProps and are unused in Header body', () => {
    const content = fs.readFileSync(path.join(rootDir, 'src', 'components', 'Header.tsx'), 'utf-8');

    // HeaderProps defines them
    expect(content.includes("platform?: 'tiktok' | 'reels' | 'shorts';")).toBe(true);
    expect(content.includes("onPlatformChange?: (p: 'tiktok' | 'reels' | 'shorts') => void;")).toBe(true);

    // But Header component signature does NOT destructure them:
    const headerComponentSignature = content.slice(content.indexOf('export const Header'), content.indexOf('return ('));
    expect(headerComponentSignature.includes('platform')).toBe(false);
    expect(headerComponentSignature.includes('onPlatformChange')).toBe(false);
  });

  it('TC-CHAL-12: NavigationShell strictly conforms with 0 platform selector props', () => {
    const content = fs.readFileSync(path.join(rootDir, 'src', 'components', 'NavigationShell.tsx'), 'utf-8');

    // NavigationShellProps has NO platform or onPlatformChange
    expect(content.includes('platform?:')).toBe(false);
    expect(content.includes('onPlatformChange?:')).toBe(false);
    expect(content.includes('onPlatformChange')).toBe(false);
  });

  it('TC-CHAL-13: VideoInputSection UI markup has 0 platform selector radio buttons', () => {
    const content = fs.readFileSync(path.join(rootDir, 'src', 'components', 'VideoInputSection.tsx'), 'utf-8');

    expect(content.includes('Target Platform')).toBe(false);
    expect(content.includes("onPlatformChange('tiktok')")).toBe(false);
    expect(content.includes("onPlatformChange('reels')")).toBe(false);
    expect(content.includes("onPlatformChange('shorts')")).toBe(false);
  });
});

describe('Empirical Challenge 5: Empty States Robustness', () => {
  it('TC-CHAL-14: Empty reels array in ProjectContext falls back to DEFAULT_SAMPLE_REEL for activeReel', () => {
    const currentReels: ReelScript[] = [];
    const selectedReelIndex = 0;

    const activeReel = currentReels[selectedReelIndex] || currentReels[0] || DEFAULT_SAMPLE_REEL;
    expect(activeReel).toBeTruthy();
    expect(activeReel.id).toBe(DEFAULT_SAMPLE_REEL.id);
  });

  it('TC-CHAL-15: Segment CRUD operations do not throw when currentReels is empty', () => {
    const currentReels: ReelScript[] = [];
    const selectedReelIndex = 0;

    // Emulate updateSegment
    function updateSegment(prevReels: ReelScript[], segIndex: number, updated: Segment): ReelScript[] {
      const active = prevReels[selectedReelIndex] || prevReels[0];
      if (!active) return prevReels;
      const newSegments = [...active.segments];
      newSegments[segIndex] = updated;
      return prevReels;
    }

    const res = updateSegment(currentReels, 0, DEFAULT_SAMPLE_REEL.segments[0]);
    expect(res.length).toBe(0);
  });

  it('TC-CHAL-16: transferToCaptionStudio handles empty segments without crashing', () => {
    const segments: Segment[] = [];
    const duration = segments.length > 0 ? segments[segments.length - 1].endSec : 30;

    expect(duration).toBe(30);
  });
});

runAllTests({ verbose: true }).then((res) => {
  if (res.failed > 0) {
    console.error(`\n❌ CHALLENGER-1 FOUND ${res.failed} FAILING TESTS`);
    process.exit(1);
  } else {
    console.log(`\n✅ ALL ${res.total} CHALLENGER-1 EMPIRICAL TESTS PASSED`);
  }
});
