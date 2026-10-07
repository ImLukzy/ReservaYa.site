import { Controller, Get, HttpCode, HttpException, Inject, Injectable, Post, Query, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { DbService } from '../public/db.service';
import { fail, money, utc } from '../public/format';
import { newId } from '../auth/crypto';
import { Access, managementRoles, type Actor } from '../management/access';
import { parseEnum } from '../management/legacy';
import { paymentMethods, openSession } from '../caja/caja';
import { blank, body, decimal, lockComplex, round2, str, txOptions, zero } from '../caja/money';
const noAccess='Complejo no encontrado o sin acceso';
const noAccount='Cuentas bancarias no disponibles: la tabla Complejo no tiene columna cuentaBancaria y no se puede migrar. Persiste la cuenta en localStorage del frontend.';
@Injectable()
export class AbonosService {
  constructor(@Inject(DbService)private store:DbService,@Inject(Access)private access:Access){}
  private get db(){return this.store.db;}
  // Own scope of the legacy controller: blocked complexes included; null = no access or missing.
  private async reach(a:Actor,complejoId?:string|null):Promise<string[]|null>{
    if(!blank(complejoId)){
      const id=complejoId!,ok=a.rol==='TECNICO'?Boolean(await this.db.complejo.findUnique({where:{id},select:{id:true}})):Boolean(await this.db.complejo.findFirst({where:{id,duenoId:a.id},select:{id:true}})||await this.db.complejoMiembro.findFirst({where:{complejoId:id,usuarioId:a.id,activo:true},select:{id:true}}));
      return ok?[id]:null;
    }
    if(a.rol==='TECNICO')return (await this.db.complejo.findMany({select:{id:true}})).map(c=>c.id);
    const own=(await this.db.complejo.findMany({where:{duenoId:a.id},select:{id:true}})).map(c=>c.id);
    const member=(await this.db.complejoMiembro.findMany({where:{usuarioId:a.id,activo:true},select:{complejoId:true}})).map(m=>m.complejoId);
    return [...new Set([...own,...member])];
  }
  async resumen(complejoId:string|undefined,r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),ids=await this.reach(a,complejoId);if(!ids)fail(404,noAccess);
    let abonado=zero(),porAbonar=zero(),movs:Awaited<ReturnType<typeof this.db.movimientoCaja.findMany>>=[];
    if(ids!.length){
      abonado=(await this.db.movimientoCaja.aggregate({where:{complejoId:{in:ids!},tipo:'ABONO'},_sum:{monto:true}}))._sum.monto??zero();
      const reservas=await this.db.reserva.findMany({where:{estado:{not:'CANCELADA'},OR:[{complejoId:{in:ids!}},{complejoId:null,canchaByCanchaId:{complejoId:{in:ids!}}}]},select:{total:true,montoPagado:true}});
      porAbonar=reservas.map(x=>x.total.minus(x.montoPagado)).filter(d=>d.gt(0)).reduce((t,d)=>t.plus(d),zero());
      movs=await this.db.movimientoCaja.findMany({where:{complejoId:{in:ids!},tipo:'ABONO'},orderBy:{creadoEn:'desc'},take:100});
    }
    return {ok:true,resumen:{porAbonar:money(porAbonar),totalAbonado:money(abonado)},movimientos:movs.map(m=>({id:m.id,complejoId:m.complejoId,cajaId:m.cajaId,metodoPago:m.metodoPago,monto:money(m.monto),descripcion:m.descripcion,creadoPorId:m.creadoPorId,creadoEn:utc(m.creadoEn)}))};
  }
  async abonar(r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),b=body(r),complejoId=str(b,'complejoId'),monto=decimal(b,'monto'),descripcion=str(b,'descripcion'),metodoPago=str(b,'metodoPago');
    if(blank(complejoId))fail(400,'complejoId es requerido');
    if(monto===null||monto.lte(0))fail(400,'Monto inválido');
    const ids=await this.reach(a,complejoId);if(!ids?.length)fail(404,noAccess);
    const metodo=blank(metodoPago)?'EFECTIVO':parseEnum(paymentMethods,metodoPago);if(!metodo)fail(400,'Método de pago inválido');
    // numeric(10,2) rounds half away from zero on write; the legacy response formats the same way.
    const mov=await this.db.$transaction(async tx=>{await lockComplex(tx,complejoId!);const caja=await openSession(tx,complejoId!,a);
      return tx.movimientoCaja.create({data:{id:newId(),complejoId:complejoId!,cajaId:caja.id,tipo:'ABONO',metodoPago:metodo!,monto:round2(monto!),descripcion:blank(descripcion)?'Abono registrado':descripcion!.trim(),creadoPorId:a.id,creadoEn:new Date()}});
    },txOptions);
    return {ok:true,movimiento:{id:mov.id,complejoId:mov.complejoId,cajaId:mov.cajaId,monto:money(mov.monto),descripcion:mov.descripcion,creadoEn:utc(mov.creadoEn)}};
  }
  async cuenta(r:FastifyRequest):Promise<never>{await this.access.actor(r);throw new HttpException({ok:false,error:noAccount},501);}
}
@Controller('api/abonos')
export class AbonosController {
  constructor(@Inject(AbonosService)private service:AbonosService){}
  @Get() resumen(@Query('complejoId')id:string|string[]|undefined,@Req()r:FastifyRequest){return this.service.resumen(Array.isArray(id)?id[0]:id,r);}
  @Post('abonar') @HttpCode(201) abonar(@Req()r:FastifyRequest){return this.service.abonar(r);}
  @Get('cuenta') getCuenta(@Req()r:FastifyRequest){return this.service.cuenta(r);}
  @Post('cuenta') setCuenta(@Req()r:FastifyRequest){return this.service.cuenta(r);}
}
