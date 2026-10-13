/**
 * ViralCut E2E Test Framework Harness
 * Minimal, zero-dependency, type-safe test runner for Tiers 1-4.
 */

export interface TestCase {
  id: string;
  tier: 1 | 2 | 3 | 4;
  featureId?: string; // F1 - F12 (for Tier 1 & 2)
  name: string;
  fn: () => void | Promise<void>;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  durationMs: number;
  error?: Error;
}

export interface TestSuite {
  name: string;
  tier: 1 | 2 | 3 | 4;
  featureId?: string;
  cases: TestCase[];
}

export interface RunResults {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  tierCounts: {
    tier1: { total: number; passed: number; failed: number };
    tier2: { total: number; passed: number; failed: number };
    tier3: { total: number; passed: number; failed: number };
    tier4: { total: number; passed: number; failed: number };
  };
  failures: Array<{ testId: string; name: string; error: Error }>;
}

// Global Registry
const testSuites: TestSuite[] = [];
let currentSuite: TestSuite | null = null;
let currentTier: 1 | 2 | 3 | 4 = 1;
let currentFeatureId: string | undefined = undefined;

export function setContext(tier: 1 | 2 | 3 | 4, featureId?: string) {
  currentTier = tier;
  currentFeatureId = featureId;
}

export function describe(name: string, fn: () => void) {
  const suite: TestSuite = {
    name,
    tier: currentTier,
    featureId: currentFeatureId,
    cases: [],
  };
  currentSuite = suite;
  testSuites.push(suite);
  fn();
  currentSuite = null;
}

let testCounter = 1;
export function it(name: string, fn: () => void | Promise<void>) {
  if (!currentSuite) {
    throw new Error(`Test '${name}' must be inside a describe block`);
  }
  const id = `TC-T${currentSuite.tier}-${currentSuite.featureId ? currentSuite.featureId + '-' : ''}${String(testCounter++).padStart(3, '0')}`;
  currentSuite.cases.push({
    id,
    tier: currentSuite.tier,
    featureId: currentSuite.featureId,
    name,
    fn,
    status: 'pending',
    durationMs: 0,
  });
}

// Fluent assertions
export function expect<T>(actual: T) {
  const isNot = false;

  function createAssertionObject(negated: boolean) {
    return {
      toBe(expected: any) {
        const pass = Object.is(actual, expected);
        if (negated ? pass : !pass) {
          throw new Error(`Expected ${JSON.stringify(actual)} ${negated ? 'NOT to be' : 'to be'} ${JSON.stringify(expected)}`);
        }
      },
      toEqual(expected: any) {
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);
        const pass = actualStr === expectedStr;
        if (negated ? pass : !pass) {
          throw new Error(`Expected deep equality:\nActual:   ${actualStr}\nExpected: ${expectedStr}`);
        }
      },
      toBeTruthy() {
        const pass = Boolean(actual);
        if (negated ? pass : !pass) {
          throw new Error(`Expected ${JSON.stringify(actual)} ${negated ? 'NOT to be truthy' : 'to be truthy'}`);
        }
      },
      toBeFalsy() {
        const pass = !Boolean(actual);
        if (negated ? pass : !pass) {
          throw new Error(`Expected ${JSON.stringify(actual)} ${negated ? 'NOT to be falsy' : 'to be falsy'}`);
        }
      },
      toBeNull() {
        const pass = actual === null;
        if (negated ? pass : !pass) {
          throw new Error(`Expected ${JSON.stringify(actual)} ${negated ? 'NOT to be null' : 'to be null'}`);
        }
      },
      toBeDefined() {
        const pass = actual !== undefined;
        if (negated ? pass : !pass) {
          throw new Error(`Expected value ${negated ? 'NOT to be defined' : 'to be defined'}`);
        }
      },
      toBeUndefined() {
        const pass = actual === undefined;
        if (negated ? pass : !pass) {
          throw new Error(`Expected value ${negated ? 'NOT to be undefined' : 'to be undefined'}`);
        }
      },
      toContain(expectedItem: any) {
        let pass = false;
        if (typeof actual === 'string') {
          pass = actual.includes(String(expectedItem));
        } else if (Array.isArray(actual)) {
          pass = actual.some(item => JSON.stringify(item) === JSON.stringify(expectedItem) || item === expectedItem);
        }
        if (negated ? pass : !pass) {
          throw new Error(`Expected ${JSON.stringify(actual)} ${negated ? 'NOT to contain' : 'to contain'} ${JSON.stringify(expectedItem)}`);
        }
      },
      toMatch(pattern: RegExp | string) {
        const str = String(actual);
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        const pass = regex.test(str);
        if (negated ? pass : !pass) {
          throw new Error(`Expected "${str}" ${negated ? 'NOT to match' : 'to match'} ${regex}`);
        }
      },
      toThrow(expectedMsg?: string | RegExp) {
        if (typeof actual !== 'function') {
          throw new Error(`Expected a function for toThrow, got ${typeof actual}`);
        }
        let threw = false;
        let thrownError: any = null;
        try {
          (actual as any)();
        } catch (err: any) {
          threw = true;
          thrownError = err;
        }
        if (negated ? threw : !threw) {
          throw new Error(`Expected function ${negated ? 'NOT to throw' : 'to throw'}, but it ${threw ? 'threw: ' + thrownError.message : 'did not throw'}`);
        }
        if (threw && expectedMsg) {
          const message = thrownError?.message || String(thrownError);
          const matches = typeof expectedMsg === 'string' ? message.includes(expectedMsg) : expectedMsg.test(message);
          if (!matches) {
            throw new Error(`Expected error message to match ${expectedMsg}, got "${message}"`);
          }
        }
      },
      toBeGreaterThan(expected: number) {
        const pass = (actual as any) > expected;
        if (negated ? pass : !pass) {
          throw new Error(`Expected ${actual} ${negated ? 'NOT to be >' : 'to be >'} ${expected}`);
        }
      },
      toBeLessThan(expected: number) {
        const pass = (actual as any) < expected;
        if (negated ? pass : !pass) {
          throw new Error(`Expected ${actual} ${negated ? 'NOT to be <' : 'to be <'} ${expected}`);
        }
      },
      toBeGreaterThanOrEqual(expected: number) {
        const pass = (actual as any) >= expected;
        if (negated ? pass : !pass) {
          throw new Error(`Expected ${actual} ${negated ? 'NOT to be >=' : 'to be >='} ${expected}`);
        }
      },
      toBeLessThanOrEqual(expected: number) {
        const pass = (actual as any) <= expected;
        if (negated ? pass : !pass) {
          throw new Error(`Expected ${actual} ${negated ? 'NOT to be <=' : 'to be <='} ${expected}`);
        }
      },
    };
  }

  return {
    ...createAssertionObject(false),
    not: createAssertionObject(true),
  };
}

