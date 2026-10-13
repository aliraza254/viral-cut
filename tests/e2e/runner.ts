#!/usr/bin/env tsx
/**
 * ViralCut E2E Test Suite Master Runner
 * Usage:
 *   npx tsx tests/e2e/runner.ts
 *   npx tsx tests/e2e/runner.ts --tier=1
 *   npx tsx tests/e2e/runner.ts --feature=F1
 *   npx tsx tests/e2e/runner.ts --verbose
 */

import { runAllTests } from './harness';

// Import Tier 1 Feature Coverage test suites
import './tier1-features/f1-nav-switcher.test';
import './tier1-features/f2-caption-studio.test';
import './tier1-features/f3-viral-reel-generator.test';
import './tier1-features/f4-unified-format.test';
import './tier1-features/f5-state-preservation.test';
import './tier1-features/f6-responsive-grids.test';
import './tier1-features/f7-player-scaling.test';
import './tier1-features/f8-modals-drawers.test';
import './tier1-features/f9-backend-scaffold.test';
import './tier1-features/f10-fastapi-contracts.test';
import './tier1-features/f11-proxy-apiclient.test';
import './tier1-features/f12-build-decoupling.test';

// Import Tier 2 Boundary & Corner Cases test suites
import './tier2-boundary/f1-boundary.test';
import './tier2-boundary/f2-boundary.test';
import './tier2-boundary/f3-boundary.test';
import './tier2-boundary/f4-boundary.test';
import './tier2-boundary/f5-boundary.test';
import './tier2-boundary/f6-boundary.test';
import './tier2-boundary/f7-boundary.test';
import './tier2-boundary/f8-boundary.test';
import './tier2-boundary/f9-boundary.test';
import './tier2-boundary/f10-boundary.test';
import './tier2-boundary/f11-boundary.test';
import './tier2-boundary/f12-boundary.test';

// Import Tier 3 Cross-Feature Combination test suites
import './tier3-combinations/cross-feature-matrix.test';

// Import Tier 4 Real-World Application Scenario test suites
import './tier4-scenarios/e2e-scenarios.test';

async function main() {
  const args = process.argv.slice(2);

  let filterTier: number | undefined;
  let filterFeature: string | undefined;
  let verbose = false;

  for (const arg of args) {
    if (arg.startsWith('--tier=')) {
      filterTier = parseInt(arg.replace('--tier=', ''), 10);
    } else if (arg.startsWith('--feature=')) {
      filterFeature = arg.replace('--feature=', '').toUpperCase();
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    }
  }

  const results = await runAllTests({
    filterTier,
    filterFeature,
    verbose,
  });

  if (results.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
