import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {loadGame, STEP} from './harness.mjs';

const release = 'c4dffb61dd5385f5e3760b5a4e02757100450f0c';
const fixture = new URL('../shared/fixtures/expedition-reference-v1.json', import.meta.url);
const pick = (object, keys) => Object.fromEntries(keys.map(key => [key, object[key]]));
const copy = value => JSON.parse(JSON.stringify(value));
const round = value => typeof value === 'number' ? Number(value.toFixed(8)) : value;
const button = id => document.getElementById(id);

function start(seed) {
  const g = loadGame({production: true, coarse: true});
  g.Game.start();
  g.Journey.seed = seed;
  g.Level.build();
  assert.equal(g.Game.controlLabel(), 'one');
  assert.equal(g.Level.course, 8);
  return g;
}

function layout(seed, world_y, time, previousY) {
  const g = start(seed);
  g.Game.time = time;
  if (previousY !== undefined) {
    g.Level.ensure(previousY);
    g.Terrain.position(false);
  }
  g.Level.ensure(world_y);
  g.Terrain.position(false);
  return copy({seed, world_y, time, ...pick(g.Level, ['row','blocks','poles','tokens','portals','zones','landmarks'])});
}

function state(g) {
  const {Game, Input, Journey, Player, Profile, Routes, Terrain, BossEncounter, Level} = g;
  return copy({
    player: {...pick(Player, [...g.RunSave.playerFields,'state','onGround','groundCharge','respawn']),
      checkpoint: Player.checkpoint?.id ?? null,
      carve: Player.carve && {type: Player.carve.type, block: Player.carve.block.id, charge: Player.carve.charge, manual: Player.carve.manual},
      pole: Player.pole && {...pick(Player.pole, ['ang','r','angVel','charge','manual']), ref: Player.pole.ref.id}},
    input: {held: Input.manualHeld(), axis: Input.axis(), blocked: Input.blocked},
    game: {...pick(Game, [...g.RunSave.gameFields,'running','paused','awaitingGrip']),
      returning: Game.returning?.kind ?? null, rewarded: [...Game.rewarded]},
    journey: {...pick(Journey, [...g.RunSave.journeyFields,'lives','mode']),
      collected: [...Journey.collected], visited: [...Journey.visited]},
    wallet: pick(Profile, ['coins','equipped','unlocked']),
    route: Routes.snapshot(), terrain: Terrain.snapshot(), row: Level.row,
    boss_available: BossEncounter.available(),
  });
}

function trace(name, seed, setup, drive) {
  const g = start(seed);
  setup(g);
  const initial = state(g), actions = [], samples = [];
  let tick = 0, pointer = 0, held = false, delta = 0;
  const emit = (action, value) => {
    actions.push(value === undefined ? [tick, action] : [tick, action, value]);
    if (action === 'camp_open') return g.Routes.open();
    if (action === 'contract') return g.Routes.accept(value);
    if (action === 'camp_close') return g.Routes.close();
    if (action === 'pulse') return g.Journey.useSkill();
    if (action === 'return') return g.Game.tickReturn(value);
    if (action === 'down') { pointer++; held = true; delta = 0; }
    if (action === 'up') held = false;
    if (action === 'move') delta = value;
    return button('one-pad').dispatch(`pointer${action}`, {pointerId: pointer, clientX: 200 + delta});
  };
  const step = (n = 1) => { for (let i = 0; i < n; i++) { g.Game.sim(STEP); tick++; } };
  const mark = label => samples.push({tick, after_actions: actions.length, label, state: state(g)});
  drive({g, emit, step, mark, get tick() { return tick; }, get held() { return held; }, get delta() { return delta; }});
  return {name, seed, initial, actions, samples};
}

function wall(g) {
  const b = g.Level.blocks.find(b => b.id === 'b:0:3');
  Object.assign(g.Player, {x: b.x - g.Player.w - 12, y: b.y + 40, vx: 180, vy: 0, state: 'AIR', onGround: false});
  g.Game.flow = 40;
  g.Journey.cooldown = 10;
}

