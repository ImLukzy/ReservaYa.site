import { quote } from './format';
import { Prisma } from '@reservaya/db';
type Promo=Prisma.PromocionGetPayload<object>;
export type EstadoFranja='LIBRE'|'OCUPADA'|'PASADA'|'ANTICIPACION';
export interface Franja { inicio:number;fin:number;estado:EstadoFranja;precio:string }
export function agendaFranjas({fecha,apertura,cierre,reservas,ahora,anticipacion=0,base,promos}:{fecha:Date;apertura:number;cierre:number;reservas:{horaInicio:number;horaFin:number}[];ahora:Date;anticipacion?:number;base:Prisma.Decimal;promos:Promo[]}):Franja[]{
 const franjas:Franja[]=[];
 const dia=fecha.toISOString().slice(0,10),medianoche=new Date(`${dia}T00:00:00-05:00`).getTime();
 for(let inicio=Math.ceil(apertura/30)*30;inicio+30<=cierre;inicio+=30){
  const fin=inicio+30,instante=medianoche+inicio*60000;
  const estado:EstadoFranja=instante<=ahora.getTime()?'PASADA':instante<ahora.getTime()+anticipacion*60000?'ANTICIPACION':reservas.some(r=>r.horaInicio<fin&&r.horaFin>inicio)?'OCUPADA':'LIBRE';
  franjas.push({inicio,fin,estado,precio:quote(base,promos,fecha,inicio,fin).total});
 }
 return franjas;
}
