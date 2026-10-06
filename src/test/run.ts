import { runAllUnitTests } from './unitTests';
import { runServerTests } from './serverTests';

console.log('--- Running Masirnama unit tests ---');
const client = runAllUnitTests();
const server = runServerTests();
const allPassed = client.allPassed && server.allPassed;
const results = [...client.results, ...server.results];
results.filter((r) => !r.passed).forEach((r) => console.error(`FAIL: ${r.name} -> ${r.message}`));
console.log(`${results.filter((r) => r.passed).length} passed, ${results.filter((r) => !r.passed).length} failed`);
process.exit(allPassed ? 0 : 1);
