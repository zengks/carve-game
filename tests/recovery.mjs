import assert from 'node:assert/strict';
import { loadGame, newRun, STEP } from './harness.mjs';
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
const key = 'carve.run.v1';

test('reload restores an airborne run paused, including score, checkpoint and surface rewards', () => {
  const session = new Map(); let g = loadGame({session}); newRun(g);
  const check = g.Level.blocks.find(b => b.kind === 'check');
  g.Player.saveCheckpoint(check);
  const wall = g.Level.blocks.find(b => b.kind === 'rock');
  g.Player.award(g.Player.quality(0.75), wall);
  Object.assign(g.Player, {x: 420, y: 1400, vx: -610, vy: 804, surgeCD: 0.2, stun: 0.1});
  g.Game.time = 32.5; g.Game.lesson = 4; g.Game.setTouch(true);
  const expected = {score:g.Game.score, flow:g.Game.flow, combo:g.Game.combo};
  g.Input.keys.d = true; dispatchWindow('beforeunload');
  g = loadGame({session});
  assert(g.Game.running && g.Game.paused);
  for (const k of Object.keys(expected)) assert.equal(g.Game[k], expected[k]);
  assert.equal(g.Game.time, 32.5); assert.equal(g.Player.x, 420); assert.equal(g.Player.vy, 804);
  assert.match(g.Game.notice, /CHECKPOINT SAVED/);
  assert.equal(g.Player.checkpoint.kind, 'check'); assert.equal(g.Player.respawn.y, check.y + check.h + 1);
  assert.equal(g.Input.axis(), 0); assert(document.body.classList.contains('istouch'));
  const score = g.Game.score;
  g.Player.award(g.Player.quality(0.75), g.Level.blocks.find(b => b.kind === 'rock'));
  assert.equal(g.Game.score, score, 'reload cannot farm an already rewarded surface');
  g.Game.frame(1000); assert.equal(g.Game.time, 32.5, 'wall clock and tab loading do not advance the run');
  g.Game.togglePause(); g.Game.frame(1017); assert(g.Game.time > 32.5);
});

test('restored wall grip waits for a deliberate CARVE hold before simulation resumes', () => {
  const session = new Map(); let g = loadGame({session}); newRun(g);
  const wall = g.Level.blocks.find(b => b.kind === 'rock');
  g.Player.y = wall.y + 30; g.Player.startCarve({type:'wallR', block:wall});
  g.Player.carve.charge = 0.72; g.Game.time = 10; dispatchWindow('pagehide');
  g = loadGame({session});
  assert(g.Game.paused); assert.equal(g.Player.carve.charge, 0.72);
  assert.equal(g.Player.carve.block, g.Level.blocks.find(b => b.kind === 'rock'));
  g.Game.togglePause(); g.Game.frame(1000);
  assert.equal(g.Game.time, 10); assert.equal(g.Player.carve.charge, 0.72);
  assert.match(document.getElementById('coach').textContent, /Hold CARVE/);
  document.getElementById('t-carve').dispatch('pointerdown', {pointerId: 1});
  g.Game.frame(1017); assert(g.Game.time > 10); assert(g.Player.carve.charge > 0.72);
  document.getElementById('t-carve').dispatch('pointerup', {pointerId:1});
  g.Game.sim(STEP); assert.equal(g.Player.state, 'AIR'); assert(g.Game.score > 0);
});

test('pole geometry, momentum, charge and claimed pole rewards survive a reload', () => {
  const session = new Map(); let g = loadGame({session}); newRun(g);
  const pole = g.Level.poles[0];
  g.Player.x = pole.x - 17; g.Player.y = pole.y - 80;
  g.Player.startPole(pole); g.Player.pole.charge = 0.6;
  g.Game.rewarded.add(pole); const expected = {...g.Player.pole}; g.RunSave.write();
  g = loadGame({session});
  for (const k of ['r','ang','angVel','charge']) assert.equal(g.Player.pole[k], expected[k]);
  assert.equal(g.Player.pole.ref, g.Level.poles[0]); assert(g.Game.rewarded.has(g.Level.poles[0]));
  assert(g.Game.awaitingGrip && g.Game.paused);
});

