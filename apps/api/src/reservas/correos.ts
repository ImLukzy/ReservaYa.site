import { Inject, Injectable, Logger } from '@nestjs/common';
import { correoReserva, type DatosCorreoReserva, type TipoCorreoReserva } from '@reservaya/shared';
import { MailProvider } from '../auth/providers';
import { DbService } from '../public/db.service';
import { money } from '../public/format';
const email=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Complejo={nombre:string;duenoId:string;usuarioByDuenoId:{nombre:string;email:string}|null};
// Spec 62 adds Complejo.latitud/longitud; read them only when the generated client returns them.
const ubicacion=(c:object|null):DatosCorreoReserva['ubicacion']=>{const {latitud,longitud}=(c??{}) as {latitud?:unknown;longitud?:unknown};return typeof latitud==='number'&&typeof longitud==='number'?{latitud,longitud}:null;};
/** Booking mails (spec 66). Fire-and-forget after the commit: a mail failure never changes the API response and logs carry no personal data. */
@Injectable()
export class CorreosReserva {
 constructor(@Inject(DbService)private store:DbService,@Inject(MailProvider)private mail:MailProvider){}
 private readonly logger=new Logger(CorreosReserva.name);
 avisar(ids:string[],tipo:TipoCorreoReserva,opciones:{dueno?:boolean}={}):Promise<void>{
  return this.enviar(ids,tipo,opciones).catch(()=>{this.logger.error(`No se pudo preparar el correo de reserva (${tipo})`);});
 }
 private async enviar(ids:string[],tipo:TipoCorreoReserva,opciones:{dueno?:boolean}){
  if(!ids.length)return;
  const dueno={include:{usuarioByDuenoId:true}} as const;
  const rows=await this.store.db.reserva.findMany({where:{id:{in:ids}},include:{usuarioByUsuarioId:true,complejoByComplejoId:dueno,canchaByCanchaId:{include:{complejoByComplejoId:dueno}}}});
  for(const r of rows){
   const complejo:Complejo|null=r.complejoByComplejoId??r.canchaByCanchaId.complejoByComplejoId,jugador=r.usuarioByUsuarioId;
   const base={codigo:r.codigo,estado:r.estado,complejo:complejo?.nombre??'ReservaYa',cancha:r.canchaByCanchaId.nombre,fecha:r.fecha,horaInicio:r.horaInicio,horaFin:r.horaFin,total:money(r.total),ubicacion:ubicacion(complejo)};
   this.cola(jugador?.email,tipo,{...base,nombre:jugador?.nombre??''});
   const owner=complejo?.usuarioByDuenoId;
   if(opciones.dueno&&owner&&complejo!.duenoId!==r.usuarioId)this.cola(owner.email,'nueva',{...base,nombre:owner.nombre,jugador:jugador?.nombre});
  }
 }
 private cola(to:string|undefined,tipo:TipoCorreoReserva,datos:DatosCorreoReserva){
  if(!to||!email.test(to.trim()))return;
  try{if(!this.mail.queueReserva({to:to.trim(),...correoReserva(tipo,datos)},datos.codigo))this.logger.error(`Cola de correo no disponible para la reserva ${datos.codigo}`);}
  catch{this.logger.error(`No se pudo encolar el correo de la reserva ${datos.codigo}`);}
 }
}
