import { runAllUnitTests } from './unitTests';

console.log('--- Running Masirnama unit tests ---');
const { allPassed, results } = runAllUnitTests();
results.filter((r) => !r.passed).forEach((r) => console.error(`FAIL: ${r.name} -> ${r.message}`));
console.log(`${results.filter((r) => r.passed).length} passed, ${results.filter((r) => !r.passed).length} failed`);
process.exit(allPassed ? 0 : 1);
