import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateKeyPairSync, sign } from 'node:crypto';
import { GoogleProvider, MailProvider, passwordResetEmail } from './providers';
const fixture={nombre:`José <&"'> Œ 😀`,email:'fixture@example.test',link:'https://example.test/restablecer?x=1&y="dos"#t=ficticio'};
const golden=JSON.parse(readFileSync(resolve(__dirname,'../../../../tests/fixtures/password-reset-email.json'),'utf8'));
beforeEach(()=>{
  vi.stubEnv('EMAIL_PROVIDER','resend');vi.stubEnv('RESEND_API_KEY','fixture-only-key');vi.stubEnv('EMAIL_FROM','ReservaYa <fixture@example.test>');
  vi.stubEnv('PASSWORD_RESET_URL','https://example.test/restablecer');vi.stubEnv('NODE_ENV','production');vi.stubEnv('ASPNETCORE_ENVIRONMENT','Production');
  vi.spyOn(Logger.prototype,'error').mockImplementation(()=>undefined);vi.spyOn(Logger.prototype,'log').mockImplementation(()=>undefined);
  vi.stubGlobal('fetch',vi.fn(()=>{throw new Error('Unmocked network forbidden');}));
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('Password reset mail provider without network',()=>{
  it('matches the complete .NET template, including HTML escaping and Unicode',()=>{
    expect(passwordResetEmail(fixture)).toEqual(golden);
  });
  it('posts the legacy payload with configured sender and authorization to the fake Resend transport',async()=>{
    const fake=vi.fn().mockResolvedValue(new Response('{"id":"fixture-id"}',{status:200}));vi.stubGlobal('fetch',fake);
    await new MailProvider().send(fixture);
    expect(fake).toHaveBeenCalledTimes(1);
    const [url,options]=fake.mock.calls[0];expect(url).toBe('https://api.resend.com/emails');
    expect(options.method).toBe('POST');expect(options.headers).toEqual({authorization:'Bearer fixture-only-key','content-type':'application/json'});
    expect(JSON.parse(options.body)).toEqual({from:'ReservaYa <fixture@example.test>',to:[golden.to],subject:golden.subject,text:golden.text,html:golden.html});
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
  it.each([['EMAIL_PROVIDER','disabled'],['EMAIL_PROVIDER','log'],['RESEND_API_KEY',' '],['EMAIL_FROM',''],['PASSWORD_RESET_URL','file:///tmp/reset']])('disables sending when %s=%s in production',async(name,value)=>{
    vi.stubEnv(name,value);await new MailProvider().send(fixture);expect(fetch).not.toHaveBeenCalled();
    const output=vi.mocked(Logger.prototype.error).mock.calls.flat().join(' ');
    expect(output).not.toContain(fixture.link);expect(output).not.toContain(fixture.email);
  });
  it('supports log only in development without using transport',async()=>{
    vi.stubEnv('EMAIL_PROVIDER','log');vi.stubEnv('NODE_ENV','development');
    await new MailProvider().send(fixture);expect(fetch).not.toHaveBeenCalled();expect(Logger.prototype.log).toHaveBeenCalledWith(`[EMAIL_PROVIDER=log] Para: ${golden.to} · ${golden.subject}\n${golden.text}`);
  });
  it('reports provider failure without copying its body or credentials',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('sensitive-provider-body',{status:403})));
    await expect(new MailProvider().send(fixture)).rejects.toThrow('Resend respondió 403');
    const sender=new MailProvider();expect(sender.enqueue(fixture)).toBe(true);
    await new Promise(resolve=>setTimeout(resolve,0));
    expect(Logger.prototype.error).toHaveBeenCalledWith('No se pudo enviar el email de recuperación');
  });
});
const rsa=generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...rsa.publicKey.export({format:'jwk'}),kid:'fixture-key',kty:'RSA'};
function jwt(now:number){
  const head=Buffer.from(JSON.stringify({alg:'RS256',kid:'fixture-key'})).toString('base64url');
  const body=Buffer.from(JSON.stringify({iss:'https://accounts.google.com',aud:'fixture-client',exp:Math.floor(now/1000)+3600,sub:'fixture-sub',email:'fixture@example.test',email_verified:true,name:'Fixture'})).toString('base64url');
  return `${head}.${body}.${sign('RSA-SHA256',Buffer.from(`${head}.${body}`),rsa.privateKey).toString('base64url')}`;
}
describe('Google public key cache without network',()=>{
  let now:number,certs:number,control:string,age:string;
  beforeEach(()=>{
    now=Date.now();certs=0;control='public, max-age=60';age='0';vi.spyOn(Date,'now').mockImplementation(()=>now);
    vi.stubEnv('GOOGLE_CLIENT_ID','fixture-client');vi.stubEnv('GOOGLE_CLIENT_SECRET','fixture-secret');vi.stubEnv('GOOGLE_REDIRECT_URI','https://example.test/callback');
    vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
      if(url==='https://oauth2.googleapis.com/token')return new Response(JSON.stringify({id_token:jwt(now)}));
      if(url==='https://www.googleapis.com/oauth2/v3/certs'){certs++;return new Response(JSON.stringify({keys:[jwk]}),{headers:{'cache-control':control,age}});}
      throw new Error('Unmocked network forbidden');
    }));
  });
  it('reuses keys within max-age and fetches again exactly at expiration',async()=>{
    const provider=new GoogleProvider();expect((await provider.exchange('code','state','state'))?.sub).toBe('fixture-sub');
    now+=59999;expect(await provider.exchange('code','state','state')).not.toBeNull();expect(certs).toBe(1);
    now++;expect(await provider.exchange('code','state','state')).not.toBeNull();expect(certs).toBe(2);
  });
  it('deducts Age from the remaining cache lifetime',async()=>{
    age='50';const provider=new GoogleProvider();await provider.exchange('code','state','state');now+=10000;await provider.exchange('code','state','state');expect(certs).toBe(2);
  });
  it.each(['no-store, max-age=60','no-cache, max-age=60',''])('does not retain keys for %s',async(value)=>{
    control=value;const provider=new GoogleProvider();await provider.exchange('code','state','state');await provider.exchange('code','state','state');expect(certs).toBe(2);
  });
  it('shares a pending key request across simultaneous callbacks',async()=>{
    const provider=new GoogleProvider();const values=await Promise.all([provider.exchange('a','state','state'),provider.exchange('b','state','state')]);
    expect(values.every(p=>p?.sub==='fixture-sub')).toBe(true);expect(certs).toBe(1);
  });
  it('does not reuse expired keys when refresh fails and retries on the next callback',async()=>{
    const provider=new GoogleProvider();await provider.exchange('code','state','state');now+=60000;
    const transport=vi.mocked(fetch).getMockImplementation()!;
    vi.stubGlobal('fetch',vi.fn(async(input:Parameters<typeof fetch>[0],options?:RequestInit)=>String(input).includes('/certs')?new Response('',{status:503}):transport(input,options)));
    expect(await provider.exchange('code','state','state')).toBeNull();
    vi.stubGlobal('fetch',vi.fn(transport));expect(await provider.exchange('code','state','state')).not.toBeNull();expect(certs).toBe(2);
  });
  it('rejects a mismatched state before any provider request',async()=>{
    expect(await new GoogleProvider().exchange('code','state','other')).toBeNull();expect(fetch).not.toHaveBeenCalled();
  });
});

