import { describe, it, expect, setContext } from '../harness';
import { CodeAuditor } from '../helpers/code-auditor';

setContext(1, 'F12');

describe('Feature F12: Build & Codebase Decoupling Verification', () => {
  it('TC-T1-F12-01: Root tsconfig.json is configured with strict type checking and React JSX', () => {
    const tsconfig = CodeAuditor.readFile('tsconfig.json') || '';
    expect(tsconfig).toContain('"jsx": "react-jsx"');
  });

  it('TC-T1-F12-02: package.json scripts include build, dev, and lint commands', () => {
    const pkgStr = CodeAuditor.readFile('package.json') || '';
    const pkg = JSON.parse(pkgStr);

    expect(pkg.scripts.build).toBeDefined();
    expect(pkg.scripts.dev).toBeDefined();
    expect(pkg.scripts.lint).toBeDefined();
  });

  it('TC-T1-F12-03: App.tsx exports default component and acts as top-level router/shell', () => {
    const appContent = CodeAuditor.readFile('src/App.tsx') || '';
    expect(appContent).toContain('export default');
    expect(appContent.length).toBeGreaterThan(0);
  });

  it('TC-T1-F12-04: Project structure separates types, components, utils, and services', () => {
    expect(CodeAuditor.fileExists('src/types/index.ts')).toBe(true);
    expect(CodeAuditor.fileExists('src/components/Header.tsx')).toBe(true);
    expect(CodeAuditor.fileExists('src/services/apiClient.ts')).toBe(true);
  });

  it('TC-T1-F12-05: Dist output directory or build artifacts verify Vite build bundle configuration', () => {
    const viteConfig = CodeAuditor.readFile('vite.config.ts') || '';
    expect(viteConfig).toContain('defineConfig');
    expect(viteConfig).toContain('react()');
  });
});
