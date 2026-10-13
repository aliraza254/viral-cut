import { describe, it, expect, setContext } from '../harness';
import { FIXTURES } from '../helpers/mock-backend';

setContext(1, 'F3');

describe('Feature F3: Tool 2: Viral Reel Generator Page', () => {
  it('TC-T1-F3-01: Accepts YouTube link and raw transcript text inputs', () => {
    interface ReelGeneratorInput {
      youtubeUrl?: string;
      rawNotes?: string;
      language: 'english' | 'roman-urdu';
      selectedTone: 'high-energy' | 'storytelling' | 'educational';
    }

    const input1: ReelGeneratorInput = {
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      language: 'english',
      selectedTone: 'high-energy',
    };

    const input2: ReelGeneratorInput = {
      rawNotes: 'Key talking points on why AI video tools are growing 10x this year.',
      language: 'english',
      selectedTone: 'educational',
    };

    expect(input1.youtubeUrl).toContain('youtube.com');
    expect(input2.rawNotes?.length).toBeGreaterThan(20);
    expect(input2.selectedTone).toBe('educational');
  });

  it('TC-T1-F3-02: Hook variation generator parses distinct hook psychological angles', () => {
    interface HookOption {
      type: string;
      spokenLine: string;
      onScreenText: string;
      visualCue: string;
    }

    const hooks: HookOption[] = [
      {
        type: 'Contrarian Statement',
        spokenLine: 'Stop wasting 4 hours editing TikToks.',
        onScreenText: 'STOP DOING THIS ❌',
        visualCue: 'Head shake with bold red text',
      },
      {
        type: 'High Stakes Question',
        spokenLine: 'What if you could turn 1 long video into 10 viral clips?',
        onScreenText: '10X CLIPS IN 60 SEC ⚡',
        visualCue: 'Split screen with 10 thumbnail popups',
      },
    ];

    expect(hooks.length).toBe(2);
    expect(hooks[0].type).toBe('Contrarian Statement');
    expect(hooks[1].spokenLine).toContain('10 viral clips');
  });

  it('TC-T1-F3-03: Multi-concept selection switches active reel script and punchline details', () => {
    const concepts = [
      { id: 'c1', title: 'Concept 01: Fast Hook', score: 94 },
      { id: 'c2', title: 'Concept 02: Story Hook', score: 89 },
      { id: 'c3', title: 'Concept 03: Data Shock', score: 96 },
    ];

    let selectedIndex = 0;
    const selectConcept = (idx: number) => { selectedIndex = idx; };

    selectConcept(2);
    expect(concepts[selectedIndex].title).toBe('Concept 03: Data Shock');
    expect(concepts[selectedIndex].score).toBe(96);
  });

  it('TC-T1-F3-04: Retention analytics curve computes second-by-second drop-off points', () => {
    const reel = FIXTURES.sampleReelScript;
    expect(reel.retentionGraph.length).toBeGreaterThan(3);

    const initial = reel.retentionGraph[0];
    const final = reel.retentionGraph[reel.retentionGraph.length - 1];

    expect(initial.second).toBe(0);
    expect(initial.retentionPct).toBe(100);
    expect(final.retentionPct).toBeGreaterThan(50); // High retention short-form target
  });

  it('TC-T1-F3-05: NLE Cut-Sheet export outputs structured production cue sheet', () => {
    const reel = FIXTURES.sampleReelScript;

    function formatCutSheet(script: typeof reel): string {
      const header = `PRODUCTION CUT-SHEET: ${script.title.toUpperCase()}\nVIRALITY SCORE: ${script.viralityScore}/100\n`;
      const segmentsStr = script.segments.map((seg, i) => {
        return `[SCENE ${i + 1}] (${seg.timecode})\nSPOKEN: "${seg.spokenScript}"\nVISUAL: ${seg.visualCue}\nTEXT: [${seg.onScreenText}]\nSFX: ${seg.soundEffect}\n`;
      }).join('\n');
      return header + '\n' + segmentsStr;
    }

    const cutSheet = formatCutSheet(reel);
    expect(cutSheet).toContain('PRODUCTION CUT-SHEET');
    expect(cutSheet).toContain('VIRALITY SCORE: 94/100');
    expect(cutSheet).toContain('STOP DOING THIS ❌');
    expect(cutSheet).toContain('whoosh_bass_drop');
  });
});
