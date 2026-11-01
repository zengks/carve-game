import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
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
  assert(assets.some(n => /^expedition\.[a-f\d]{16}\.js$/.test(n)));
  assert(assets.some(n => /^expedition\.[a-f\d]{16}\.css$/.test(n)));
  for (const name of assets) {
    const bytes = await readFile(join(output, 'assets/cache', name));
    const original = name.replace(/\.[a-f\d]{16}(?=\.)/, '');
    assert.equal(name, assetName(original, bytes), 'filenames match their actual contents');
  }
  const paths = [...html.matchAll(/(?:src|href)="(\/assets\/cache\/[^"?#]+)"/g)].map(m => m[1]);
  assert(paths.some(path=>/\/carve-logo\.[a-f\d]{16}\.webp$/.test(path)), 'menu keeps the versioned logo');
  for (const path of [...paths, ...manifest.icons.map(i => i.src)]) await readFile(join(output, path));
  assert.notEqual(assetName('expedition.js', 'old'), assetName('expedition.js', 'new'), 'a release invalidates changed content');
  assert.equal(assetName('expedition.js', 'old'), assetName('expedition.js', 'old'), 'unchanged assets reuse the cache');
  assert(!html.includes('<style>'));
  const storageModule=html.match(/type="module" src="([^\"]+)"/)[1];
  assert(storageModule.startsWith('/assets/cache/storage-account.'));
  const storageCode=await readFile(join(output,storageModule),'utf8');
  for(const imported of storageCode.matchAll(/from '([^']+)'/g))await readFile(join(output,imported[1]));
  assert(!storageCode.includes('SUPABASE_PUBLISHABLE_KEY')&&!storageCode.includes('SESSION_SECRET'));
  assert(html.includes('/_vercel/insights/script.js'));
  assert(!assets.includes('carve-grip-selected.png'));
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const immutable = config.headers.filter(r => r.headers.some(h => h.value.includes('immutable')));
  assert.deepEqual(immutable.map(r => r.source), ['/assets/cache/:path*']);
  for (const path of ['/', '/site.webmanifest', '/favicon.ico']) {
    assert(config.headers.some(r => r.source === path && r.headers.some(h => h.value.includes('must-revalidate'))));
  }
  await build(join(output,'preview'),{});
  await build(join(output,'production'),{production:true});
  const preview=await readFile(join(output,'preview/index.html'),'utf8');
  const production=await readFile(join(output,'production/index.html'),'utf8');
  assert(preview.includes('Endless Expedition preview</title>'));assert(preview.includes('content="noindex,nofollow"'));
  assert(production.includes('Endless Expedition</title>'));assert(production.includes('content="index,follow"'));
  const modeLabel = html => html.match(/<div class="eyebrow">([^<]*endless expedition)<\/div>/i)?.[1].trim();
  assert.equal(modeLabel(preview), 'experimental · endless expedition');
  assert.equal(modeLabel(production), 'endless expedition', 'production displays the released mode label');
  assert(!/experimental/i.test(production), 'production has no Experimental label in any casing');
  assert(!production.includes('mobile-handoff'));
  const gameAsset=html=>html.match(/src="(\/assets\/cache\/expedition\.[a-f\d]+\.js)"/)[1];
  const previewCode=await readFile(join(output,'preview',gameAsset(preview)),'utf8'),productionCode=await readFile(join(output,'production',gameAsset(production)),'utf8');
  assert(previewCode.includes('const TESTING = true;'));assert(productionCode.includes('const TESTING = false;'));
  assert.equal(previewCode.replace('const TESTING = true;','const TESTING = false;'),productionCode,'only the compile-time testing gate differs');
  const files = await readdir(join(output,'production'),{recursive:true});
  assert(!files.some(f=>f.includes('music-demos')||f.startsWith('assets/music/')), 'music auditions never ship in production');
  const audition=await readFile(join(output,'preview/music-demos/index.html'),'utf8');
  assert.equal((audition.match(/<audio controls preload="metadata"/g)||[]).length,3);
  assert(!/autoplay/i.test(audition));assert(audition.includes('noindex,nofollow'));
  assert(!preview.includes('music-demos')&&!production.includes('music-demos'),'game has no audition integration');
  const music=JSON.parse(await readFile(new URL('../assets/music/demos/manifest.json',import.meta.url),'utf8'));
  assert.deepEqual(music.tracks.map(t=>t.slug),['skyward','ancient-gardens','neon-momentum']);
  for(const track of music.tracks){
    const recording=await readFile(join(output,'preview/assets/music/demos',track.file));
    assert.equal(recording.length,track.bytes);assert.equal(createHash('sha256').update(recording).digest('hex'),track.sha256);
    assert(track.seconds>=30&&track.seconds<=50);assert(track.integrated_lufs>-20&&track.integrated_lufs<-17);assert(track.true_peak_dbtp<0);
    assert(audition.includes(`/assets/music/demos/${track.file}`));
    const score=JSON.parse(await readFile(new URL(`../assets/music/demos/${track.score}`,import.meta.url),'utf8'));
    assert(score.notes.length>100&&score.bpm===track.bpm);assert.equal(score.slug,track.slug);
    const midi=await readFile(new URL(`../assets/music/demos/${track.midi}`,import.meta.url));assert.equal(midi.subarray(0,4).toString(),'MThd');
  }
  assert(!files.some(f=>f.startsWith('server/')||f.startsWith('shared/')||f.endsWith('.sql')),'private backend/schema never published as static assets');
  assert(!files.some(f=>f.startsWith('classic/') || /^assets\/cache\/carve\.[a-f\d]{16}\.(js|css)$/.test(f)), 'retired course and its bundles are not published');
  assert(!production.includes('/classic/') && !production.includes('original summit'));
  for (const path of ['/classic','/classic/','/classic/index.html','/src/carve.html']) assert(config.redirects.some(r=>r.source===path && r.destination==='/' && r.permanent));
  assert(!(await readdir(join(output,'production'),{recursive:true})).some(f=>f.includes('mobile-handoff') || f.startsWith('future/')));
  console.log('PASS production metadata, preview noindex, compile-time public lives gate and disabled mobile handoff');
  console.log('PASS music audition integrity and production exclusion');
  console.log('PASS built asset references, content hashes, fresh entry points and scoped immutable caching');
} finally { await rm(output, { recursive: true, force: true }); }
