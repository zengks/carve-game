// Shared test utilities for CARVE.
// The game ships as a single self-contained HTML file. These helpers extract
// its <script> body and run it under a headless stub of the browser APIs the
// game touches (DOM, canvas 2d context, Web Audio, rAF), so the pure
// simulation/physics can be exercised in Node without a browser.

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const GAME_PATH = fileURLToPath(new URL('../src/carve.html', import.meta.url));

/** Read src/carve.html and return the JS between the single <script> block. */
export function extractScript() {
  const html = fs.readFileSync(GAME_PATH, 'utf8');
  const open = html.indexOf('<script>');
  const close = html.indexOf('</script>', open);
  if (open === -1 || close === -1) throw new Error('Could not locate <script> block in carve.html');
  return html.slice(open + '<script>'.length, close).replace(/^\s*"use strict";\s*/, '');
}

const noop = () => {};

/** A Proxy that answers every property access with a no-op callable / sane default,
 *  good enough to stand in for a CanvasRenderingContext2D. */
function fakeCtx() {
  return new Proxy({}, {
    get: (_t, p) => {
      if (p === 'canvas') return { width: 800, height: 600 };
      if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop: noop });
      return typeof p === 'string' ? noop : undefined;
    },
  });
}

function fakeEl() {
  return {
    classList: { add: noop, remove: noop, toggle: noop },
    style: {}, addEventListener: noop,
    set onclick(_v) {}, set textContent(_v) {}, set innerHTML(_v) {},
    getContext: () => fakeCtx(), width: 800, height: 600,
  };
}

/** Install minimal browser globals so the game's top-level Game.init() runs. */
export function installDomStubs() {
  globalThis.window = globalThis;
  globalThis.document = { getElementById: fakeEl, createElement: fakeEl };
  globalThis.addEventListener = noop;
  globalThis.requestAnimationFrame = noop;
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.innerWidth = 800;
  globalThis.innerHeight = 600;
  globalThis.devicePixelRatio = 1;
  // No AudioContext on purpose -> Sfx.ensure() bails, audio is silently skipped.
}

/** Load the game into this process and return its internal objects. */
export function loadGame() {
  installDomStubs();
  let src = extractScript();
  src += '\nglobalThis.__T=T;globalThis.__Level=Level;globalThis.__Player=Player;'
       + 'globalThis.__Game=Game;globalThis.__Input=Input;';
  // eslint-disable-next-line no-eval
  (0, eval)(src);
  const { __T: T, __Level: Level, __Player: Player, __Game: Game, __Input: Input } = globalThis;
  return { T, Level, Player, Game, Input };
}

/** Begin a fresh playthrough (build level, reset player, clear scores). */
export function newRun(g) {
  const { Level, Player, Game } = g;
  Level.build(); Player.reset();
  Object.assign(Game, { flow: 0, score: 0, combo: 0, bestChain: 0, perfects: 0, time: 0, popups: [], running: true, dpr: 1, W: 800, H: 600 });
}

export const STEP = 1 / 120;