function atCamp(g) {
  g.Level.ensure(1450);
  const camp = g.Level.blocks.find(b => b.id === 'r:5:2');
  g.Journey.landOn(camp);
  for (let i = 0; i < 6; i++) g.Game.sim(STEP);
  assert(g.Player.onGround);
  g.Profile.credit(20);
}

function clock(hz, catchWall) {
  const g = start(1);
  if (catchWall) wall(g);
  else for (let i = 0; i < 8; i++) g.Game.sim(STEP);
  button('one-pad').dispatch('pointerdown', {pointerId: 1, clientX: 200});
  g.Game.sim(STEP);
  assert.equal(g.Player.state, catchWall ? 'CARVE' : 'GROUND');
  const initial = state(g);
  for (let frame = 1; frame <= hz / 4; frame++) g.Game.frame(frame * 1000 / hz);
  const final = state(g);
  const ticks = Math.round((final.game.time - initial.game.time) / STEP);
  assert(Math.abs(ticks - 30 * (catchWall ? g.T.TIME_DILATION : 1)) <= 1);
  return {hz, real_seconds: .25, mode: catchWall ? 'wall_grip' : 'ground_charge', initial, final, ticks};
}

const traces = [
  trace('neutral_ground_then_fresh_air_hold', 1, () => {}, ({g, emit, step, mark}) => {
    step(8);
    assert(g.Player.onGround);
    emit('down'); mark('ground_pointerdown');
    step(31); mark('neutral_ground_charge');
    emit('up'); assert(g.Player.vx > 0 && g.Player.vy > 0); mark('neutral_ground_release');
    step(4); emit('down'); step(6); mark('neutral_air_approach');
    for (let i = 0; i < 30 && !g.Player.carve; i++) step();
    assert.equal(g.Player.carve?.block.id, 'b:0:3'); mark('fresh_hold_caught_wall');
    step(42); emit('up'); mark('neutral_perfect_wall_release');
  }),
  trace('ground_launch_and_steering', 1, () => {}, ({g, emit, step, mark}) => {
    emit('down'); step(36); mark('ground_perfect');
    emit('move', -40); emit('up'); mark('release_with_left_aim');
    assert(g.Player.vx < 0 && g.Player.vy > 0);
    step(8); emit('down'); emit('move', 75); step(12); mark('air_steer_right');
    emit('up'); step(12); mark('after_lift');
  }),
  ...[27, 42, 70].map(ticks => trace(`wall_${ticks === 27 ? 'good' : ticks === 42 ? 'perfect' : 'expiry'}`, 1, wall, ({g, emit, step, mark}) => {
    emit('down'); step(); assert(g.Player.carve); mark('caught_right_wall');
    step(ticks); mark('charged_or_expired');
    if (ticks === 70) assert(!g.Player.carve && g.Input.blocked);
    else assert.equal(g.Player.quality(g.Player.carve.charge).n, ticks === 27 ? 'good' : 'perfect');
    emit('move', -75); emit('up'); mark('released'); step(12); mark('flight');
  })),
  trace('checkpoint_fall', 44, g => {
    g.Level.ensure(6300);
    const check = g.Level.blocks.find(b => b.id === 'b:24:3');
    assert(check);
    g.Player.saveCheckpoint(check);
    Object.assign(g.Player, {x: 405, y: g.Player.respawn.y - 601, vx: 0, vy: -20, state: 'AIR', onGround: false});
    g.Journey.fallAnchor = g.Player.respawn.y - 200;
    g.Game.flow = 71; g.Game.combo = 4;
  }, ({g, step, emit, mark}) => {
    step(); assert.equal(g.Journey.lives, 2); assert.equal(g.Player.y, g.Player.respawn.y); mark('recovery_started');
    emit('return', .81); step(6); assert(g.Player.onGround); mark('checkpoint_land');
    emit('down'); step(36); emit('up'); step(12); mark('fresh_jump');
  }),
  trace('camp_courier_and_pulse', 76, atCamp, ({g, emit, step, mark}) => {
    assert(emit('camp_open')); mark('camp_paused');
    assert(emit('contract', 'courier')); mark('contract_stake');
    emit('camp_close'); assert(emit('pulse')); mark('pulse_spent');
    step(30); mark('pulse_in_flight');
    assert.equal(g.Journey.cooldown, g.Journey.skills.pulse.cd);
  }),
  trace('one_thumb_ground_to_milestone', 1, () => {}, controls => {
    const {g, emit, step, mark} = controls;
    const p = g.Player;
    let lastRow = -1, nextHeight = 50;
    while (controls.tick < 7200 && g.Game.running) {
      if (!controls.held) emit('down');
      const spine = g.Level.blocks.filter(b => b.spine).sort((a,b) => a.y - b.y);
      const target = p.carve ? spine.find(b => b.y > p.carve.block.y + 5) : spine.find(b => b.row > lastRow && b.y + b.h > p.y + 20);
      const dx = target ? target.x + 75 - (p.x + p.w / 2) : 0;
      const aim = Math.abs(dx) > 10 ? Math.sign(dx) * 75 : 0;
      if (controls.delta !== aim) emit('move', aim);
      if ((p.groundCharge ?? p.carve?.charge ?? p.pole?.charge) >= .7 || g.Input.blocked) {
        if (p.carve) lastRow = p.carve.block.row;
        emit('up');
      }
      if (p.onGround && p.y < 100) lastRow = -1;
      step();
      if (g.Journey.peak >= 64 + nextHeight * 10) { mark(`first_peak_${nextHeight}m`); nextHeight += 50; }
      if (nextHeight > 300 && p.onGround && p.y >= 3064) {
        if (controls.held) emit('up');
        for (let i = 0; i < 20 && p.onGround && !g.BossEncounter.available(); i++) step();
        if (g.BossEncounter.available()) { mark('bellkeeper_available'); return; }
      }
    }
    assert.fail(`Failed to reach stationary milestone support at ${p.y}`);
  }),
];

