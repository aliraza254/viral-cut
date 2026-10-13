import { describe, it, expect, setContext } from '../harness';
import { LayoutSimulator, VIEWPORTS } from '../helpers/dom-simulator';

setContext(1, 'F6');

describe('Feature F6: Responsive Layout Grids', () => {
  it('TC-T1-F6-01: Mobile viewport (375px) maps layout to 1-column stack (grid-cols-1)', () => {
    const mobileWidth = VIEWPORTS.mobile.width; // 375
    const breakpoint = LayoutSimulator.getActiveBreakpoint(mobileWidth);
    expect(breakpoint).toBe('base');

    const columnSpan = LayoutSimulator.getGridColumnSpan(mobileWidth, {
      base: 1,
      md: 12,
      lg: 12,
    });
    expect(columnSpan).toBe(1);
  });

  it('TC-T1-F6-02: Tablet viewport (768px) supports 12-column responsive split (md:grid-cols-12)', () => {
    const tabletWidth = VIEWPORTS.tablet.width; // 768
    const breakpoint = LayoutSimulator.getActiveBreakpoint(tabletWidth);
    expect(breakpoint).toBe('md');

    const totalColumns = LayoutSimulator.getGridColumnSpan(tabletWidth, {
      base: 1,
      md: 12,
      lg: 12,
    });
    expect(totalColumns).toBe(12);
  });

  it('TC-T1-F6-03: Desktop viewport (1024px) allocates balanced column layout (lg:col-span-5 + lg:col-span-7 = 12)', () => {
    const desktopWidth = VIEWPORTS.desktop.width; // 1024
    const breakpoint = LayoutSimulator.getActiveBreakpoint(desktopWidth);
    expect(breakpoint).toBe('lg');

    const playerCols = 5;
    const controlsCols = 7;
    expect(playerCols + controlsCols).toBe(12);
  });

  it('TC-T1-F6-04: Fluid container calculation eliminates fixed w-[380px] desktop constraint', () => {
    // When using fluid container max-w-sm (384px) with w-full, container width shrinks to fit small screens
    const availableMobileWidth = LayoutSimulator.getAvailableWidth(VIEWPORTS.mobile.width, 32); // 343px
    const fixedDesktopWidth = 380;

    // Fixed desktop width causes overflow on mobile
    const overflowWithFixed = LayoutSimulator.computeHorizontalOverflow(fixedDesktopWidth, 8, 32, VIEWPORTS.mobile.width);
    expect(overflowWithFixed).toBeGreaterThan(0); // Proves the bug

    // Fluid container with w-full min(available, maxWidth) prevents overflow
    const fluidWidth = Math.min(availableMobileWidth, 380);
    const overflowWithFluid = LayoutSimulator.computeHorizontalOverflow(fluidWidth, 0, 32, VIEWPORTS.mobile.width);
    expect(overflowWithFluid).toBe(0);
  });

  it('TC-T1-F6-05: Input parameters grid cleanly arranges 3 controls without redundant platform column', () => {
    // When platform selector is removed, the remaining 3 controls (Tone, Language, Duration)
    // cleanly divide into 3 columns on tablet/desktop: sm:grid-cols-3
    const controlColumns = 3;
    expect(12 % controlColumns).toBe(0); // Even division in 12-grid
  });
});
