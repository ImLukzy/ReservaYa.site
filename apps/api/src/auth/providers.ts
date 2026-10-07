import { Injectable } from '@nestjs/common';
import { createPublicKey, verify as verifySignature, timingSafeEqual } from 'node:crypto';
export type GoogleProfile={sub:string;email:string;name:string;picture:string|null};
@Injectable()
export class GoogleProvider {
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
      const response=await fetch('https://www.googleapis.com/oauth2/v3/certs',{signal:AbortSignal.timeout(10000)});if(!response.ok)return null;
      const jwks=await response.json() as {keys:Array<{kid:string;kty:string;n:string;e:string}>};
      const jwk=jwks.keys.find(k=>k.kid===head.kid&&k.kty==='RSA');if(!jwk)return null;
      if(!verifySignature('RSA-SHA256',Buffer.from(`${p[0]}.${p[1]}`),createPublicKey({key:jwk,format:'jwk'}),Buffer.from(p[2],'base64url')))return null;
      if(![true,'true','True'].includes(c.email_verified)||typeof c.sub!=='string'||!c.sub||typeof c.email!=='string'||!c.email)return null;
      return {sub:c.sub,email:c.email,name:typeof c.name==='string'?c.name:'',picture:typeof c.picture==='string'?c.picture:null};
    }catch{return null;}
  }
}
export type ResetMail={nombre:string;email:string;link:string};
@Injectable()
export class MailProvider {
  private pending=0;
  enqueue(message:ResetMail){
    if(this.pending>=500)return false;
    this.pending++;
    queueMicrotask(()=>{void this.send(message).catch(()=>undefined).finally(()=>{this.pending--;});});
    return true;
  }
  // DI seam for a captured provider in QA. F3 never sends real email.
  async send(_message:ResetMail):Promise<void>{void _message;}
}
