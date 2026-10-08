import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
export const newId = () => randomUUID().replace(/-/g, '');
const secret = () => { const value = process.env.JWT_SECRET; if (!value || value.length < 32) throw new Error('JWT_SECRET no configurado'); return Buffer.from(value); };
const key = (purpose?: string) => purpose ? createHmac('sha256',secret()).update(purpose).digest() : secret();
const equal = (a: Buffer,b: Buffer) => a.length === b.length && timingSafeEqual(a,b);
type Claims = Record<string, unknown>;
export function sign(claims: Claims, ttl: number, purpose?: string) {
  const now=Math.floor(Date.now()/1000), head=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
  const body=Buffer.from(JSON.stringify({...claims,nbf:now,exp:now+ttl})).toString('base64url');
  return `${head}.${body}.${createHmac('sha256',key(purpose)).update(`${head}.${body}`).digest('base64url')}`;
}
export function verify(token: string, purpose?: string): Claims | null {
  try {
    const p=token.split('.'); if(p.length!==3||p.some(s=>! /^[A-Za-z0-9_-]+$/.test(s)))return null;
    if(JSON.parse(Buffer.from(p[0],'base64url').toString()).alg!=='HS256')return null;
    if(!equal(Buffer.from(p[2],'base64url'),createHmac('sha256',key(purpose)).update(`${p[0]}.${p[1]}`).digest()))return null;
    const c=JSON.parse(Buffer.from(p[1],'base64url').toString()), now=Date.now()/1000;
    if(typeof c.exp!=='number'||c.exp<now-10||(typeof c.nbf==='number'&&c.nbf>now+10))return null;
    if(purpose==='google-pendiente'&&(c.aud!=='google-pendiente'||!c.sub||!c.email))return null;
    return c;
  }catch{return null;}
}
export const fingerprint=(hash:string)=>createHash('sha256').update(hash).digest('hex').slice(0,16).toUpperCase();
export function resetToken(id:string,tv:number,hash:string){
  const bytes=Buffer.from(JSON.stringify({sub:id,tv,ph:fingerprint(hash),exp:Math.floor(Date.now()/1000)+1800}));
  return `${bytes.toString('base64url')}.${createHmac('sha256',key('reservaya:password-reset:v1')).update(bytes).digest('base64url')}`;
}
export function readReset(token:string): {sub:string;tv:number;ph:string} | null {
  if(!token||token.length>512)return null;
  try {
    const p=token.split('.');if(p.length!==2||p.some(s=>! /^[A-Za-z0-9_-]+$/.test(s)))return null;
    const bytes=Buffer.from(p[0],'base64url');
    if(!equal(Buffer.from(p[1],'base64url'),createHmac('sha256',key('reservaya:password-reset:v1')).update(bytes).digest()))return null;
    const c=JSON.parse(bytes.toString());
    if(typeof c.sub!=='string'||!c.sub||typeof c.ph!=='string'||!c.ph||!Number.isInteger(c.tv)||!Number.isInteger(c.exp)||Math.floor(Date.now()/1000)>=c.exp)return null;
    return c;
  }catch{return null;}
}
export const sameFingerprint=(hash:string,value:string)=>equal(Buffer.from(fingerprint(hash),'ascii'),Buffer.from(value,'ascii'));
