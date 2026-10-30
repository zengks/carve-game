import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, assetName } from '../scripts/build.mjs';

const output = await mkdtemp(join(tmpdir(), 'carve-build-'));
try {
  await build(output);
  const html = await readFile(join(output, 'index.html'), 'utf8');
  const manifest = JSON.parse(await readFile(join(output, 'site.webmanifest'), 'utf8'));
  const assets = await readdir(join(output, 'assets/cache'));
  assert(assets.some(n => /^carve\.[a-f\d]{16}\.js$/.test(n)));
  assert(assets.some(n => /^carve\.[a-f\d]{16}\.css$/.test(n)));
  for (const name of assets) {
    const bytes = await readFile(join(output, 'assets/cache', name));
    const original = name.replace(/\.[a-f\d]{16}(?=\.)/, '');
    assert.equal(name, assetName(original, bytes), 'filenames match their actual contents');
  }
  const paths = [...html.matchAll(/(?:src|href)="(\/assets\/cache\/[^"?#]+)"/g)].map(m => m[1]);
  assert(paths.length >= 8);
  for (const path of [...paths, ...manifest.icons.map(i => i.src)]) await readFile(join(output, path));
  assert.notEqual(assetName('carve.js', 'old'), assetName('carve.js', 'new'), 'a release invalidates changed content');
  assert.equal(assetName('carve.js', 'old'), assetName('carve.js', 'old'), 'unchanged assets reuse the cache');
  assert(!html.includes('<style>'));
  assert(html.includes('/_vercel/insights/script.js'));
  assert(!assets.includes('carve-grip-selected.png'));
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const immutable = config.headers.filter(r => r.headers.some(h => h.value.includes('immutable')));
  assert.deepEqual(immutable.map(r => r.source), ['/assets/cache/:path*']);
  for (const path of ['/', '/site.webmanifest', '/favicon.ico']) {
    assert(config.headers.some(r => r.source === path && r.headers.some(h => h.value.includes('must-revalidate'))));
  }
  await build(join(output,'preview'),{expedition:true});
  await build(join(output,'production'),{expedition:true,production:true});
  const preview=await readFile(join(output,'preview/index.html'),'utf8');
  const production=await readFile(join(output,'production/index.html'),'utf8');
  assert(preview.includes('Endless Expedition preview</title>'));assert(preview.includes('content="noindex,nofollow"'));
  assert(production.includes('Endless Expedition</title>'));assert(production.includes('content="index,follow"'));
  assert(!production.includes('EXPERIMENTAL ·'));assert(!production.includes('mobile-handoff'));
  const gameAsset=html=>html.match(/src="(\/assets\/cache\/expedition\.[a-f\d]+\.js)"/)[1];
  assert.equal(gameAsset(preview),gameAsset(production),'release metadata does not change gameplay');
  assert.equal(await readFile(join(output,'production/classic/index.html'),'utf8'),html,'production preserves the original course');
  assert(!(await readdir(join(output,'production'),{recursive:true})).some(f=>f.includes('mobile-handoff') || f.startsWith('future/')));
  console.log('PASS production metadata, preview noindex, identical gameplay and disabled mobile handoff');
  console.log('PASS built asset references, content hashes, fresh entry points and scoped immutable caching');
} finally { await rm(output, { recursive: true, force: true }); }