test('restart requires confirmation; cancel and Escape keep the paused run intact', () => {
  const g = loadGame(); newRun(g); g.Game.score = 234; g.Game.togglePause();
  document.getElementById('restart1').onclick();
  assert(document.getElementById('restart-dialog').open); assert.equal(g.Game.score, 234);
  dispatchWindow('keydown', {key:'Escape'}); assert(g.Game.paused, 'Escape must not resume behind a modal');
  document.getElementById('restart-cancel').onclick(); assert.equal(g.Game.score, 234);
  document.getElementById('restart1').onclick(); document.getElementById('restart-confirm').onclick();
  assert.equal(g.Game.score, 0); assert(!g.Game.paused); assert(!document.getElementById('restart-dialog').open);
  assert.equal(JSON.parse(sessionStorage.getItem(key)).game.score, 0);
});

test('page hiding pauses and saves; periodic saving is throttled outside physics steps', () => {
  const g = loadGame(); newRun(g); let writes = 0;
  const original = sessionStorage.setItem;
  sessionStorage.setItem = (...args) => { writes++; original(...args); };
  for (let i=1;i<=60;i++) g.Game.frame(i * 1000/60);
  assert.equal(writes, 1);
  for (let i=0;i<120;i++) g.Game.sim(STEP);
  assert.equal(writes, 1);
  document.hidden = true; document.dispatch('visibilitychange');
  assert(g.Game.paused); assert.equal(writes, 2);
  assert.equal(JSON.parse(sessionStorage.getItem(key)).game.time, g.Game.time);
});

test('completed runs are cleared and do not reappear after a reload', () => {
  const session = new Map(); let g = loadGame({session}); newRun(g);
  g.Game.victory(); dispatchWindow('pagehide'); g = loadGame({session});
  assert(!g.Game.running); assert.equal(session.get(key), 'null');
});

test('corrupt or incompatible saves are ignored without starting or crashing the game', () => {
  const session = new Map(); const g = loadGame({session}); newRun(g);
  const valid = JSON.parse(session.get(key));
  const cases = [
    '{invalid', 'x'.repeat(20001), 'null',
    JSON.stringify({...valid, version: 999}),
    JSON.stringify({...valid, course:'old physics'}),
    JSON.stringify({...valid, player:{...valid.player, vx:'NaN'}}),
    JSON.stringify({...valid, rewarded:[9999]}),
    JSON.stringify({...valid, checkpoint:0}),
    JSON.stringify({...valid, state:'CARVE', carve:{block:999, charge:0.5, type:'wallR'}}),
    JSON.stringify({...valid, state:'POLE', pole:{ref:0, r:0, ang:0, angVel:1, charge:0.5}}),
  ];
  for (const raw of cases) {
    const restored = loadGame({session:new Map([[key,raw]])});
    assert(!restored.Game.running);
  }
});

test('unavailable session storage keeps play working and warns before a destructive reload', () => {
  const g = loadGame();
  globalThis.sessionStorage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); } };
  assert.doesNotThrow(() => g.Game.start()); assert.equal(g.RunSave.restore(), false);
  let prevented = false;
  dispatchWindow('beforeunload', {preventDefault() { prevented = true; }});
  assert(prevented); assert(g.Game.running);
  assert.doesNotThrow(() => g.Game.togglePause()); assert.doesNotThrow(() => g.Game.victory());
});

test('browser keyboard shortcuts are not treated as game controls', () => {
  const g = loadGame(); newRun(g);
  dispatchWindow('keydown', {key:'r', ctrlKey:true});
  dispatchWindow('keydown', {key:'w', metaKey:true});
  assert.equal(g.Input.jumpBuf, 0); assert.deepEqual(Object.keys(g.Input.keys), []);
});
console.log(`${passed} recovery tests passed`);
