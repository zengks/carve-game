import assert from 'node:assert/strict';
import { loadGame, newRun, STEP } from './harness.mjs';
import { createGameServer } from '../scripts/serve.mjs';
const g = loadGame();
const { Player: P, Game: G, Input: I, Level: L, T } = g;
let passed = 0;
function test(name, fn) { newRun(g); fn(); passed++; console.log(`PASS ${name}`); }
function checkpoints() { L.ensure(1200); return L.blocks.filter(b=>b.kind==='check' && b.spine); }
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
  P.x = spike.x - P.w - 1; P.y = spike.y + 10; P.vx = 300; P.vy = 0; P.collide(STEP);
  assert.equal(P.x, P.respawn.x); assert.equal(P.y, P.respawn.y); assert(P.stun > 0);
});
test('carving a gold wall saves recovery without requiring a landing', () => {
  const b = L.blocks.find(b => b.kind === 'check');
  P.x = b.x - P.w; P.y = b.y + 30;
  P.startCarve({type: 'wallR', block: b});
  assert.equal(P.checkpoint, b); assert.equal(G.noticeTime, 4);
  assert.equal(P.respawn.y, b.y + b.h + 1);
  P.hit(); assert.equal(P.y, b.y + b.h + 1);
  const newer = checkpoints()[1];
  P.startCarve({type:'wallR', block:newer});
  P.startCarve({type:'wallR', block:b});
  assert.equal(P.checkpoint, newer);
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
test('unavailable storage does not prevent banking or mute', () => {
  const original = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  G.score = 124; assert.doesNotThrow(() => g.Journey.finish());
  assert(!G.running); assert.doesNotThrow(() => document.getElementById('mutebtn').onclick());
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

test('repeat surfaces cannot farm score, Flow, perfects or chain, even after a fall', () => {
  const b = L.blocks.find(b => b.kind === 'rock');
  const q = P.quality(0.75); P.award(q, b);
  const before = [G.score, G.flow, G.combo, G.perfects];
  for (let i = 0; i < 100; i++) P.award(q, b);
  assert.deepEqual([G.score, G.flow, G.combo, G.perfects], before);
  P.hit(); const score = G.score; P.award(q, b); assert.equal(G.score, score);
  newRun(g); P.award(q, L.blocks.find(b => b.kind === 'rock')); assert(G.score > 0);
});
test('one-way rails pass ascent and sides but catch descent from above', () => {
  const b = L.blocks.find(b => b.kind === 'rail');
  P.x = b.x + 40; P.y = b.y - P.h - 1; P.vy = 600; P.collide(STEP);
  assert.equal(P.vy, 600);
  P.y = b.y + b.h + 1; P.vy = -600; P.collide(STEP);
  assert(P.onGround); assert.equal(P.y, b.y + b.h);
  P.x = b.x - P.w - 1; P.y = b.y; P.vx = 600; P.vy = 0; P.collide(STEP);
  assert.equal(P.vx, 600); assert.notEqual(P.findCarve()?.block, b);
});
test('checkpoints announce once and cannot move recovery backwards', () => {
  const checks = checkpoints();
  const land = b => { P.x = b.x + 40; P.y = b.y + b.h + 1; P.vy = -240; P.collide(STEP); };
  land(checks[1]); assert.match(G.notice, /CHECKPOINT SAVED/); assert.equal(G.noticeTime, 4);
  G.noticeTime = 0; land(checks[1]); assert.equal(G.noticeTime, 0);
  land(checks[0]); assert.equal(P.checkpoint, checks[1]);
});
test('playable coaching advances on actions then yields to the current route objective', () => {
  G.syncHUD(); assert.match(document.getElementById('coach').textContent, /APPROACH/);
  I.keys.d = true; G.sim(STEP); assert.equal(G.lesson, 1);
  const blocks = L.blocks.filter(b => b.kind === 'rock');
  P.startCarve({type:'wallR', block:blocks[0]}); assert.equal(G.lesson, 2);
  P.carve.charge = 0.75; G.syncHUD(); assert.match(document.getElementById('coach').textContent, /RELEASE/);
  P.releaseCarve(); assert.equal(G.lesson, 3);
  P.award(P.quality(0.75), blocks[1]); G.sim(STEP); assert.equal(G.lesson, 4);
  G.syncHUD(); assert.equal(document.getElementById('coach').textContent,L.encounter(P.y).hint);
});

test('simultaneous touch movement and carve release independently', () => {
  const right = document.getElementById('t-right'), carve = document.getElementById('t-carve');
  right.dispatch('pointerdown', {pointerId: 30}); carve.dispatch('pointerdown', {pointerId: 31});
  assert.equal(I.axis(), 1); assert(I.carve());
  carve.dispatch('pointerup', {pointerId:31}); assert(!I.carve()); assert.equal(I.axis(), 1);
  right.dispatch('pointerup', {pointerId:30}); assert.equal(I.axis(), 0);
});
test('pause discards old touch contacts before a new gesture', () => {
  const right = document.getElementById('t-right');
  right.dispatch('pointerdown', {pointerId:40}); G.togglePause(); G.togglePause();
  right.dispatch('pointerdown', {pointerId:41}); right.dispatch('pointerup', {pointerId:41});
  assert.equal(I.axis(), 0, 'an old unreleased contact cannot stick the new gesture');
});
test('touch jump and steering work together through pointer events', () => {
  for (let i=0;i<20;i++) G.sim(STEP);
  document.getElementById('t-right').dispatch('pointerdown', {pointerId:50});
  document.getElementById('t-jump').dispatch('pointerdown', {pointerId:51});
  const y = P.y; G.sim(STEP); assert(P.y > y); assert(P.vx > 0);
  document.getElementById('t-right').dispatch('pointercancel', {pointerId:50}); assert.equal(I.axis(), 0);
});
test('touch coaching names visible controls rather than keyboard keys', () => {
  document.body.classList.add('istouch'); G.lastHUD = {}; G.syncHUD();
  assert.match(document.getElementById('coach').textContent, /thumb/);
  assert(!document.getElementById('coach').textContent.includes('Space'));
  document.body.classList.remove('istouch');
});
test('landscape camera keeps player and next rung visible', () => {
  G.W = 844; G.H = 390; g.Cam.zoom = 1; g.Cam.shake = 0;
  P.y = 500; g.Cam.y = P.y + P.h / 2 + 150;
  let m; G.ctx.setTransform = (...args) => { m = args; }; G.render();
  const screenY = (P.y + P.h / 2) * m[3] + m[5];
  const nextY = (P.y + 230) * m[3] + m[5];
  assert(screenY < G.H - 60); assert(nextY > 70); delete G.ctx.setTransform;
});

test('column-top catches default inward and respect explicit steering', () => {
  const b = L.blocks.find(b => b.kind === 'rock' && b.x > L.centerX);
  P.face = 1; P.startCarve({type:'rail', block:b});
  P.carve.charge = 0.75; P.releaseCarve(); assert(P.vx < 0);
  I.keys.arrowright = true; P.startCarve({type:'rail', block:b});
  P.carve.charge = 0.75; P.releaseCarve(); assert(P.vx > 0);
});
test('deep falls recover below the saved checkpoint even when camera follows', () => {
  const b = checkpoints()[1]; P.saveCheckpoint(b);
  P.x = 1000; P.y = P.respawn.y - 601; P.vy = -100;
  g.Cam.y = P.y + 150; P.collide(STEP);
  assert.equal(P.y, P.respawn.y); assert.equal(P.x, P.respawn.x);
  assert.equal(P.face, 1, 'left checkpoint faces back into lane');
  P.stun = 0; P.saveCheckpoint(checkpoints()[2]); P.hit();
  assert.equal(P.face, -1, 'right checkpoint faces back into lane');
});
test('falling below the start recovers without waiting for camera lag', () => {
  P.x = 1000; P.y = L.startY - 201; g.Cam.y = P.y; P.collide(STEP);
  assert.equal(P.y, P.respawn.y);
});

const server = createGameServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.match(await (await fetch(base)).text(), /CARVE · Endless Expedition/);
  assert.equal((await fetch(`${base}/package.json`)).status, 404);
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
  const manifest = await (await fetch(`${base}/site.webmanifest`)).json();
  for (const icon of manifest.icons) {
    const response = await fetch(base + icon.src);
    assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'image/png');
  }
  const favicon = await fetch(`${base}/favicon.ico`);
  assert.equal(favicon.status, 200);
  assert.deepEqual([...new Uint8Array(await favicon.arrayBuffer()).slice(0, 4)], [0, 0, 1, 0]);
  assert.equal((await fetch(`${base}/assets/branding/carve-grip-selected.png`)).status, 404, 'master stays outside public output');
  passed++; console.log('PASS local root serves game and excludes repository files');
} finally { await new Promise(resolve => server.close(resolve)); }
console.log(`${passed} regression tests passed`);
