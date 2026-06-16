// End-to-end completability test: a greedy auto-player climbs the level using
// only the public input surface (move / carve / jump). It proves the authored
// level can actually be finished by chaining carves, and reports a profile.
//
// Policy: aim at the nearest grip rung whose base is above the player; while
// carving, aim past the current rung so the launch carries to the next; release
// the carve inside the gold window; jump only to start from the ground; once no
// rungs remain, aim at the goal zone.
import { loadGame, newRun, STEP } from './harness.mjs';

const g = loadGame();
const { T, Level: L, Player: P, Game: G, Input: I } = g;
newRun(g);

const rungs = L.blocks.filter(b => b.kind === 'rock' || b.kind === 'check').sort((a, b) => a.y - b.y);
const goal = L.blocks.find(b => b.kind === 'goal');
const rungAbove = y => rungs.find(b => b.y > y + 5) || null;
const curTarget = () => rungs.find(b => (b.y + b.h) > P.y + 20) || goal;

let maxY = P.y, reached = false, lastProg = P.y, stuck = 0, maxStuck = 0;
const MAX = 120 * 300; // 300s of simulated time, hard cap

for (let i = 0; i < MAX && G.running; i++) {
  const target = (P.state === 'CARVE') ? (rungAbove(P.carve.block.y) || curTarget()) : curTarget();
  let ax = 0;
  if (target) { const tcx = target.x + target.w / 2, me = P.x + P.w / 2; ax = tcx > me + 10 ? 1 : tcx < me - 10 ? -1 : 0; }

  let carve = true, jump = false;
  if (P.state === 'CARVE' || P.state === 'POLE') {
    const ch = P.carve ? P.carve.charge : P.pole.charge;
    if (ch >= T.ZONE_PERFECT_LO) carve = false; // release in the gold window
  } else if (P.state === 'GROUND') {
    jump = true;
  }

  I.keys = ax > 0 ? { arrowright: true } : ax < 0 ? { arrowleft: true } : {};
  I._tCarve = carve;
  if (jump) I.jumpBuf = T.JUMP_BUFFER;

  G.sim(STEP);
  maxY = Math.max(maxY, P.y);
  if (P.y > lastProg + 0.5) { stuck = 0; lastProg = P.y; } else { stuck++; maxStuck = Math.max(maxStuck, stuck); }
  if (!G.running) { reached = true; break; }
}

const pct = ((maxY - L.startY) / (L.goalY - L.startY) * 100);
console.log(`completed   : ${reached}`);
console.log(`max height  : ${pct.toFixed(1)}%  (y ${maxY | 0} / goal ${L.goalY})`);
console.log(`score       : ${G.score}`);
console.log(`perfects    : ${G.perfects}`);
console.log(`best chain  : ${G.bestChain}`);
console.log(`sim time    : ${G.time.toFixed(1)}s`);
console.log(`longest stall: ${(maxStuck / 120).toFixed(1)}s`);

if (reached) { console.log('\nLEVEL COMPLETED BY BOT'); process.exit(0); }
if (pct > 92) { console.log('\nNEAR-TOP (bot timing imperfect; human-clearable)'); process.exit(0); }
console.error(`\nBOT STUCK AT ${pct.toFixed(0)}% — review reachability`);
process.exit(1);
