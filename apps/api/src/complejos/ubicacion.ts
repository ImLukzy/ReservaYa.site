import { Controller, Get, Inject, Injectable, Query, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AREA_AREQUIPA, puntoEnArequipa } from '@reservaya/shared';
import { Access, managementRoles } from '../management/access';
import { fail } from '../public/format';
import { districts } from '../public/districts';
interface Lugar { nombre:string;latitud:number;longitud:number;distrito:string|null }
const normal=(s:string)=>s.normalize('NFD').replace(/\p{Mn}/gu,'').toLowerCase().replace(/^distrito de /,'');
@Injectable()
export class Ubicacion {
  private cola:Promise<unknown>=Promise.resolve();
  private ultimo=0;
  private pendientes=0;
  private cache=new Map<string,{vence:number;lugares:Lugar[]}>();
  constructor(@Inject(Access)private access:Access){}
  async buscar(q:{q?:string;latitud?:string;longitud?:string},r:FastifyRequest){
    await this.access.actor(r,managementRoles);
    const parametros=new URLSearchParams({format:'jsonv2',addressdetails:'1','accept-language':'es'});
    let ruta:string;
    if(q.q!==undefined){
      const texto=q.q.trim();if(texto.length<3||texto.length>180)fail(400,'Escribe una dirección de 3 a 180 caracteres');
      ruta='search';parametros.set('q',texto);parametros.set('countrycodes','pe');parametros.set('bounded','1');parametros.set('limit','5');
      parametros.set('viewbox',`${AREA_AREQUIPA.oeste},${AREA_AREQUIPA.norte},${AREA_AREQUIPA.este},${AREA_AREQUIPA.sur}`);
    }else{
      const lat=Number(q.latitud),lng=Number(q.longitud);
      if(!q.latitud||!q.longitud||!puntoEnArequipa(lat,lng))fail(400,'Ubicación fuera de Arequipa');
      ruta='reverse';parametros.set('lat',lat.toFixed(6));parametros.set('lon',lng.toFixed(6));parametros.set('zoom','14');
    }
    const clave=`${ruta}?${parametros}`,prev=this.cache.get(clave);
    if(prev&&prev.vence>Date.now())return {lugares:prev.lugares};
    if(this.pendientes>=5)fail(429,'Espera unos segundos antes de buscar otra dirección');
    this.pendientes++;
    const tarea=this.cola.then(async()=>{
      // Revisa de nuevo tras esperar: dos búsquedas simultáneas comparten resultado.
      const hit=this.cache.get(clave);if(hit&&hit.vence>Date.now())return {lugares:hit.lugares};
      const espera=Math.max(0,this.ultimo+1100-Date.now());if(espera)await new Promise(resolve=>setTimeout(resolve,espera));
      this.ultimo=Date.now();
      let response:Response;
      try {response=await fetch(`${(process.env.NOMINATIM_URL||'https://nominatim.openstreetmap.org').replace(/\/$/,'')}/${clave}`,{headers:{'User-Agent':'ReservaYa/1.0 (https://reservaya.site; lukas.melgar@tecsup.edu.pe)',Referer:'https://reservaya.site/'},signal:AbortSignal.timeout(10000)});}
      catch {return fail(503,'No se pudo consultar la dirección. Puedes marcar el punto en el mapa.');}
      if(!response.ok)return fail(503,'El buscador de direcciones no está disponible. Puedes marcar el punto en el mapa.');
      const raw:unknown=await response.json(),rows=Array.isArray(raw)?raw:[raw];
      const lugares:Lugar[]=[];
      for(const row of rows){
        if(!row||typeof row!=='object')continue;const x=row as Record<string,unknown>,lat=Number(x.lat),lng=Number(x.lon);
        if(!puntoEnArequipa(lat,lng)||typeof x.display_name!=='string')continue;
        const address=x.address&&typeof x.address==='object'?x.address as Record<string,unknown>:{};
        const values=Object.values(address).filter((v):v is string=>typeof v==='string');
        const distrito=districts.find(d=>values.some(v=>normal(v)===normal(d)))??null;
        lugares.push({nombre:x.display_name,latitud:lat,longitud:lng,distrito});
      }
      if(this.cache.size>=128)this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(clave,{vence:Date.now()+86400000,lugares});return {lugares};
    });
    this.cola=tarea.catch(()=>undefined);
    try{return await tarea;}finally{this.pendientes--;}
  }
}
@Controller('api/ubicacion')
export class UbicacionController {
  constructor(@Inject(Ubicacion)private ubicacion:Ubicacion){}
  @Get() buscar(@Query()q:{q?:string;latitud?:string;longitud?:string},@Req()r:FastifyRequest){return this.ubicacion.buscar(q,r);}
}
