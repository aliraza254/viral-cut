/**
 * Code & Architecture Auditor for ViralCut E2E Verification
 * Inspects filesystem structure, requirements, proxy configurations, and decoupling indicators.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export class CodeAuditor {
  private static rootDir = process.cwd();

  static getRootPath(...parts: string[]): string {
    return path.join(this.rootDir, ...parts);
  }

  static fileExists(relativePath: string): boolean {
    const fullPath = this.getRootPath(relativePath);
    return fs.existsSync(fullPath);
  }

  static readFile(relativePath: string): string | null {
    const fullPath = this.getRootPath(relativePath);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath, 'utf-8');
  }

  static countLines(relativePath: string): number {
    const content = this.readFile(relativePath);
    if (!content) return 0;
    return content.split(/\r?\n/).length;
  }

  /**
   * Verifies that backend/requirements.txt includes required packages.
   */
  static verifyPythonRequirements(packages: string[]): { found: string[]; missing: string[] } {
    const content = this.readFile('backend/requirements.txt');
    if (!content) return { found: [], missing: packages };

    const lines = content
      .split('\n')
      .map(l => l.trim().toLowerCase())
      .filter(l => l && !l.startsWith('#'));

    const found: string[] = [];
    const missing: string[] = [];

    for (const pkg of packages) {
      const lower = pkg.toLowerCase();
      const match = lines.some(l => l.startsWith(lower) || l.includes(lower));
      if (match) {
        found.push(pkg);
      } else {
        missing.push(pkg);
      }
    }

    return { found, missing };
  }

  /**
   * Checks whether Vite config has proxy setup for /api.
   */
  static verifyViteProxyConfig(): { configured: boolean; targetUrl?: string } {
    const content = this.readFile('vite.config.ts');
    if (!content) return { configured: false };

    const hasProxy = content.includes('proxy') && content.includes('/api');
    const match = content.match(/target:\s*['"`]([^'"`]+)['"`]/);

    return {
      configured: hasProxy || content.includes('expressPlugin'),
      targetUrl: match ? match[1] : undefined,
    };
  }

  /**
   * Checks whether redundant platform radio buttons (TikTok, Reels, Shorts) are in VideoInputSection.
   */
  static checkPlatformSelectorStatus(): { hasPlatformSelector: boolean; occurrences: number } {
    const content = this.readFile('src/components/VideoInputSection.tsx');
    if (!content) return { hasPlatformSelector: false, occurrences: 0 };

    const hasRadioButtons =
      content.includes("onPlatformChange('tiktok')") ||
      content.includes("onPlatformChange('reels')") ||
      content.includes("onPlatformChange('shorts')") ||
      content.includes('Target Platform');

    return {
      hasPlatformSelector: hasRadioButtons,
      occurrences: hasRadioButtons ? 1 : 0,
    };
  }

  /**
   * Audits App.tsx line count and decoupling metrics.
   */
  static auditAppDecoupling(): {
    lines: number;
    isDecoupled: boolean;
    usesProjectContext: boolean;
    hasToolPages: boolean;
  } {
    const appContent = this.readFile('src/App.tsx') || '';
    const lines = appContent.split(/\r?\n/).length;

    const usesProjectContext =
      appContent.includes('ProjectProvider') ||
      appContent.includes('useProject') ||
      appContent.includes('activeTool');

    const hasCaptionStudioPage = this.fileExists('src/pages/CaptionStudio.tsx');
    const hasViralReelPage = this.fileExists('src/pages/ViralReelGenerator.tsx');

    return {
      lines,
      isDecoupled: hasCaptionStudioPage && hasViralReelPage,
      usesProjectContext,
      hasToolPages: hasCaptionStudioPage && hasViralReelPage,
    };
  }
}
