import assert from 'node:assert/strict';
import { loadGame, newRun, STEP } from './harness.mjs';
import { createGameServer } from '../scripts/serve.mjs';
const g = loadGame();
const { Player: P, Game: G, Input: I, Level: L, T } = g;
let passed = 0;
function test(name, fn) { newRun(g); fn(); passed++; console.log(`PASS ${name}`); }
function airborne() { P.x = 400; P.y = 700; P.onGround = false; }

test('surge retains momentum while steering; opposing steering brakes', () => {
  airborne(); I.keys = { d: true }; G.flow = 80; I.surgeQ = true;
  G.sim(STEP); const launch = P.vx;
  G.sim(STEP); assert(P.vx > launch * 0.95);
  const speed = P.vx; I.keys = { a: true }; G.sim(STEP); assert(P.vx < speed);
});
test('carve launch survives steering on next step', () => {
  airborne(); const b = L.blocks.find(b => b.kind === 'rock');
  I.keys = { a: true }; P.carve = { type: 'wallR', block: b, charge: 0.75 };
  P.releaseCarve(); const launch = P.vx; G.sim(STEP);
  assert(P.vx < -T.MAX_RUN); assert(Math.abs(P.vx) > Math.abs(launch) * 0.95);
});
test('Flow increases steering acceleration', () => {
  airborne(); I.keys = { d: true }; G.flow = 0; G.sim(STEP); const normal = P.vx;
  newRun(g); airborne(); I.keys = { d: true }; G.flow = 100; G.sim(STEP);
  assert(P.vx > normal * 1.2);
});
test('pole overhold slips without granting score or combo', () => {
  const pole = L.poles[0]; P.x = pole.x - P.w / 2; P.y = pole.y - 40 - P.h / 2;
  P.startPole(pole); P.pole.charge = T.SLIP_AT; I._tCarve = true; G.combo = 3; G.flow = 50;
  G.sim(STEP);
  assert.equal(P.state, 'AIR'); assert.equal(P.pole, null); assert.equal(G.combo, 0);
  assert.equal(G.score, 0); assert(P.vy < 0); assert(G.flow < 25);
});
test('landing activates a checkpoint and hazard returns to it', () => {
  const check = L.blocks.find(b => b.kind === 'check');
  P.x = check.x + 40; P.y = check.y + check.h + 1; P.vy = -240; P.collide(STEP);
  assert.equal(P.respawn.y, check.y + check.h + 1);
  const spike = L.blocks.find(b => b.hazard);
  P.x = spike.x + spike.w + 1; P.y = spike.y + 10; P.vx = -300; P.vy = 0; P.collide(STEP);
  assert.equal(P.x, P.respawn.x); assert.equal(P.y, P.respawn.y); assert(P.stun > 0);
});
test('restart clears transient player and queued input state', () => {
  Object.assign(P, { relatch: 0.14, onGround: true, wallDir: -1, coyote: 0.1 });
  Object.assign(I, { keys: { d: true }, _tCarve: true, jumpBuf: 0.1, surgeQ: true });
  G.comboTimer = 1; G.acc = 0.006; G.start();
  assert.equal(P.relatch, 0); assert.equal(P.wallDir, 0); assert.equal(P.onGround, false);
  assert.equal(P.coyote, 0); assert.equal(I.axis(), 0); assert(!I.carve());
  assert.equal(I.jumpBuf, 0); assert(!I.surgeQ); assert.equal(G.acc, 0); assert.equal(G.comboTimer, 0);
});
test('pointer cancellation releases touch without releasing keyboard input', () => {
  const right = document.getElementById('t-right');
  right.dispatch('pointerdown', { pointerId: 1 }); assert.equal(I.axis(), 1);
  right.dispatch('pointercancel', { pointerId: 1 }); assert.equal(I.axis(), 0);
  I.keys.arrowright = true;
  right.dispatch('pointerdown', { pointerId: 2 }); right.dispatch('lostpointercapture', { pointerId: 2 });
  assert.equal(I.axis(), 1);
  const carve = document.getElementById('t-carve');
  carve.dispatch('pointerdown', { pointerId: 3 }); assert(I.carve());
  carve.dispatch('pointercancel', { pointerId: 3 }); assert(!I.carve());
});
test('focus loss pauses and clears all queued input', () => {
  I.keys = { d: true }; I.surgeQ = true; I.jumpBuf = 0.1;
  dispatchWindow('blur'); assert(G.paused); assert.equal(I.axis(), 0); assert(!I.surgeQ); assert.equal(I.jumpBuf, 0);
  G.togglePause(); document.hidden = true; document.dispatch('visibilitychange');
  assert(G.paused); document.hidden = false;
});
test('victory stops catch-up simulation immediately and persists best score', () => {
  const goal = L.blocks.find(b => b.kind === 'goal'); P.x = goal.x; P.y = goal.y;
  G.score = 123; G.last = 0; G.frame(50);
  assert(!G.running); assert.equal(G.time, STEP);
  assert.equal(localStorage.getItem('carve.best'), '123');
});
test('unavailable storage does not prevent victory or mute', () => {
  const original = globalThis.localStorage;
  globalThis.localStorage = { setItem() { throw new Error('blocked'); } };
  G.score = 124; assert.doesNotThrow(() => G.victory());
  assert.doesNotThrow(() => document.getElementById('mutebtn').onclick());
  globalThis.localStorage = original;
});
test('HUD writes are outside the physics loop and skip unchanged values', () => {
  let writes = 0; const el = document.getElementById('h-score');
  Object.defineProperty(el, 'textContent', { configurable: true, set() { writes++; } });
  G.lastHUD = {}; for (let i = 0; i < 120; i++) G.sim(STEP);
  assert.equal(writes, 0);
  G.syncHUD(); G.syncHUD(); assert.equal(writes, 1);
});

test('paused game renders once instead of redrawing continuously', () => {
  G.togglePause(); let renders = 0; const render = G.render;
  G.render = () => renders++;
  for (let i = 1; i <= 60; i++) G.frame(i * 1000 / 60);
  assert.equal(renders, 1); assert.equal(G.time, 0); G.render = render;
});

test('phone camera follows overshoots and snaps back to respawn', () => {
  G.W = 390; G.H = 844; g.Cam.x = 950; g.Cam.zoom = 1; g.Cam.shake = 0;
  P.x = 950; let transform;
  G.ctx.setTransform = (...args) => { transform = args; };
  G.render();
  const screenX = (P.x + P.w / 2) * transform[0] + transform[4];
  assert(screenX > 0 && screenX < 390, 'overshooting player remains on screen');
  P.hit();
  assert.equal(g.Cam.x, P.x + P.w / 2);
  assert.equal(g.Cam.y, P.y + P.h / 2 + 150);
  delete G.ctx.setTransform;
});

const server = createGameServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.match(await (await fetch(base)).text(), /CARVE — flow climber/);
  assert.equal((await fetch(`${base}/package.json`)).status, 404);
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
  passed++; console.log('PASS local root serves game and excludes repository files');
} finally { await new Promise(resolve => server.close(resolve)); }
console.log(`${passed} regression tests passed`);