describe('Complaint mail uses the shared transport without password reset configuration',()=>{
  const email={to:'consumer@example.test',subject:'Constancia',text:'private content',html:'<pre>private content</pre>'};
  it('delivers without reset URL while password reset remains disabled',async()=>{
    vi.stubEnv('PASSWORD_RESET_URL','');const fake=vi.fn().mockResolvedValue(new Response('{}'));vi.stubGlobal('fetch',fake);
    const provider=new MailProvider();expect(provider.configured()).toBe(false);
    expect(provider.queueReclamo(email,'2026-000001')).toBe(true);
    await new Promise(resolve=>setTimeout(resolve,0));expect(fake).toHaveBeenCalledTimes(1);
    await provider.send(fixture);expect(fake).toHaveBeenCalledTimes(1);
  });
  it.each(['timeout','http'])('logs %s without complaint content or recipient',async(kind)=>{
    const fake=kind==='timeout'?vi.fn().mockRejectedValue(Error('private content')):vi.fn().mockResolvedValue(new Response('private content',{status:503}));vi.stubGlobal('fetch',fake);
    expect(new MailProvider().queueReclamo(email,'2026-000002')).toBe(true);
    await new Promise(resolve=>setTimeout(resolve,0));
    const logs=vi.mocked(Logger.prototype.error).mock.calls.flat().join(' ');
    expect(logs).toContain('2026-000002');expect(logs).not.toContain(email.to);expect(logs).not.toContain(email.text);
  });
  it('never logs complaint contents through development log transport and bounds the queue',async()=>{
    vi.stubEnv('EMAIL_PROVIDER','log');vi.stubEnv('NODE_ENV','development');
    const provider=new MailProvider();for(let n=0;n<500;n++)expect(provider.queueReclamo(email,'2026-000003')).toBe(true);
    expect(provider.queueReclamo(email,'2026-000003')).toBe(false);
    await new Promise(resolve=>setTimeout(resolve,0));expect(fetch).not.toHaveBeenCalled();expect(Logger.prototype.log).not.toHaveBeenCalled();
  });
});
