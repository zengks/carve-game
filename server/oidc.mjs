import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {createRemoteJWKSet,jwtVerify,SignJWT,importPKCS8} from 'jose';

const definitions={
  google:{issuer:'https://accounts.google.com',issuers:['https://accounts.google.com','accounts.google.com'],
    authorize:'https://accounts.google.com/o/oauth2/v2/auth',token:'https://oauth2.googleapis.com/token',jwks:'https://www.googleapis.com/oauth2/v3/certs'},
  apple:{issuer:'https://appleid.apple.com',issuers:['https://appleid.apple.com'],
    authorize:'https://appleid.apple.com/auth/authorize',token:'https://appleid.apple.com/auth/token',jwks:'https://appleid.apple.com/auth/keys'},
};
export const randomSecret=()=>randomBytes(32).toString('base64url');
export const digest=value=>createHash('sha256').update(value).digest('hex');
export function equal(a,b){return typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
const fail=()=>{throw new Error('provider_proof_rejected');};

// Fixed issuer/key URLs: never fetch a URL or accept a key from a token/client.
export function createOidc(env,{keyResolvers={},transport=fetch,now=()=>Date.now()}={}) {
  const configs={
    google:{...definitions.google,client:env.CARVE_GOOGLE_CLIENT_ID,secret:env.CARVE_GOOGLE_CLIENT_SECRET},
    apple:{...definitions.apple,client:env.CARVE_APPLE_SERVICE_ID,team:env.CARVE_APPLE_TEAM_ID,
      keyId:env.CARVE_APPLE_KEY_ID,privateKey:env.CARVE_APPLE_PRIVATE_KEY},
  };
  const resolvers={};
  const ready=provider=>provider==='google'?!!(configs.google.client&&configs.google.secret):
    provider==='apple'?!!(configs.apple.client&&configs.apple.team&&configs.apple.keyId&&configs.apple.privateKey):false;
  const config=provider=>{if(!ready(provider))throw new Error('provider_not_ready');return configs[provider];};
  async function verify(provider,token,nonce) {
    const c=config(provider);
    if(typeof token!=='string'||token.length>16000||typeof nonce!=='string')fail();
    const key=keyResolvers[provider]??(resolvers[provider]??=createRemoteJWKSet(new URL(c.jwks),{timeoutDuration:5000}));
    const {payload:p}=await jwtVerify(token,key,{algorithms:['RS256'],issuer:c.issuers,audience:c.client,
      requiredClaims:['sub','iss','aud','exp','iat','nonce'],clockTolerance:30,currentDate:new Date(now())});
    // One exact audience per stored flow. Native audiences need their own flow;
    // do not union web/iOS/Android clients or accept ambiguous audience arrays.
    if(p.aud!==c.client || (p.azp!==undefined&&p.azp!==c.client) ||
      typeof p.sub!=='string'||!/^[\x21-\x7e]{1,255}$/.test(p.sub)||
      !Number.isFinite(p.iat)||p.iat>now()/1000+30||p.iat<now()/1000-3600||!equal(p.nonce,nonce))fail();
    const providerName=provider==='apple'?'Apple':'Google';
    // Email is a display hint only, never an identity key or linking criterion.
    const verifiedEmail=(p.email_verified===true||p.email_verified==='true')&&typeof p.email==='string'&&p.email.length<255&&p.email.includes('@');
    const label=verifiedEmail?providerName+' · '+p.email.slice(0,2)+'…'+p.email.slice(p.email.lastIndexOf('@')):providerName+' account';
    return {issuer:c.issuer,subject:p.sub,label,provider,authenticated_at:p.iat*1000};
  }
  return {ready,verify,
    begin(provider,origin,{redirect:customRedirect}={}) {
      const c=config(provider),nonce=randomSecret(),verifier=randomSecret();
      const url=new URL(c.authorize),state=randomSecret();
      const redirect=customRedirect??origin+'/api/account?provider_return='+provider;
      url.search=new URLSearchParams({client_id:c.client,redirect_uri:redirect,response_type:'code',
        scope:provider==='google'?'openid email':'email',state,nonce,
        ...(provider==='apple'?{response_mode:'form_post'}:{code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'})}).toString();
      return {url:url.href,flow:{id:state,provider,client_id:c.client,nonce,verifier,redirect}};
    },
    async exchange(flow,code) {
      const c=config(flow.provider);
      if(flow.client_id!==c.client)fail();
      if(typeof code!=='string'||!code.length||code.length>2048)fail();
      let secret=c.secret;
      if(flow.provider==='apple') {
        secret=await new SignJWT({}).setProtectedHeader({alg:'ES256',kid:c.keyId}).setIssuer(c.team)
          .setSubject(c.client).setAudience(c.issuer).setIssuedAt(Math.floor(now()/1000))
          .setExpirationTime(Math.floor(now()/1000)+300).sign(await importPKCS8(c.privateKey.replaceAll('\\n','\n'),'ES256'));
      }
      const reply=await transport(c.token,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({grant_type:'authorization_code',client_id:c.client,client_secret:secret,
          code,redirect_uri:flow.redirect,...(flow.provider==='google'?{code_verifier:flow.verifier}:{})}),signal:AbortSignal.timeout(8000)});
      if(!reply.ok)fail();const data=await reply.json();
      return verify(flow.provider,data.id_token,flow.nonce);
    },
  };
}
