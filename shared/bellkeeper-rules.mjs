import {createRun, restoreRun, stepRun} from './lantern-rules.mjs';

export function createBoss(course) {
  return {...createRun(course), bell_ticks: 0};
}

export function restoreBoss(value, course) {
  const run = restoreRun(value, course);
  if (!run || !Number.isInteger(value.bell_ticks) || value.bell_ticks < 0) return null;
  if (run.tokens.some((id, index) => id !== course.tokens[index]?.id)) return null;
  if ((run.status === 'won') !== (run.tokens.length === 3)) return null;
  return {...run, bell_ticks: value.bell_ticks};
}

export function bellState(run, course) {
  const phase = Math.min(run.tokens.length, 2);
  const warning = course.bell.warning_ticks[phase];
  const cycle = warning + course.bell.sweep_ticks + course.bell.rest_ticks;
  const tick = run.bell_ticks % cycle;
  const stage = tick < warning ? 'warning' : tick < warning + course.bell.sweep_ticks ? 'swing' : 'rest';
  const travel = Math.max(0, Math.min(1, (tick - warning) / course.bell.sweep_ticks));
  return {phase, stage, x: phase % 2 ? 290 - travel * 190 : 100 + travel * 190,
    y: course.tokens[phase].position[1] + course.bell.height_above_rope, remaining: cycle - tick};
}

export function stepBoss(run, input, course) {
  if (run.status !== 'playing') return;
  // Rope collection has its own resting window. Reuse all climbing physics.
  stepRun(run, input, {...course, tokens: []});
  if (run.status === 'recovery' || run.status === 'lost') {
    run.notice = run.lives ? 'One life lost. Your secured ropes are kept.' : 'Three lives used. Your secured ropes and time are in this result.';
  }
  if (run.status !== 'playing') return;
  run.bell_ticks++;
  const bell = bellState(run, course);
  const [ropeX, ropeY] = course.tokens[bell.phase].position;
  if (bell.stage === 'swing' && Math.abs(run.x - bell.x) < course.bell.radius + course.rules.half_width &&
      Math.abs(run.y - bell.y) < course.bell.radius + course.rules.half_height) {
    run.lives--;
    run.falls++;
    run.status = run.lives ? 'recovery' : 'lost';
    [run.x, run.y] = course.start;
    run.vx = 0; run.vy = 0; run.ground = 'start'; run.grip = null; run.last_wall = null;
    run.charge = 0; run.held = false; run.require_lift = true; run.bell_ticks = 0;
    run.notice = 'The bell caught you. Your secured ropes are kept.';
  } else if (bell.stage === 'rest' && Math.hypot(run.x - ropeX, run.y - ropeY) <= course.bell.rope_radius) {
    run.tokens.push(course.tokens[bell.phase].id);
    run.bell_ticks = 0;
    run.notice = 'Rope secured · ' + run.tokens.length + '/3';
    if (run.tokens.length === 3) {
      run.status = 'won'; run.held = false; run.charge = 0;
      run.notice = 'The Bellkeeper is quiet. Golden bell earned!';
    }
  }
}
