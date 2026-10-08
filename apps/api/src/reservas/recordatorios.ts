import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { inicioReserva } from '@reservaya/shared';
import { MailProvider } from '../auth/providers';
import { DbService } from '../public/db.service';
import { CorreosReserva } from './correos';
const CADA=5*60000,ANTES=2*3600000,DIA=86400000,PERU=5*3600000;
/** True while the match has not started and starts within the next 2 h. */
export const debeRecordar=(fecha:Date,horaInicio:number,now:Date)=>{const falta=inicioReserva(fecha,horaInicio).getTime()-now.getTime();return falta>0&&falta<=ANTES;};
/** In-process reminder (spec 66): every 5 min, one mail per CONFIRMADA booking starting within 2 h. */
@Injectable()
export class Recordatorios implements OnApplicationBootstrap,OnModuleDestroy {
 constructor(@Inject(DbService)private store:DbService,@Inject(MailProvider)private mail:MailProvider,@Inject(CorreosReserva)private correos:CorreosReserva){}
 private readonly logger=new Logger(Recordatorios.name);
 private timer?:NodeJS.Timeout;
 private running=false;
 onApplicationBootstrap(){if(!this.mail.transportConfigured())return;this.timer=setInterval(()=>void this.revisar(),CADA);this.timer.unref();void this.revisar();}
 onModuleDestroy(){clearInterval(this.timer);}
 async revisar(now=new Date()):Promise<string[]>{
  if(this.running)return [];this.running=true;
  try{
   const hoy=new Date(Math.floor((now.getTime()-PERU)/DIA)*DIA);
   const rows=await this.store.db.reserva.findMany({where:{estado:'CONFIRMADA',fecha:{in:[hoy,new Date(hoy.getTime()+DIA)]}},select:{id:true,fecha:true,horaInicio:true}});
   const enviados:string[]=[];
   for(const r of rows.filter(x=>debeRecordar(x.fecha,x.horaInicio,now))){
    // Conditional claim: only the first run (or instance) that flips NULL sends; a late or repeated run sends nothing.
    const claimed=await this.store.db.$executeRaw`UPDATE "Reserva" SET "recordatorioEnviadoEn" = ${now.toISOString()}::timestamp WHERE "id" = ${r.id} AND "estado" = 'CONFIRMADA' AND "recordatorioEnviadoEn" IS NULL`;
    if(claimed===1)enviados.push(r.id);
   }
   await this.correos.avisar(enviados,'recordatorio');
   return enviados;
  }catch{this.logger.error('No se pudieron revisar los recordatorios de reserva');return [];}
  finally{this.running=false;}
 }
}
