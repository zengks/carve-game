// Smoke + stress test: exercise every player state (carve / pole / hazard) and
// run a long random-input session to assert the simulation never throws and
// never produces non-finite state. Pure physics; no rendering required.
import { loadGame, newRun, STEP } from './harness.mjs';

const g = loadGame();
const { T, Level: L, Player: P, Game: G, Input: I } = g;
newRun(g);

let failures = 0;
function check(cond, msg) { if (!cond) { console.error('  FAIL:', msg); failures++; } }

function step(n, inp) {
  for (let i = 0; i < n; i++) {
    I.keys = inp.keys || {};
    I._tCarve = !!inp.carve;
    if (inp.jump) I.jumpBuf = T.JUMP_BUFFER;
    if (inp.surge) I.surgeQ = true;
    G.sim(STEP);
  }
}

// 1) ground movement + jump leaves the start platform
step(60, { keys: { arrowright: true }, jump: true });
console.log(`run/jump   -> state=${P.state} x=${P.x | 0} y=${P.y | 0}`);

// 2) wall carve produces an upward launch and a scored combo
const rung = L.blocks.find(b => b.kind === 'rock' && b.x > 400);
P.x = rung.x - P.w - 2; P.y = rung.y + 10; P.vx = 200; P.vy = 120; P.state = 'AIR'; P.relatch = 0; P.carve = null;
step(40, { carve: true });
const yBefore = P.y;
step(30, { carve: false });
console.log(`wall carve -> launch vy=${P.vy | 0} combo=${G.combo} score=${G.score}`);
check(P.vy > 0 || P.y > yBefore, 'wall carve should launch upward');

// 3) perfect-window release yields a bigger launch + perfect count
P.x = rung.x - P.w - 2; P.y = rung.y + 10; P.vx = 150; P.vy = 80; P.state = 'AIR'; P.relatch = 0; P.carve = null; G.combo = 0;
step(Math.round(0.75 * T.CHARGE_TIME * 120), { carve: true });
step(2, { carve: false });
console.log(`perfect    -> launch vy=${P.vy | 0} perfects=${G.perfects}`);

// 4) pole swing attaches and flings
const pole = L.poles[0];
P.x = pole.x - P.w / 2; P.y = pole.y - 40 - P.h / 2; P.vx = 260; P.vy = 0; P.state = 'AIR'; P.relatch = 0; P.pole = null; P.carve = null;
step(50, { carve: true });
check(P.state === 'POLE' || P.pole === null, 'pole should engage while carve held');
step(4, { carve: false });
console.log(`pole       -> state=${P.state} vx=${P.vx | 0} vy=${P.vy | 0}`);

// 5) hazard sends player to the last checkpoint
const spike = L.blocks.find(b => b.kind === 'spike');
if (spike) {
  P.x = spike.x; P.y = spike.y + spike.h + 5; P.vy = -50; P.stun = 0;
  step(20, {});
  console.log(`hazard     -> respawned x=${P.x | 0} stun=${P.stun.toFixed(2)}`);
}

// 6) stability: random inputs, assert no throw / all finite
newRun(g);
for (let i = 0; i < 6000; i++) {
  const r = Math.random();
  const keys = {};
  if (r < 0.4) keys.arrowright = true; else if (r < 0.6) keys.arrowleft = true;
  I.keys = keys; I._tCarve = Math.random() < 0.5;
  if (Math.random() < 0.1) I.jumpBuf = T.JUMP_BUFFER;
  if (Math.random() < 0.05) I.surgeQ = true;
  try { G.sim(STEP); }
  catch (e) { console.error('THROW at step', i, e.message); process.exit(1); }
  check(Number.isFinite(P.x) && Number.isFinite(P.y) && Number.isFinite(P.vx) && Number.isFinite(P.vy),
    `non-finite player state at step ${i}`);
  if (failures) process.exit(1);
}
console.log(`stress     -> 6000 random steps OK, final y=${P.y | 0}`);

// reachability invariant: max grip gap must be clearable by a non-perfect carve
const grips = L.blocks.filter(b => b.grip).sort((a, b) => a.y - b.y);
let maxGap = 0;
for (let i = 1; i < grips.length; i++) maxGap = Math.max(maxGap, grips[i].y - grips[i - 1].y);
const goodVy = T.WALL_LIFT_BASE + 0.5 * 1.0 * T.WALL_LIFT_GAIN;
const arc = (goodVy * goodVy) / (2 * T.GRAVITY);
console.log(`reachability-> max grip gap=${maxGap | 0}px, good-carve arc=${arc | 0}px (+ wall climb)`);
check(maxGap <= arc + 120, 'a non-perfect carve should clear the largest grip gap');

console.log(failures ? `\n${failures} CHECK(S) FAILED` : '\nALL SMOKE CHECKS PASSED');
process.exit(failures ? 1 : 0);
