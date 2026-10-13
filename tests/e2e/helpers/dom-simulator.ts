/**
 * DOM Simulator & Responsive Viewport Layout Simulator
 * Calculates CSS box-model geometry, responsive grid mappings, and viewport boundaries.
 */

export interface ViewportConfig {
  name: 'mobile-small' | 'mobile' | 'tablet' | 'desktop' | 'desktop-wide';
  width: number;
  height: number;
}

export const VIEWPORTS: Record<string, ViewportConfig> = {
  mobileSmall: { name: 'mobile-small', width: 320, height: 568 },
  mobile: { name: 'mobile', width: 375, height: 667 },
  tablet: { name: 'tablet', width: 768, height: 1024 },
  desktop: { name: 'desktop', width: 1024, height: 768 },
  desktopWide: { name: 'desktop-wide', width: 1440, height: 900 },
};

export class LayoutSimulator {
  /**
   * Calculates available content width inside standard padding.
   */
  static getAvailableWidth(viewportWidth: number, paddingXTotal: number = 32): number {
    return Math.max(0, viewportWidth - paddingXTotal);
  }

  /**
   * Calculates theoretical 9:16 vertical dimensions given available container constraints.
   */
  static calculate916Dimensions(maxWidthConstraint: number, maxHeightConstraint: number): { width: number; height: number; aspectRatio: number } {
    let width = maxWidthConstraint;
    let height = (width * 16) / 9;

    if (height > maxHeightConstraint) {
      height = maxHeightConstraint;
      width = (height * 9) / 16;
    }

    return {
      width: Math.floor(width * 10) / 10,
      height: Math.floor(height * 10) / 10,
      aspectRatio: width / height,
    };
  }

  /**
   * Computes horizontal overflow in pixels.
   * Positive value indicates horizontal scrollbar / overflow defect.
   */
  static computeHorizontalOverflow(componentWidth: number, borderWidth: number, containerPadding: number, viewportWidth: number): number {
    const totalRequiredWidth = componentWidth + borderWidth + containerPadding;
    return Math.max(0, totalRequiredWidth - viewportWidth);
  }

  /**
   * Determines active Tailwind breakpoint from viewport width.
   */
  static getActiveBreakpoint(width: number): 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' {
    if (width >= 1536) return '2xl';
    if (width >= 1280) return 'xl';
    if (width >= 1024) return 'lg';
    if (width >= 768) return 'md';
    if (width >= 640) return 'sm';
    return 'base';
  }

  /**
   * Simulates column distribution across responsive breakpoints.
   */
  static getGridColumnSpan(width: number, config: { base: number; md?: number; lg?: number }): number {
    const bp = this.getActiveBreakpoint(width);
    if (['lg', 'xl', '2xl'].includes(bp) && config.lg !== undefined) return config.lg;
    if (['md', 'lg', 'xl', '2xl'].includes(bp) && config.md !== undefined) return config.md;
    return config.base;
  }

  /**
   * Asserts whether a modal container exceeds maximum viewport height.
   */
  static isModalWithinViewport(viewportHeight: number, modalMaxHeightPercent: number, contentNaturalHeight: number): { fits: boolean; renderedHeight: number } {
    const allowedHeight = (viewportHeight * modalMaxHeightPercent) / 100;
    const fits = contentNaturalHeight <= allowedHeight;
    return {
      fits,
      renderedHeight: Math.min(allowedHeight, contentNaturalHeight),
    };
  }
}
