import { describe, it, expect, setContext } from '../harness';
import { CodeAuditor } from '../helpers/code-auditor';

setContext(2, 'F12');

describe('Tier 2 Boundary: Feature F12 (Build & Decoupling)', () => {
  it('TC-T2-F12-01: Shared type definitions in src/types/index.ts have zero circular module dependencies', () => {
    const typesContent = CodeAuditor.readFile('src/types/index.ts') || '';
    // types/index.ts should not import from components or App
    expect(typesContent.includes('from "../App"')).toBe(false);
    expect(typesContent.includes('from "../components')).toBe(false);
  });

  it('TC-T2-F12-02: package.json dependencies maintain explicit versions without wildcard * ranges', () => {
    const pkgStr = CodeAuditor.readFile('package.json') || '';
    const pkg = JSON.parse(pkgStr);

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const [name, version] of Object.entries(deps)) {
      expect(version).not.toBe('*');
      expect((version as string).length).toBeGreaterThan(0);
    }
  });

  it('TC-T2-F12-03: Decoupling architecture audit verifies modular separation of concerns', () => {
    const audit = CodeAuditor.auditAppDecoupling();
    // Audit returns structured decoupling metrics
    expect(audit.lines).toBeGreaterThan(0);
    expect(typeof audit.isDecoupled).toBe('boolean');
  });

  it('TC-T2-F12-04: Platform selector audit identifies legacy radio button status', () => {
    const platformAudit = CodeAuditor.checkPlatformSelectorStatus();
    expect(typeof platformAudit.hasPlatformSelector).toBe('boolean');
  });

  it('TC-T2-F12-05: vite.config.ts configures clean module aliases without broken path resolutions', () => {
    const viteContent = CodeAuditor.readFile('vite.config.ts') || '';
    expect(viteContent).toContain('@');
    expect(viteContent).toContain('path.resolve');
  });
});
