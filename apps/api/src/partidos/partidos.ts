import { Body, Controller, Delete, Get, HttpCode, Inject, Injectable, Param, Post, Put, Req, Res } from '@nestjs/common';
import { Prisma } from '@reservaya/db';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Clock, DbService } from '../public/db.service';
import { day, fail, utc } from '../public/format';
import { validation } from '../public/binding';
import { newId } from '../auth/crypto';
import { RateLimiter } from '../auth/rate';
import { Access } from '../management/access';
import { Media, base, imageExtension, mediaUrl, ownPrefix } from '../management/media';
import { district, hostToday, parseTimeOfDay } from '../management/legacy';
import { parseDay } from '../public/format';
type Partido=Prisma.PartidoAbiertoGetPayload<object>&{usuarioByOrganizadorId?:{id:string;nombre:string}|null};
const levels=['Principiante','Intermedio','Avanzado'],formats=['Fútbol 5','Fútbol 6','Fútbol 7','Fútbol 8','Fútbol 9','Fútbol 11'],surfaces=['Grass sintético','Losa','Grass natural'];
const fields=['titulo','descripcion','formato','nivel','cuposTotales','fecha','desde','hasta','distrito','cancha','superficie','precio','fotoUrl'] as const;
type Form=Partial<Record<typeof fields[number],string>>&{foto?:Buffer};
const time=(n:number)=>`${String(Math.trunc(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
const person={select:{id:true,nombre:true}} as const;
function partidoShape(p:Partido,anotados:number,anotado:boolean,today:Date,inscritos:string[]=[]){
  const f=day(p.fecha),delta=(p.fecha.getTime()-today.getTime())/86400000,fechaCorta=delta===0?'Hoy':delta===1?'Mañana':`${f.slice(8,10)}/${f.slice(5,7)}`,desde=time(p.desdeMin);
  return {id:p.id,titulo:p.titulo,descripcion:p.descripcion,formato:p.formato,nivel:p.nivel,cuposTotales:p.cuposTotales,cuposLibres:Math.max(0,p.cuposTotales-anotados),distrito:p.distrito,cancha:p.cancha,superficie:p.superficie,precio:p.precio.toNumber(),fecha:f,desde,hasta:time(p.hastaMin),cuando:`${fechaCorta} ${desde}`,fechaCorta,horaCorta:desde,fotoUrl:p.fotoUrl,anotado,inscritos,organizador:p.usuarioByOrganizadorId?{id:p.usuarioByOrganizadorId.id,nombre:p.usuarioByOrganizadorId.nombre}:null,creadoEn:utc(p.creadoEn)};
}
const lower=Object.fromEntries(fields.map(f=>[f.toLowerCase(),f]));
@Injectable()
export class Partidos {
  constructor(@Inject(DbService)private store:DbService,@Inject(Access)private access:Access,@Inject(RateLimiter)private rate:RateLimiter,@Inject(Media)private media:Media,@Inject(Clock)private clock:Clock){}
  private get db(){return this.store.db;}
  private today(){return hostToday(this.clock.now());}
  async mine(r:FastifyRequest){
    const a=await this.access.actor(r),today=this.today();
    const rows=await this.db.partidoAbierto.findMany({where:{fecha:{gte:today},OR:[{organizadorId:a.id},{anotacionPartidoByPartidoId:{some:{usuarioId:a.id}}}]},include:{usuarioByOrganizadorId:person,anotacionPartidoByPartidoId:{orderBy:{id:'asc'},include:{usuarioByUsuarioId:{select:{nombre:true}}}}},orderBy:[{fecha:'asc'},{desdeMin:'asc'}]});
    return {ok:true,
      organizo:rows.filter(p=>p.organizadorId===a.id).map(p=>partidoShape(p,p.anotacionPartidoByPartidoId.length,false,today,p.anotacionPartidoByPartidoId.map(x=>x.usuarioByUsuarioId?.nombre??'Jugador'))),
      meAnote:rows.filter(p=>p.anotacionPartidoByPartidoId.some(x=>x.usuarioId===a.id)).map(p=>partidoShape(p,p.anotacionPartidoByPartidoId.length,true,today))};
  }
  // [FromForm] binding: multipart or urlencoded, case-insensitive names, first value wins.
  private async form(r:FastifyRequest):Promise<Form>{
    const type=String(r.headers['content-type']||'').toLowerCase(),form:Form={};
    const put=(name:string,value:string)=>{const k=lower[name.toLowerCase()];if(k&&form[k]===undefined)form[k]=value;};
    if(r.isMultipart()){
      if(Number(r.headers['content-length']||0)>3500000)fail(413,'Request body too large');
      for await(const part of r.parts({limits:{fileSize:8*1024*1024,files:4,fields:64,parts:68}})){if(part.type==='file'){const bytes=await part.toBuffer();if(part.fieldname.toLowerCase()==='foto'&&!form.foto)form.foto=bytes;}else put(part.fieldname,String(part.value));}
    }else if(type.startsWith('application/x-www-form-urlencoded')){for(const [k,v]of Object.entries((r.body??{}) as Record<string,string|string[]>))put(k,Array.isArray(v)?v[0]:v);}
    // Other content types bind an empty form in legacy and fail action validation.
    const errors:Record<string,string[]>={};
    const v=form.cuposTotales?.trim();if(v&&!(/^[+-]?\d+$/.test(v)&&Math.abs(Number(v))<=2147483647))errors.CuposTotales=[`The value '${form.cuposTotales}' is not valid for CuposTotales.`];
    const p=form.precio?.trim();if(p&&!(/^[+-]?(\d+|\d{1,3}(,\d{3})+)?(\.\d*)?([eE][+-]?\d+)?$/.test(p)&&/\d/.test(p)))errors.Precio=[`The value '${form.precio}' is not valid for Precio.`];
    if(Object.keys(errors).length)validation(errors);
    return form;
  }
  async create(r:FastifyRequest,res:FastifyReply){
    const a=await this.access.actor(r),b=await this.form(r);
    if(this.rate.limited(`partidos-pub:${a.id}`,20,3600000))fail(429,'Demasiadas publicaciones. Espera un momento antes de reintentar.');
    const titulo=(b.titulo??'').trim();if(titulo.length<3||titulo.length>80)fail(400,'Título de 3 a 80 caracteres');
    const formato=(b.formato??'').trim();if(!formats.includes(formato))fail(400,'Formato inválido');
    const nivel=(b.nivel??'').trim();if(!levels.includes(nivel))fail(400,'Nivel inválido');
    const cupos=b.cuposTotales?.trim()?Number(b.cuposTotales):null;if(cupos===null||cupos<2||cupos>30)fail(400,'Cupos totales entre 2 y 30');
    const today=this.today(),fecha=parseDay(b.fecha);if(!fecha)fail(400,'Fecha inválida');if(fecha!<today)fail(400,'La fecha no puede ser pasada');
    const desde=parseTimeOfDay(b.desde),hasta=parseTimeOfDay(b.hasta);if(desde===null||hasta===null||desde>=hasta)fail(400,'Horario inválido');
    const distrito=district(b.distrito);if(!distrito)fail(400,'Distrito inválido (Arequipa)');
    const cancha=(b.cancha??'').trim();if(cancha.length<2||cancha.length>80)fail(400,'Cancha de 2 a 80 caracteres');
    let superficie:string|null=null;if(b.superficie?.trim()){superficie=b.superficie.trim();if(!surfaces.includes(superficie))fail(400,'Superficie inválida');}
    const precio=new Prisma.Decimal(b.precio?.trim()?b.precio.trim().replace(/,/g,''):0);if(precio.lt(0)||precio.gt(9999))fail(400,'Precio inválido');
    const descripcion=b.descripcion?.trim()?b.descripcion.trim().slice(0,500):null,id=newId();let fotoUrl:string|null=null;
    if(b.fotoUrl?.trim()){if(!base())fail(503,'La subida de imágenes no está configurada');fotoUrl=mediaUrl(b.fotoUrl,ownPrefix('partido',a));if(!fotoUrl)fail(400,'URL de imagen inválida');}
    else if(b.foto?.length){res.header('Deprecation','true');if(b.foto.length>3*1024*1024)fail(400,'La imagen no puede superar 3 MB');const ext=imageExtension(b.foto);if(!ext)fail(400,'Solo se aceptan imágenes JPG, PNG, WEBP o GIF');fotoUrl=await this.media.store('partidos',id,b.foto,ext!);}
    const p=await this.db.partidoAbierto.create({data:{id,organizadorId:a.id,titulo,descripcion,formato,nivel,cuposTotales:cupos!,distrito:distrito!,cancha,superficie,precio,fecha:fecha!,desdeMin:desde!,hastaMin:hasta!,fotoUrl,creadoEn:new Date()},include:{usuarioByOrganizadorId:person}});
    return {ok:true,partido:partidoShape(p,0,false,today)};
  }
  async join(id:string,r:FastifyRequest){
    const a=await this.access.actor(r);if(this.rate.limited(`partidos-join:${a.id}`,60,3600000))fail(429,'Demasiados intentos. Espera un momento antes de reintentar.');
    const today=this.today();
    // Row lock serializes concurrent joins so the capacity check cannot be overrun.
    return this.db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT "id" FROM "PartidoAbierto" WHERE "id" = ${id} FOR UPDATE`;
      const p=await tx.partidoAbierto.findUnique({where:{id},include:{usuarioByOrganizadorId:person}});if(!p)fail(404,'Partido no encontrado');if(p!.fecha<today)fail(400,'El partido ya pasó');
      if(await tx.anotacionPartido.findFirst({where:{partidoId:id,usuarioId:a.id},select:{id:true}}))fail(409,'Ya estás anotado en este partido');
      const total=await tx.anotacionPartido.count({where:{partidoId:id}});if(total>=p!.cuposTotales)fail(409,'El partido ya está lleno');
      await tx.anotacionPartido.create({data:{id:newId(),partidoId:id,usuarioId:a.id,creadoEn:new Date()}});
      return {ok:true,partido:partidoShape(p!,total+1,true,today)};
    });
  }
  async leave(id:string,r:FastifyRequest){
    const a=await this.access.actor(r),x=await this.db.anotacionPartido.findFirst({where:{partidoId:id,usuarioId:a.id}});if(!x)fail(404,'No estás anotado en este partido');
    await this.db.anotacionPartido.delete({where:{id:x!.id}});return {ok:true};
  }
  async photo(id:string,b:{url?:string},r:FastifyRequest){
    const a=await this.access.actor(r);if(!base())fail(503,'La subida de imágenes no está configurada');
    const p=await this.db.partidoAbierto.findUnique({where:{id},include:{usuarioByOrganizadorId:person}});if(!p)fail(404,'Partido no encontrado');
    if(a.rol!=='TECNICO'&&p!.organizadorId!==a.id)fail(403,'Solo el organizador puede cambiar la foto');
    const url=mediaUrl(b?.url,b?.url?.trim()===p!.fotoUrl?undefined:ownPrefix('partido',a));if(!url)fail(400,'URL de imagen inválida');
    const updated=await this.db.partidoAbierto.update({where:{id},data:{fotoUrl:url},include:{usuarioByOrganizadorId:person}});if(p!.fotoUrl!==url)await this.media.remove(p!.fotoUrl,'partido');
    const [count,mine]=await Promise.all([this.db.anotacionPartido.count({where:{partidoId:id}}),this.db.anotacionPartido.findFirst({where:{partidoId:id,usuarioId:a.id},select:{id:true}})]);
    return {ok:true,partido:partidoShape(updated,count,Boolean(mine),this.today())};
  }
  async delete(id:string,r:FastifyRequest){
    const a=await this.access.actor(r),p=await this.db.partidoAbierto.findUnique({where:{id}});if(!p)fail(404,'Partido no encontrado');
    if(a.rol!=='TECNICO'&&p!.organizadorId!==a.id)fail(403,'Solo el organizador puede cancelarlo');
    await this.db.partidoAbierto.delete({where:{id}});await this.media.remove(p!.fotoUrl,'partido',true);return {ok:true};
  }
}
@Controller('api/partidos')
export class PartidosController {
  constructor(@Inject(Partidos)private service:Partidos){}
  @Get('mios') mine(@Req()r:FastifyRequest){return this.service.mine(r);}
  @Post() @HttpCode(201) create(@Req()r:FastifyRequest,@Res({passthrough:true})s:FastifyReply){return this.service.create(r,s);}
  @Post(':id/anotarse') @HttpCode(200) join(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.join(id,r);}
  @Delete(':id/anotarse') leave(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.leave(id,r);}
  @Put(':id/foto') photo(@Param('id')id:string,@Body()b:{url?:string},@Req()r:FastifyRequest){return this.service.photo(id,b,r);}
  @Delete(':id') delete(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.delete(id,r);}
}
