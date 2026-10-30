// Deliberately NOT imported by the game or included in deployment output.
export const mobileRelease = Object.freeze({enabled:false, ios:null, android:null});

export function mobilePlatform({userAgent='',maxTouchPoints=0}={}) {
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)) return 'ios';
  return /Android/i.test(userAgent) ? 'android' : null;
}

export function handoffLinks(config, platform) {
  if (config?.enabled !== true || !['ios','android'].includes(platform)) return null;
  const release = config[platform];
  if (release?.published !== true || release.linksVerified !== true) return null;
  try {
    const store = new URL(release.storeUrl), open = new URL(release.openUrl);
    if ([store,open].some(u=>u.protocol !== 'https:' || u.username || u.password || u.port || u.hash)) return null;
    if (!Array.isArray(release.verifiedHosts) || !release.verifiedHosts.includes(open.hostname) || open.pathname !== '/open' || open.search) return null;
    if (platform === 'ios' ? (store.hostname !== 'apps.apple.com' || !/\/id\d+$/.test(store.pathname) || store.search) :
      (store.hostname !== 'play.google.com' || store.pathname !== '/store/apps/details' || !/^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/.test(store.searchParams.get('id') || '') || [...store.searchParams.keys()].some(k=>k !== 'id'))) return null;
    return {open:open.href,store:store.href};
  } catch { return null; }
}

// Future bootstrap may call this ONLY at the menu, after stores and verified links
// are live. It never runs automatically, probes installation, or redirects.
export function prepareMobilePrompt(config=mobileRelease, environment={}) {
  if (config?.enabled !== true || environment.atMenu !== true) return null;
  const nav = environment.navigator || globalThis.navigator;
  const platform = mobilePlatform(nav);
  const links = handoffLinks(config,platform);
  if (!links) return null;
  const storage = environment.storage || globalThis.sessionStorage;
  const key = 'carve.mobilePrompt.dismissed.v1';
  try { if (storage.getItem(key)) return null; } catch { return null; }
  const doc = environment.document || globalThis.document;
  if (!doc || typeof doc.createElement !== 'function') return null;
  let dialog;
  function dismiss() {
    try { storage.setItem(key,'1'); } catch {}
    if (dialog?.open) dialog.close();
    dialog?.remove();
    environment.onContinue?.();
  }
  return {
    platform,links,
    show() {
      if (dialog) return false;
      dialog = doc.createElement('dialog');
      if (typeof dialog.showModal !== 'function') return false;
      dialog.setAttribute('aria-labelledby','mobile-handoff-title');
      const title = doc.createElement('h2'); title.id='mobile-handoff-title'; title.textContent='Play CARVE your way';
      const copy = doc.createElement('p'); copy.textContent='Try the mobile app for touch play. You can also keep playing here in your browser.';
      const open = doc.createElement('a'); open.href=links.open; open.textContent='Open CARVE app';
      const download = doc.createElement('a'); download.href=links.store; download.textContent=platform === 'ios' ? 'Download on the App Store' : 'Get it on Google Play';
      const fallback = doc.createElement('p'); fallback.textContent='If Open app stays in your browser, use the download link or continue here.';
      const keep = doc.createElement('button'); keep.type='button'; keep.textContent='Continue in browser'; keep.autofocus=true; keep.onclick=dismiss;
      dialog.addEventListener('cancel',e=>{e.preventDefault();dismiss();});
      // Links navigate only from a deliberate tap. Returning never triggers a
      // timer-based store redirect or a second prompt during this page session.
      for (const link of [open,download]) link.addEventListener('click',()=>{try {storage.setItem(key,'1');} catch {}});
      dialog.append(title,copy,open,doc.createElement('br'),download,fallback,keep);
      doc.body.append(dialog); dialog.showModal(); keep.focus(); return true;
    },
    dismiss,
  };
}