// Runner Execution
export async function runAllTests(options: {
  filterTier?: number;
  filterFeature?: string;
  verbose?: boolean;
} = {}): Promise<RunResults> {
  const startTime = Date.now();
  const results: RunResults = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    durationMs: 0,
    tierCounts: {
      tier1: { total: 0, passed: 0, failed: 0 },
      tier2: { total: 0, passed: 0, failed: 0 },
      tier3: { total: 0, passed: 0, failed: 0 },
      tier4: { total: 0, passed: 0, failed: 0 },
    },
    failures: [],
  };

  const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
  const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
  const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
  const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
  const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
  const gray = (s: string) => `\x1b[90m${s}\x1b[0m`;

  console.log(`\n${bold('========================================================================')}`);
  console.log(`${bold(cyan('  VIRALCUT E2E COMPREHENSIVE TEST SUITE RUNNER (TIERS 1 - 4)'))}`);
  console.log(`${bold('========================================================================')}\n`);

  for (const suite of testSuites) {
    if (options.filterTier && suite.tier !== options.filterTier) continue;
    if (options.filterFeature && suite.featureId !== options.filterFeature) continue;

    const tierKey = `tier${suite.tier}` as keyof typeof results.tierCounts;
    const tierName = `[Tier ${suite.tier}${suite.featureId ? ' | ' + suite.featureId : ''}]`;
    console.log(`${cyan(bold(tierName))} ${bold(suite.name)}`);

    for (const testCase of suite.cases) {
      results.total++;
      results.tierCounts[tierKey].total++;

      const testStart = Date.now();
      try {
        await testCase.fn();
        testCase.durationMs = Date.now() - testStart;
        testCase.status = 'passed';
        results.passed++;
        results.tierCounts[tierKey].passed++;

        if (options.verbose || process.env.VERBOSE) {
          console.log(`  ${green('✔')} ${gray(testCase.id)} ${testCase.name} ${gray(`(${testCase.durationMs}ms)`)}`);
        }
      } catch (err: any) {
        testCase.durationMs = Date.now() - testStart;
        testCase.status = 'failed';
        testCase.error = err;
        results.failed++;
        results.tierCounts[tierKey].failed++;
        results.failures.push({
          testId: testCase.id,
          name: `${suite.name} > ${testCase.name}`,
          error: err,
        });

        console.log(`  ${red('✖')} ${red(testCase.id)} ${testCase.name}`);
        console.log(`    ${red(err.message || String(err))}`);
        if (err.stack) {
          const filteredStack = err.stack.split('\n').slice(1, 4).join('\n    ');
          console.log(`    ${gray(filteredStack)}`);
        }
      }
    }
  }

  results.durationMs = Date.now() - startTime;

  // Print Summary Table
  console.log(`\n${bold('------------------------------------------------------------------------')}`);
  console.log(`${bold('EXECUTION SUMMARY')}`);
  console.log(`${bold('------------------------------------------------------------------------')}`);
  console.log(`  Tier 1 (Feature Coverage):       ${results.tierCounts.tier1.passed} / ${results.tierCounts.tier1.total} passed`);
  console.log(`  Tier 2 (Boundary & Corner):      ${results.tierCounts.tier2.passed} / ${results.tierCounts.tier2.total} passed`);
  console.log(`  Tier 3 (Cross-Feature Matrix):   ${results.tierCounts.tier3.passed} / ${results.tierCounts.tier3.total} passed`);
  console.log(`  Tier 4 (Real-World Scenarios):   ${results.tierCounts.tier4.passed} / ${results.tierCounts.tier4.total} passed`);
  console.log(`${bold('------------------------------------------------------------------------')}`);
  const passRate = results.total > 0 ? Math.round((results.passed / results.total) * 100) : 0;
  const statusStr = results.failed === 0 ? green(`ALL ${results.total} TESTS PASSED (100%)`) : red(`${results.failed} TEST(S) FAILED (${passRate}%)`);
  console.log(`  ${bold('TOTAL STATUS:')}   ${statusStr}`);
  console.log(`  ${bold('TOTAL TIME:')}     ${results.durationMs} ms`);
  console.log(`${bold('========================================================================')}\n`);

  return results;
}
