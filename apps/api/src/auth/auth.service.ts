import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@reservaya/db';
import bcrypt from 'bcryptjs';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { DbService } from '../public/db.service';
import { fail, parseDay, day, utc } from '../public/format';
import { RateLimiter } from './rate';
import { ip } from '../traffic/traffic';
import { GoogleProvider, MailProvider } from './providers';
import { sign, verify, newId, resetToken, readReset, sameFingerprint } from './crypto';
type User=Prisma.UsuarioGetPayload<object>;
export type Body=Record<string,string|undefined>;
const dummy='$2b$10$Qbvnz2V7d7r63v/L9yyl6uJW2VFsqnai64.tYwftiPeOwaWYOUTuu';
const escapeUri=(v:string)=>encodeURIComponent(v).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
const invalid='Enlace inválido o vencido';
const summary=(u:User)=>({id:u.id,nombre:u.nombre,email:u.email,rol:u.rol});

const cookieOptions=(r:FastifyRequest)=>({httpOnly:true,secure:r.protocol==='https'||process.env.COOKIE_SECURE==='true',sameSite:process.env.COOKIE_SECURE==='true'?'none' as const:'lax' as const,path:'/'});
const plainDate=(d:Date|null)=>d?utc(d).replace(/Z$/,''):null;
const birthday=(value?:string)=>{
  const d=parseDay(value);if(!d)fail(400,'La fecha de nacimiento es obligatoria');
  const today=new Date(new Date().toISOString().slice(0,10)+'T00:00:00Z'), cutoff=new Date(today);const month=cutoff.getUTCMonth();cutoff.setUTCFullYear(cutoff.getUTCFullYear()-14);if(cutoff.getUTCMonth()!==month)cutoff.setUTCDate(0);
  if(d!<new Date('1900-01-01Z')||d!>today)fail(400,'Fecha de nacimiento inválida');
  if(d!>cutoff)fail(400,'Debes tener al menos 14 años para crear una cuenta.');return d!;
};
const username=(v?:string)=>{const result=(v||'').trim().toLowerCase();if(!/^[a-z0-9_.-]{3,20}$/.test(result))fail(400,'Tu usuario: 3-20 caracteres (letras, números, _ . -)');return result;};
@Injectable()
export class AuthService {
  constructor(@Inject(DbService)private readonly store:DbService,@Inject(RateLimiter)private readonly rate:RateLimiter,@Inject(GoogleProvider)private readonly googleProvider:GoogleProvider,@Inject(MailProvider)private readonly mail:MailProvider){}
  private get db(){return this.store.db;}
  private set(u:User,r:FastifyRequest,res:FastifyReply){res.setCookie('token',sign({id:u.id,email:u.email,nombre:u.nombre,rol:u.rol,tv:u.tokenVersion},604800),{...cookieOptions(r),maxAge:604800});}
  private clear(r:FastifyRequest,res:FastifyReply){res.setCookie('token','',{...cookieOptions(r),expires:new Date(0)});}
  private limit(key:string,n:number,ms:number,message:string){if(this.rate.limited(key,n,ms))fail(429,message);}
  async session(r:FastifyRequest){
    const token=r.cookies?.token||r.headers.authorization?.replace(/^Bearer\s+/i,'')||'',c=verify(token);
    if(!c)fail(401,'No autenticado');
    const tv=typeof c!.tv==='string'&&/^[+-]?\d+$/.test(c!.tv)?Number(c!.tv):c!.tv;
    if(typeof c!.id!=='string'||!c!.id||!Number.isInteger(tv))fail(403,'Sin permisos');
    const u=await this.db.usuario.findUnique({where:{id:c!.id as string}});
    if(!u||!u.activo||u.tokenVersion!==tv)fail(403,'Sin permisos');return u!;
  }
  async login(b:Body,r:FastifyRequest,res:FastifyReply){
    if(!b.email?.trim()||!b.password?.trim())fail(400,'Email y contraseña requeridos');
    const email=b.email!.trim().toLowerCase(), key=`login:${ip(r)}:${email}`;
    this.limit(key,5,900000,'No se pudo iniciar sesión. Verifica tus datos e inténtalo nuevamente.');
    const u=await this.db.usuario.findUnique({where:{email}});let valid=false;
    try{valid=await bcrypt.compare(b.password!,u?.password||dummy);}catch{valid=false;}
    if(!u||!valid||!u.activo)fail(401,'Credenciales inválidas');
    this.rate.reset(key);this.set(u!,r,res);return {ok:true,usuario:summary(u!)};
  }
  async register(b:Body,r:FastifyRequest,res:FastifyReply){
    if(!b.nombre?.trim()||!b.email?.trim()||!b.password?.trim())fail(400,'Todos los campos son requeridos');
    if(b.password!.length<6)fail(400,'La contraseña debe tener al menos 6 caracteres');
    const fechaNacimiento=birthday(b.fechaNacimiento),name=username(b.username),email=b.email!.trim().toLowerCase();
    this.limit(`register:${ip(r)}:${email}`,5,3600000,'Demasiados intentos. Intenta de nuevo más tarde');
    if(await this.db.usuario.findFirst({where:{OR:[{email},{username:name}]}}))fail(409,'El email o usuario ya está registrado');
    let u:User;
    try{u=await this.db.usuario.create({data:{id:newId(),nombre:b.nombre!.trim(),email,password:await bcrypt.hash(b.password!,10),fechaNacimiento,username:name,usernameCambiadoEn:new Date(),rol:'USUARIO',activo:true,tokenVersion:0,creadoEn:new Date()}});}catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==='P2002')fail(409,'El email o usuario ya está registrado');throw e;}
    this.set(u,r,res);return {ok:true,usuario:summary(u)};
  }
  async logout(r:FastifyRequest,res:FastifyReply){
    const c=verify(r.cookies?.token||'');
    if(c&&typeof c.id==='string'){const tv=Number(c.tv??0);try{await this.db.usuario.updateMany({where:{id:c.id,tokenVersion:tv},data:{tokenVersion:{increment:1}}});}catch{/* legacy still deletes cookie on storage error */}}
    this.clear(r,res);return {ok:true};
  }
  async forgot(b:Body,r:FastifyRequest){
    const email=(b.email||'').trim().toLowerCase();
    if(email.length>254||!/^([^\s<>@]+@[^\s<>@]+|[^\s<>@]+)$/.test(email))fail(400,'Escribe un correo válido');
    if(this.rate.limited(`forgot:${ip(r)}:${email}`,5,3600000)||this.rate.limited(`forgot:${ip(r)}`,20,3600000))fail(429,'Demasiados intentos. Espera unos minutos');
    const u=await this.db.usuario.findUnique({where:{email}}),url=process.env.PASSWORD_RESET_URL;
    if(u?.activo&&url){try{const parsed=new URL(url);if(['http:','https:'].includes(parsed.protocol))this.mail.enqueue({nombre:u.nombre,email:u.email,link:`${url.trim().replace(/\/$/,'')}#t=${resetToken(u.id,u.tokenVersion,u.password)}`});}catch{/* same response, never enumerate email */}}
    return {ok:true};
  }
  async reset(b:Body,r:FastifyRequest,res:FastifyReply){
    this.limit(`reset:${ip(r)}`,10,900000,'Demasiados intentos. Espera unos minutos');
    const c=readReset(b.token||'');if(!c)fail(400,invalid);
    if(!b.password||b.password.length<6)fail(400,'La contraseña debe tener al menos 6 caracteres');
    const u=await this.db.usuario.findUnique({where:{id:c!.sub}});
    if(!u||!u.activo||u.tokenVersion!==c!.tv||!sameFingerprint(u.password,c!.ph))fail(400,invalid);
    const count=await this.db.usuario.updateMany({where:{id:u!.id,tokenVersion:c!.tv,password:u!.password},data:{password:await bcrypt.hash(b.password!,10),tokenVersion:{increment:1}}});
    if(!count.count)fail(400,invalid);this.clear(r,res);return {ok:true};
  }
  async refresh(r:FastifyRequest,res:FastifyReply){const u=await this.session(r);this.set(u,r,res);return {ok:true,usuario:summary(u)};}
  async me(r:FastifyRequest){
    const u=await this.session(r);let next:Date|null=null;
    if(u.usernameCambiadoEn){next=new Date(u.usernameCambiadoEn);const month=next.getUTCMonth();next.setUTCFullYear(next.getUTCFullYear()+1);if(next.getUTCMonth()!==month)next.setUTCDate(0);if(next<=new Date())next=null;}
    return {usuario:{id:u.id,email:u.email,nombre:u.nombre,rol:u.rol,tv:u.tokenVersion,fechaNacimiento:u.fechaNacimiento?day(u.fechaNacimiento):null,username:u.username,telefono:u.telefono,fotoUrl:u.fotoUrl,usernameCambiadoEn:plainDate(u.usernameCambiadoEn),proximoCambioUsername:plainDate(next)}};
  }
  appOrigin(){try{return new URL(process.env.PASSWORD_RESET_URL||'').origin;}catch{return 'http://localhost:3000';}}
  google(returnUrl:string|undefined,r:FastifyRequest,res:FastifyReply){
    if(!this.googleProvider.configured())fail(503,'Google OAuth no está configurado');
    const state=Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');
    const options={httpOnly:true,secure:cookieOptions(r).secure,sameSite:'lax' as const,maxAge:600,path:'/'};
    res.setCookie('__oauth_state',state,options);
    let valid:string|null=null;
    if(returnUrl?.trim()&&returnUrl.length<=512){if(returnUrl.startsWith('/')&&!returnUrl.startsWith('//')&&!returnUrl.startsWith('/\\'))valid=returnUrl;else{try{if(['http:','https:'].includes(new URL(returnUrl).protocol))valid=returnUrl;}catch{/* invalid return URL ignored */}}}
    if(valid)res.setCookie('__oauth_returnurl',valid,options);
    return res.code(302).header('location',`https://accounts.google.com/o/oauth2/v2/auth?scope=openid+email+profile&response_type=code&redirect_uri=${escapeUri(process.env.GOOGLE_REDIRECT_URI||'')}&client_id=${escapeUri(process.env.GOOGLE_CLIENT_ID||'')}&state=${escapeUri(state)}`).send();
  }
  async callback(code:string|undefined,state:string|undefined,r:FastifyRequest,res:FastifyReply){
    const error=()=>res.code(302).header('location',`${this.appOrigin()}/login?error=google`).send();
    if(!this.googleProvider.configured()||!code||!state)return error();
    const p=await this.googleProvider.exchange(code,state,r.cookies?.__oauth_state||'');if(!p)return error();
    res.setCookie('__oauth_state','',{path:'/',expires:new Date(0),sameSite:false});res.setCookie('__oauth_returnurl','',{path:'/',expires:new Date(0),sameSite:false});
    let u=await this.db.usuario.findFirst({where:{googleId:p.sub}})||await this.db.usuario.findUnique({where:{email:p.email.trim().toLowerCase()}});
    if(u){if(!u.activo||(u.googleId!==null&&u.googleId!==p.sub))return error();if(u.googleId===null)u=await this.db.usuario.update({where:{id:u.id},data:{googleId:p.sub,avatarUrl:u.avatarUrl??p.picture}});this.set(u,r,res);const dest=`${this.appOrigin()}/login?google=ok`,ret=r.cookies?.__oauth_returnurl;return res.code(302).header('location',ret?`${dest}&returnUrl=${escapeUri(ret)}`:dest).send();}
    const token=sign({sub:p.sub,email:p.email,name:p.name,picture:p.picture||'',aud:'google-pendiente'},600,'google-pendiente');return res.code(302).header('location',`${this.appOrigin()}/completar-registro?t=${escapeUri(token)}`).send();
  }
  async googleComplete(b:Body,r:FastifyRequest,res:FastifyReply){
    if(!this.googleProvider.configured())fail(503,'Google OAuth no está configurado');
    const c=verify(b.t||'','google-pendiente');if(!c)fail(400,'Token inválido o vencido');
    const fechaNacimiento=birthday(b.fechaNacimiento),name=username(b.username);
    this.limit(`register:${ip(r)}:${c!.email}`,5,3600000,'Demasiados intentos. Intenta de nuevo más tarde');
    if(await this.db.usuario.findUnique({where:{username:name}}))fail(409,'El usuario ya está registrado');
    let u:User;try{u=await this.db.usuario.create({data:{id:newId(),nombre:String(c!.name||''),email:String(c!.email),googleId:String(c!.sub),avatarUrl:c!.picture?String(c!.picture):null,fechaNacimiento,username:name,usernameCambiadoEn:new Date(),password:await bcrypt.hash(Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64'),10),rol:'USUARIO',activo:true,tokenVersion:0,creadoEn:new Date()}});}catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==='P2002')fail(409,'El usuario ya está registrado');throw e;}
    this.set(u,r,res);return {ok:true,usuario:summary(u)};
  }
}
