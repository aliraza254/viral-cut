import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect, setContext, runAllTests } from './e2e/harness';

setContext(1, 'F12');

describe('Adversarial Challenger 2: Empirical Verification for Milestone 2', () => {
  const rootDir = process.cwd();

  it('TC-ADV-01: App.tsx line count is strictly <= 100 lines and decoupled', () => {
    const appPath = path.join(rootDir, 'src', 'App.tsx');
    expect(fs.existsSync(appPath)).toBe(true);

    const content = fs.readFileSync(appPath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const lineCount = lines.length;

    console.log(`\n  [Adversarial Check] App.tsx actual line count: ${lineCount}`);
    expect(lineCount).toBeLessThanOrEqual(100);

    // Verify absence of local domain state
    expect(content.includes('useState')).toBe(false);
    expect(content.includes('useEffect')).toBe(false);
    expect(content.includes('useReducer')).toBe(false);

    // Verify proper use of ProjectProvider and useProject
    expect(content.includes('ProjectProvider')).toBe(true);
    expect(content.includes('useProject')).toBe(true);
    expect(content.includes('NavigationShell')).toBe(true);
    expect(content.includes('CaptionStudio')).toBe(true);
    expect(content.includes('ViralReelGenerator')).toBe(true);
  });

  it('TC-ADV-02: Platform selector radio buttons are completely removed from VideoInputSection', () => {
    const inputSectionPath = path.join(rootDir, 'src', 'components', 'VideoInputSection.tsx');
    expect(fs.existsSync(inputSectionPath)).toBe(true);

    const content = fs.readFileSync(inputSectionPath, 'utf-8');

    expect(content.includes("onPlatformChange('tiktok')")).toBe(false);
    expect(content.includes("onPlatformChange('reels')")).toBe(false);
    expect(content.includes("onPlatformChange('shorts')")).toBe(false);
    expect(content.includes('Target Platform')).toBe(false);
    expect(content.includes('grid-cols-1 gap-3 sm:grid-cols-3')).toBe(true);
  });

  it('TC-ADV-03: Production bundle artifacts in dist/ are complete, well-formed, and valid', () => {
    const distPath = path.join(rootDir, 'dist');
    const indexPath = path.join(distPath, 'index.html');

    expect(fs.existsSync(indexPath)).toBe(true);
    const htmlContent = fs.readFileSync(indexPath, 'utf-8');

    // Extract JS and CSS bundle filenames
    const jsMatch = htmlContent.match(/src="\/assets\/(index-[a-zA-Z0-9_-]+\.js)"/);
    const cssMatch = htmlContent.match(/href="\/assets\/(index-[a-zA-Z0-9_-]+\.css)"/);

    expect(jsMatch !== null).toBe(true);
    expect(cssMatch !== null).toBe(true);

    const jsFileName = jsMatch![1];
    const cssFileName = cssMatch![1];

    const jsFilePath = path.join(distPath, 'assets', jsFileName);
    const cssFilePath = path.join(distPath, 'assets', cssFileName);

    expect(fs.existsSync(jsFilePath)).toBe(true);
    expect(fs.existsSync(cssFilePath)).toBe(true);

    const jsStat = fs.statSync(jsFilePath);
    const cssStat = fs.statSync(cssFilePath);

    console.log(`  [Adversarial Check] Production JS: ${jsFileName} (${(jsStat.size / 1024).toFixed(2)} KB)`);
    console.log(`  [Adversarial Check] Production CSS: ${cssFileName} (${(cssStat.size / 1024).toFixed(2)} KB)`);

    expect(jsStat.size).toBeGreaterThan(100 * 1024); // Should be a substantial production bundle (>100KB)
    expect(cssStat.size).toBeGreaterThan(10 * 1024);  // Should have CSS styles (>10KB)

    const jsCode = fs.readFileSync(jsFilePath, 'utf-8');
    // Ensure no unbundled JSX markers or raw TypeScript remains
    expect(jsCode.includes('import React from')).toBe(false);
    expect(jsCode.includes('export default')).toBe(false);
  });

  it('TC-ADV-04: Tool pages (CaptionStudio and ViralReelGenerator) exist and export valid components', () => {
    const captionStudioPath = path.join(rootDir, 'src', 'pages', 'CaptionStudio.tsx');
    const viralReelPath = path.join(rootDir, 'src', 'pages', 'ViralReelGenerator.tsx');

    expect(fs.existsSync(captionStudioPath)).toBe(true);
    expect(fs.existsSync(viralReelPath)).toBe(true);

    const csContent = fs.readFileSync(captionStudioPath, 'utf-8');
    const vrContent = fs.readFileSync(viralReelPath, 'utf-8');

    expect(csContent.includes('export const CaptionStudio')).toBe(true);
    expect(csContent.includes('useProject')).toBe(true);

    expect(vrContent.includes('export const ViralReelGenerator')).toBe(true);
    expect(vrContent.includes('useProject')).toBe(true);
  });

  it('TC-ADV-05: Bidirectional transfer state contracts exist between both tools', () => {
    const csContent = fs.readFileSync(path.join(rootDir, 'src', 'pages', 'CaptionStudio.tsx'), 'utf-8');
    const vrContent = fs.readFileSync(path.join(rootDir, 'src', 'pages', 'ViralReelGenerator.tsx'), 'utf-8');
    const ctxContent = fs.readFileSync(path.join(rootDir, 'src', 'context', 'ProjectContext.tsx'), 'utf-8');

    // Caption Studio -> Viral Reel Generator
    expect(csContent.includes('handleTransferToReelGenerator')).toBe(true);
    expect(csContent.includes("setActiveTool('viral-generator')")).toBe(true);

    // Viral Reel Generator -> Caption Studio
    expect(vrContent.includes('transferToCaptionStudio')).toBe(true);
    expect(ctxContent.includes('transferToCaptionStudio')).toBe(true);
    expect(ctxContent.includes("setActiveTool('caption-studio')")).toBe(true);
  });
});

runAllTests({ verbose: true }).then((res) => {
  if (res.failed > 0) {
    process.exit(1);
  }
});
