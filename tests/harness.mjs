// Shared test utilities for CARVE.
// The game ships as a single self-contained HTML file. These helpers extract
// its <script> body and run it under a headless stub of the browser APIs the
// game touches (DOM, canvas 2d context, Web Audio, rAF), so the pure
// simulation/physics can be exercised in Node without a browser.

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const GAME_PATH = fileURLToPath(new URL('../src/expedition.html', import.meta.url));

/** Read src/expedition.html and return the JS between the single <script> block. */
export function extractScript(gamePath = GAME_PATH) {
  const html = fs.readFileSync(gamePath, 'utf8');
  const open = html.indexOf('<script>');
  const close = html.indexOf('</script>', open);
  if (open === -1 || close === -1) throw new Error('Could not locate <script> block in expedition.html');
  return html.slice(open + '<script>'.length, close).replace(/^\s*"use strict";\s*/, '');
}

const noop = () => {};

/** A Proxy that answers every property access with a no-op callable / sane default,
 *  good enough to stand in for a CanvasRenderingContext2D. */
function fakeCtx() {
  return new Proxy({}, {
    get: (target, p) => {
      if (p in target) return target[p];
      if (p === 'canvas') return { width: 800, height: 600 };
      if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop: noop });
      return typeof p === 'string' ? noop : undefined;
    },
  });
}

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    dispatch(type, detail = {}) {
      const e = { preventDefault: noop, ...detail };
      for (const fn of listeners.get(type) || []) fn(e);
      return e;
    },
  };
}
function fakeEl() {
  const classes = new Set();
  return {
    ...eventTarget(),
    classList: {
      add: name => classes.add(name), remove: name => classes.delete(name),
      contains: name => classes.has(name),
      toggle(name, force) { if (force ?? !classes.has(name)) classes.add(name); else classes.delete(name); },
    },
    style: {setProperty(name,value){this[name]=value;}}, textContent: '', innerHTML: '', children: [], value: '',
    appendChild(child) { this.children.push(child); },
    setAttribute(name, value) { this[name] = value; },
    showModal() { this.open = true; }, close() { this.open = false; },
    setPointerCapture: noop,
    getContext: () => fakeCtx(), width: 800, height: 600,
  };
}

/** Install minimal browser globals so the game's top-level Game.init() runs. */
export function installDomStubs(options = {}) {
  globalThis.window = globalThis;
  const elements = new Map();
  globalThis.document = {
    ...eventTarget(), body: fakeEl(), hidden: false,
    getElementById(id) { if (!elements.has(id)) elements.set(id, fakeEl()); return elements.get(id); },
    createElement: fakeEl,
    querySelector() { return [...elements.values()].find(el => el.open) || null; },
  };
  const events = eventTarget();
  globalThis.addEventListener = events.addEventListener;
  globalThis.dispatchWindow = events.dispatch;
  const storage = options.local || new Map();
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  const session = options.session || new Map();
  globalThis.sessionStorage = { getItem: key => session.get(key) ?? null, setItem: (key, value) => session.set(key, value) };
  globalThis.requestAnimationFrame = noop;
  globalThis.matchMedia = () => ({ matches: !!options.coarse });
  globalThis.location = {search:options.search || ''};
  globalThis.innerWidth = 800;
  globalThis.innerHeight = 600;
  globalThis.devicePixelRatio = 1;
  // No AudioContext on purpose -> Sfx.ensure() bails, audio is silently skipped.
}

/** Load the game into this process and return its internal objects. */
export function loadGame(options = {}) {
  installDomStubs(options);
  let src = extractScript(options.path);
  if(options.production)src=src.replace('const TESTING = true;', 'const TESTING = false;');
  src += '\nglobalThis.__T=T;globalThis.__Level=Level;globalThis.__Player=Player;'
       + 'globalThis.__Game=Game;globalThis.__Input=Input;globalThis.__Cam=Cam;globalThis.__RunSave=RunSave;globalThis.__Journey=typeof Journey === "undefined" ? null : Journey;globalThis.__Relics=typeof Relics === "undefined" ? null : Relics;globalThis.__Routes=Routes;globalThis.__Journal=Journal;globalThis.__Profile=typeof Profile === "undefined" ? null : Profile;';
  // eslint-disable-next-line no-eval
  (0, eval)(src);
  const { __T: T, __Level: Level, __Player: Player, __Game: Game, __Input: Input, __Cam: Cam, __RunSave: RunSave, __Journey: Journey, __Profile: Profile, __Relics: Relics, __Routes: Routes, __Journal: Journal } = globalThis;
  return { T, Level, Player, Game, Input, Cam, RunSave, Journey, Profile, Relics, Routes, Journal };
}

/** Begin a fresh playthrough (build level, reset player, clear scores). */
export function newRun(g) {
  g.Game.start();
  Object.assign(g.Game, { dpr: 1, W: 800, H: 600 });
}

export const STEP = 1 / 120;
