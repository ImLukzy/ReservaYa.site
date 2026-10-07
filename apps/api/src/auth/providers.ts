import { Injectable, Logger } from '@nestjs/common';
import { createPublicKey, verify as verifySignature, timingSafeEqual } from 'node:crypto';
type GoogleKey={kid:string;kty:string;n:string;e:string};
export type GoogleProfile={sub:string;email:string;name:string;picture:string|null};
@Injectable()
export class GoogleProvider {
  private cachedKeys?:{keys:GoogleKey[];expires:number};
  private loadingKeys?:Promise<GoogleKey[]>;
  private async keys():Promise<GoogleKey[]> {
    if(this.cachedKeys && Date.now()<this.cachedKeys.expires)return this.cachedKeys.keys;
    if(this.loadingKeys)return this.loadingKeys;
    this.loadingKeys=(async()=>{
      const response=await fetch('https://www.googleapis.com/oauth2/v3/certs',{signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw new Error('Google keys unavailable');
      const jwks=await response.json() as {keys:GoogleKey[]};
      if(!Array.isArray(jwks.keys))throw new Error('Invalid Google keys');
      const control=response.headers.get('cache-control')||'';
      const maxAge=control.match(/(?:^|,)\s*max-age\s*=\s*"?(\d+)"?\s*(?:,|$)/i);
      const age=Number(response.headers.get('age')||0);
      const seconds=/\b(?:no-store|no-cache)\b/i.test(control)?0:Math.max(0,Number(maxAge?.[1]||0)-(Number.isFinite(age)?Math.max(0,age):0));
      this.cachedKeys={keys:jwks.keys,expires:Date.now()+seconds*1000};
      return jwks.keys;
    })();
    try{return await this.loadingKeys;}finally{this.loadingKeys=undefined;}
  }
  configured(){return Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET&&process.env.GOOGLE_REDIRECT_URI);}
  async exchange(code:string,state:string,cookie:string):Promise<GoogleProfile|null>{
    const a=Buffer.from(state),b=Buffer.from(cookie);if(a.length!==b.length||!timingSafeEqual(a,b))return null;
    try{
      const token=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:process.env.GOOGLE_REDIRECT_URI!,client_id:process.env.GOOGLE_CLIENT_ID!,client_secret:process.env.GOOGLE_CLIENT_SECRET!}),signal:AbortSignal.timeout(10000)});
      if(!token.ok)return null;
      const {id_token:jwt}=await token.json() as {id_token:string};
      const p=jwt.split('.');if(p.length!==3)return null;
      const head=JSON.parse(Buffer.from(p[0],'base64url').toString()),c=JSON.parse(Buffer.from(p[1],'base64url').toString());
      if(head.alg!=='RS256'||!['https://accounts.google.com','accounts.google.com'].includes(c.iss)||c.aud!==process.env.GOOGLE_CLIENT_ID||typeof c.exp!=='number'||c.exp<Date.now()/1000-10||(typeof c.nbf==='number'&&c.nbf>Date.now()/1000+10))return null;
      const jwk=(await this.keys()).find(k=>k.kid===head.kid&&k.kty==='RSA');if(!jwk)return null;
      if(!verifySignature('RSA-SHA256',Buffer.from(`${p[0]}.${p[1]}`),createPublicKey({key:jwk,format:'jwk'}),Buffer.from(p[2],'base64url')))return null;
      if(![true,'true','True'].includes(c.email_verified)||typeof c.sub!=='string'||!c.sub||typeof c.email!=='string'||!c.email)return null;
      return {sub:c.sub,email:c.email,name:typeof c.name==='string'?c.name:'',picture:typeof c.picture==='string'?c.picture:null};
    }catch{return null;}
  }
}
// WebUtility.HtmlEncode escapes Latin-1 characters as numeric references as well.
export const htmlEncode=(value:string)=>value.replace(/[&<>"'\u00a0-\u00ff\uD800-\uDFFF\u{10000}-\u{10ffff}]/gu,c=>({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]||(c.length===1&&c.charCodeAt(0)>=0xd800&&c.charCodeAt(0)<=0xdfff?'\uFFFD':`&#${c.codePointAt(0)};`)));
export function passwordResetEmail(message:ResetMail) {
  const {nombre,email,link}=message;
  return {
    to:email,subject:'Restablece tu contraseña de ReservaYa',
    text:`Hola ${nombre},\n\nRecibimos una solicitud para restablecer la contraseña de tu cuenta de ReservaYa.\nCrea una nueva aquí (el enlace vence en 30 minutos y sirve una sola vez):\n${link}\n\nSi no fuiste tú, ignora este correo: tu contraseña no cambia.`,
    html:'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#101613">'+
      `<p>Hola ${htmlEncode(nombre)},</p>`+
      '<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de ReservaYa.</p>'+
      `<p><a href="${htmlEncode(link)}" style="display:inline-block;background:#22C55E;color:#060C08;font-weight:bold;padding:12px 20px;border-radius:10px;text-decoration:none">Crear nueva contraseña</a></p>`+
      '<p style="font-size:13px;color:#5B6660">El enlace vence en 30 minutos y sirve una sola vez. Si no fuiste tú, ignora este correo: tu contraseña no cambia.</p></div>'
  };
}
export type ResetMail={nombre:string;email:string;link:string};
export type EmailMessage={to:string;subject:string;text:string;html:string};
const validResetUrl=()=>{try{return ['http:','https:'].includes(new URL(process.env.PASSWORD_RESET_URL?.trim()||'').protocol);}catch{return false;}};
@Injectable()
export class MailProvider {
  private pending=0;
  private readonly logger=new Logger(MailProvider.name);
  enqueue(message:ResetMail){return this.background(()=>this.send(message),'No se pudo enviar el email de recuperación');}
  // Legacy EmailQueue: bounded to 500, drops when full; delivery failures only log.
  queue(message:EmailMessage){return this.background(()=>this.deliver(message),`No se pudo enviar el email «${message.subject}»`);}
  private background(job:()=>Promise<void>,error:string){
    if(this.pending>=500)return false;
    this.pending++;
    queueMicrotask(()=>{void job().catch(()=>{this.logger.error(error);}).finally(()=>{this.pending--;});});
    return true;
  }
  // Mirrors the legacy registration: Resend only with a valid PASSWORD_RESET_URL.
  configured(){const provider=(process.env.EMAIL_PROVIDER||'').trim().toLowerCase();return validResetUrl()&&provider==='resend'&&Boolean(process.env.RESEND_API_KEY?.trim()&&process.env.EMAIL_FROM?.trim());}
  async send(message:ResetMail):Promise<void>{await this.deliver(passwordResetEmail(message));}
  async deliver(email:EmailMessage):Promise<void>{
    const provider=(process.env.EMAIL_PROVIDER||'').trim().toLowerCase();
    if(this.configured()){
      const response=await fetch('https://api.resend.com/emails',{
        method:'POST',headers:{authorization:`Bearer ${process.env.RESEND_API_KEY}`,'content-type':'application/json'},
        body:JSON.stringify({from:process.env.EMAIL_FROM,to:[email.to],subject:email.subject,text:email.text,html:email.html}),
        signal:AbortSignal.timeout(10000)
      });
      if(!response.ok)throw new Error(`Resend respondió ${response.status}`);
      return;
    }
    if(validResetUrl() && provider==='log' && (process.env.NODE_ENV==='development'||process.env.ASPNETCORE_ENVIRONMENT==='Development')){
      this.logger.log(`[EMAIL_PROVIDER=log] Para: ${email.to} · ${email.subject}\n${email.text}`);
      return;
    }
    this.logger.error('Email no enviado: no hay proveedor configurado (EMAIL_PROVIDER, RESEND_API_KEY, EMAIL_FROM, PASSWORD_RESET_URL)');
  }
}
