import {randomBytes, createCipheriv, createDecipheriv} from 'node:crypto';

export function cookieCodec(secret, {secure=true, now=()=>Date.now()}={}) {
  if (!/^[a-f0-9]{64}$/i.test(secret ?? '')) throw new Error('invalid_session_key');
  const key=Buffer.from(secret,'hex');
  const name=secure?'__Host-carve-session':'carve-local-session';
  function seal(value, purpose, ttl) {
    const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',key,iv);
    cipher.setAAD(Buffer.from(purpose));
    const bytes=Buffer.concat([cipher.update(JSON.stringify({value,expires:now()+ttl})),cipher.final()]);
    return Buffer.concat([iv,cipher.getAuthTag(),bytes]).toString('base64url');
  }
  function open(raw, purpose) {
    try {
      if (!raw || raw.length>6000) return null;
      const b=Buffer.from(raw,'base64url'), d=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));
      d.setAAD(Buffer.from(purpose));d.setAuthTag(b.subarray(12,28));
      const body=JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]).toString());
      return body.expires>now()?body.value:null;
    } catch { return null; }
  }
  const names={session:name,oauth:secure?'__Host-carve-oauth':'carve-local-oauth',
    callback:secure?'__Host-carve-callback':'carve-local-callback',link:secure?'__Host-carve-link':'carve-local-link'};
  return {seal,open,read(req,purpose) {
    const raw=(req.headers.cookie??'').split(';').map(s=>s.trim()).find(s=>s.startsWith(names[purpose]+'='))?.slice(names[purpose].length+1);
    return open(raw,purpose);
  },write(res,purpose,value,ttl=86400000) {
    const token=value?seal(value,purpose,ttl):'';
    if (token.length>3700) throw new Error('session_too_large');
    const cookie=`${names[purpose]}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${value?Math.floor(ttl/1000):0}${secure?'; Secure':''}`;
    const previous=res.getHeader('Set-Cookie')??[];
    res.setHeader('Set-Cookie',[...(Array.isArray(previous)?previous:[previous]),cookie]);
  }};
}
