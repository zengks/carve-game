// Syntax check: parse the game's <script> body without executing it.
// `new Function(body)` compiles the source and throws on any syntax error,
// which is a fast structural check that needs no browser.
import { extractScript } from './harness.mjs';

try {
  // eslint-disable-next-line no-new, no-new-func
  new Function(extractScript());
  console.log('SYNTAX OK');
} catch (e) {
  console.error('SYNTAX ERROR:', e.message);
  process.exit(1);
}