const terrain = [layout(1,64,0), layout(44,64,0), layout(76,64,0), layout(1,1600,4.5),
  layout(44,3064,12.25), layout(76,4234,25), layout(1,10064,75), layout(44,230150,180)];
for (const {seed, world_y, time} of terrain) {
  const direct = layout(seed, world_y, time);
  assert.deepEqual(layout(seed, world_y, time, world_y + 230), direct);
  assert.deepEqual(layout(seed, world_y, time, world_y + 23000), direct);
  assert(direct.blocks.length < 100);
}

const g = start(1);
const result = {
  contract: 'expedition-reference-v1', web_commit: release, course: 8, step_hz: 120,
  units: {world: 'y-up', altitude: 'max(0, floor((y - 64) / 10))', time: 'seconds'},
  tuning: g.T, skills: g.Journey.skills, terrain, traces,
  clocks: [clock(60, false), clock(120, false), clock(60, true), clock(120, true)],
};
// Each terrain or trace item occupies one line so changes remain easy to regenerate and diff.
const encode = value => JSON.stringify(value, (_, v) => round(v));
const content = '{\n' + Object.entries(result).map(([key, value]) => `  ${JSON.stringify(key)}: ${Array.isArray(value) ? '[\n    '+value.map(encode).join(',\n    ')+'\n  ]' : encode(value)}`).join(',\n') + '\n}\n';
if (process.argv.includes('--write')) writeFileSync(fixture, content);
else assert.equal(readFileSync(fixture, 'utf8'), content, 'Expedition reference vectors drifted from the released simulation');
console.log(`Expedition reference: ${terrain.length} terrain windows and ${traces.length} input traces verified.`);
