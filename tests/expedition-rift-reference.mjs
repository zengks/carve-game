import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {loadGame, STEP} from './harness.mjs';

const output = new URL('../shared/fixtures/expedition-rifts-v1.json', import.meta.url);
const fixture = {web_commit: 'c4dffb61dd5385f5e3760b5a4e02757100450f0c', cases: {}};
for (const type of ['decline', 'pulse', 'memory', 'miss']) {
  const local = new Map(), session = new Map();
  const load = () => loadGame({production: true, coarse: true, local, session});
  let g = load();
  g.Game.start();
  g.Journey.seed = 1;
  g.Level.build();
  for (let i = 0; i < 8; i++) g.Game.sim(STEP);
  assert.equal(g.Journey.nearest.id, 'v:0');
  const samples = fixture.cases[type] = [];
  function sample(action) {
    const {Player, Game, Journey, Profile} = g;
    const rift = Journey.rift ? {...Journey.rift} : null;
    if (rift?.receipt) {
      const {from, to, success, prize, bonus} = rift.receipt;
      rift.receipt = {from, to, success, prize, bonus};
    }
    samples.push({action, player: {x: Player.x, y: Player.y, state: Player.state, onGround: Player.onGround},
      time: Game.time, paused: Game.paused, returning: Boolean(Game.returning), lives: Journey.lives,
      coins: Profile.coins, wins: Journey.wins, peak: Journey.peak, visited: [...Journey.visited], rift});
  }
  sample('ground near portal 0');
  assert(g.Journey.enterPortal()); sample('open briefing');
  assert.equal(g.Journey.visited.size, 0);
  if (type === 'decline') {
    g.Journey.leaveRift(); sample('decline');
    assert(!g.Game.paused && !g.Journey.visited.size);
    g.Game.sim(STEP); assert(g.Journey.enterPortal()); sample('reopen');
    continue;
  }
  if (type === 'memory') assert(g.Journey.pickTrial('memory'));
  g.Journey.startTrial(); sample('accept');
  assert(g.Journey.visited.has('v:0'));
  const initialLives = g.Journey.lives, initialCoins = g.Profile.coins;
  if (type === 'memory') {
    const sequence = g.Journey.rift.sequence;
    g.Journey.chooseGlyph(sequence[0]); sample('ignore glyph during reveal');
    assert.equal(g.Journey.rift.progress, 0);
    g.Journey.tickTrial(3.2);
    g.Journey.chooseGlyph(sequence[0]); sample('first glyph');
    g = load(); sample('cold restart mid-memory');
    assert(g.Game.paused && !g.Journey.rift.ready);
    g.Journey.startTrial();
    for (const glyph of sequence.slice(1)) { g.Journey.chooseGlyph(glyph); sample(`glyph ${glyph}`); }
  } else if (type === 'pulse') {
    for (let i = 0; i < 2; i++) {
      const target = g.Journey.pulseTarget();
      g.Journey.tickTrial(Math.acos(1 - 2 * target) / 2.2 - g.Journey.rift.elapsed);
      g.Journey.pulse(); sample(`seal at ${target}`);
      if (!i) {
        g = load(); sample('cold restart after first seal');
        assert(g.Game.paused && !g.Journey.rift.ready);
        g.Journey.startTrial();
      }
    }
  } else {
    g.Journey.pulse(); sample('miss at zero elapsed');
  }
  assert.equal(g.Journey.rift.phase, 'result');
  assert.equal(g.Journey.rift.win, type !== 'miss');
  assert.equal(g.Journey.lives, initialLives);
  const receipt = g.Journey.rift.receipt;
  assert.equal(g.Profile.coins - initialCoins, receipt.prize + receipt.bonus);
  assert.equal(receipt.prize, type === 'miss' ? 0 : 20);
  g = load(); sample('cold restart at receipt');
  assert(g.Game.paused && g.Journey.rift.phase === 'result');
  g.Journey.leaveRift(); sample('confirm return');
  assert(g.Game.returning);
  g.Game.tickReturn(2); sample('return transition complete');
  assert(!g.Game.returning && !g.Game.paused);
  assert.equal(g.Journey.lives, initialLives);
  assert.equal(g.Profile.coins - initialCoins, receipt.prize + receipt.bonus);
}
const bytes = JSON.stringify(fixture, null, 2) + '\n';
if (process.argv.includes('--write')) writeFileSync(output, bytes);
else assert.equal(readFileSync(output, 'utf8'), bytes);
console.log('Expedition rift reference: decline, Pendulum win/miss, Echo win and cold return verified.');
