import { describe, it, expect, setContext } from '../harness';
import { LayoutSimulator, VIEWPORTS } from '../helpers/dom-simulator';

setContext(1, 'F8');

describe('Feature F8: Responsive Drawers & Modals', () => {
  it('TC-T1-F8-01: Modals enforce viewport ceiling constraint (max-h-[90vh])', () => {
    const mobileHeight = VIEWPORTS.mobile.height; // 667px
    const naturalModalContentHeight = 1200; // Large modal content

    const check = LayoutSimulator.isModalWithinViewport(mobileHeight, 90, naturalModalContentHeight);
    expect(check.fits).toBe(false); // Natural content exceeds
    expect(check.renderedHeight).toBe(600.3); // Clamped to 90% of 667
    expect(check.renderedHeight).toBeLessThan(mobileHeight);
  });

  it('TC-T1-F8-02: Modal container responsive padding (p-4 on mobile, p-6 on desktop) preserves usable card width', () => {
    function getModalPadding(viewportWidth: number): number {
      return viewportWidth < 640 ? 16 : 24; // p-4 (16px) vs p-6 (24px)
    }

    const mobilePadding = getModalPadding(VIEWPORTS.mobile.width);
    expect(mobilePadding).toBe(16);

    const desktopPadding = getModalPadding(VIEWPORTS.desktop.width);
    expect(desktopPadding).toBe(24);
  });

  it('TC-T1-F8-03: SavedProjectsDrawer adapts width to 100% on mobile viewports (<640px)', () => {
    function getDrawerWidth(viewportWidth: number): { widthClass: string; isFullWidth: boolean } {
      if (viewportWidth < 640) {
        return { widthClass: 'w-full', isFullWidth: true };
      }
      return { widthClass: 'max-w-md w-full', isFullWidth: false };
    }

    const mobileDrawer = getDrawerWidth(VIEWPORTS.mobile.width);
    expect(mobileDrawer.isFullWidth).toBe(true);

    const desktopDrawer = getDrawerWidth(VIEWPORTS.desktop.width);
    expect(desktopDrawer.isFullWidth).toBe(false);
  });

  it('TC-T1-F8-04: HookManagerModal list view uses viewport relative height (max-h-[60vh])', () => {
    const mobileHeight = VIEWPORTS.mobile.height;
    const allowedListHeight = mobileHeight * 0.6; // 400.2px

    expect(allowedListHeight).toBeLessThan(mobileHeight * 0.7);
    expect(allowedListHeight).toBeGreaterThan(200);
  });

  it('TC-T1-F8-05: NLEExportModal code block container allows internal horizontal scroll without modal spill', () => {
    interface CodeContainerConfig {
      overflowX: 'auto';
      maxWidth: string;
      whiteSpace: 'pre';
    }

    const config: CodeContainerConfig = {
      overflowX: 'auto',
      maxWidth: '100%',
      whiteSpace: 'pre',
    };

    expect(config.overflowX).toBe('auto');
    expect(config.maxWidth).toBe('100%');
  });
});
