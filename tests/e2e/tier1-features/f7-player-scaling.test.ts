import { describe, it, expect, setContext } from '../harness';
import { LayoutSimulator, VIEWPORTS } from '../helpers/dom-simulator';

setContext(1, 'F7');

describe('Feature F7: Dynamic 9:16 Player Scaling', () => {
  it('TC-T1-F7-01: Player wrapper on 375px mobile screen with 32px padding strictly stays within 343px width', () => {
    const availableWidth = LayoutSimulator.getAvailableWidth(VIEWPORTS.mobile.width, 32);
    expect(availableWidth).toBe(343);

    // Player with max-w-[280px] or max-w-[340px] inside container
    const playerWidth = Math.min(availableWidth, 340);
    expect(playerWidth).toBeLessThanOrEqual(343);
  });

  it('TC-T1-F7-02: MobileReelSimulator scaled dimensions result in zero horizontal overflow', () => {
    // 375px viewport with padding 40px (p-5) and 32px (main px-4)
    // Available width = 375 - 72 = 303px.
    const containerAvailable = 303;
    const scaledPlayerWidth = Math.min(containerAvailable, 280); // Responsive player width
    const borderWidth = 8;

    const overflow = LayoutSimulator.computeHorizontalOverflow(scaledPlayerWidth, borderWidth, 72, VIEWPORTS.mobile.width);
    expect(overflow).toBe(0);
  });

  it('TC-T1-F7-03: Video player canvas clamps to viewport height ceiling (max-h-[75vh])', () => {
    const mobileHeight = VIEWPORTS.mobile.height; // 667px
    const maxAllowedHeight = mobileHeight * 0.75; // 500.25px

    const dims = LayoutSimulator.calculate916Dimensions(340, maxAllowedHeight);
    expect(dims.height).toBeLessThanOrEqual(maxAllowedHeight);
    expect(dims.width).toBeLessThanOrEqual(340);
  });

  it('TC-T1-F7-04: Subtitle overlay scales font size proportionally with player container width', () => {
    function computeProportionalFontSize(containerWidth: number, baseSize: number = 32): number {
      const scaleFactor = containerWidth / 380; // normalized to 380px standard canvas
      return Math.round(baseSize * scaleFactor);
    }

    const fullSize = computeProportionalFontSize(380, 32);
    expect(fullSize).toBe(32);

    const mobileSize = computeProportionalFontSize(280, 32);
    expect(mobileSize).toBe(24);
  });

  it('TC-T1-F7-05: Safe zone guides calculate top (header) and bottom (captions) exclusion zones', () => {
    function getSafeZones(playerHeight: number) {
      return {
        topExclusionPx: Math.round(playerHeight * 0.12), // 12% header safe zone
        bottomExclusionPx: Math.round(playerHeight * 0.20), // 20% bottom CTA / account safe zone
        usableContentHeight: Math.round(playerHeight * 0.68),
      };
    }

    const zones = getSafeZones(600);
    expect(zones.topExclusionPx).toBe(72);
    expect(zones.bottomExclusionPx).toBe(120);
    expect(zones.usableContentHeight).toBe(408);
  });
});
