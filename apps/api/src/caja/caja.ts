import { Controller, Delete, Get, HttpCode, Inject, Injectable, Param, Post, Put, Req } from '@nestjs/common';
import { Prisma } from '@reservaya/db';
import type { FastifyRequest } from 'fastify';
import { DbService } from '../public/db.service';
import { fail, money, utc } from '../public/format';
import { newId } from '../auth/crypto';
import { Access, managementRoles, type Actor } from '../management/access';
import { parseEnum } from '../management/legacy';
import { blank, body, decimal, field, firstComplex, int, lockComplex, round2, str, txOptions, zero } from './money';
type Caja=Prisma.CajaSesionGetPayload<object>;type Mov=Prisma.MovimientoCajaGetPayload<object>;type Producto=Prisma.ProductoGetPayload<object>;
export const paymentMethods=['EFECTIVO','YAPE','CULQI','TARJETA','TRANSFERENCIA'] as const;
const movementTypes=['RESERVA','SNACK','ALQUILER','ABONO','EGRESO','AJUSTE'] as const;
const income=new Set<string>(['RESERVA','SNACK','ALQUILER','ABONO']),categories=['SNACK','ALQUILER','SERVICIO'];
const noComplex='Primero crea tu complejo para operar la caja',badCategory='Categoría inválida: usa SNACK, ALQUILER o SERVICIO';
const movShape=(m:Mov)=>({id:m.id,descripcion:m.descripcion,monto:money(m.monto),metodoPago:m.metodoPago,tipo:m.tipo,creadoEn:utc(m.creadoEn)});
const cajaShape=(c:Caja)=>({id:c.id,estado:c.estado,montoInicial:money(c.montoInicial),montoFinal:c.montoFinal===null?null:money(c.montoFinal),abiertaEn:utc(c.abiertaEn),cerradaEn:c.cerradaEn===null?null:utc(c.cerradaEn)});
const productShape=(p:Producto)=>({id:p.id,nombre:p.nombre,categoria:p.categoria,precio:money(p.precio),stock:p.stock,activo:p.activo});
const sum=(ms:Mov[],inc:boolean)=>ms.filter(m=>income.has(m.tipo)===inc).reduce((t,m)=>t.plus(m.monto),zero());
function summary(c:Caja,ms:Mov[]){const i=sum(ms,true),e=sum(ms,false);return {montoInicial:money(c.montoInicial),ingresos:money(i),egresos:money(e),esperado:money(c.montoInicial.plus(i).minus(e)),movimientos:ms.length};}
const emptySummary=()=>({montoInicial:'0.00',ingresos:'0.00',egresos:'0.00',esperado:'0.00',movimientos:0});
// Lima has no daylight saving time: UTC-5 all year.
export const startOfPeruDay=(now:Date)=>{const d=new Date(now.getTime()-5*3600000);return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())+5*3600000);};
/** Open cash session of a complex, created with zero when absent (legacy CajaAbiertaAsync). */
export async function openSession(tx:Prisma.TransactionClient,complejoId:string,a:Actor){
  return await tx.cajaSesion.findFirst({where:{complejoId,estado:'ABIERTA'}})??await tx.cajaSesion.create({data:{id:newId(),complejoId,abiertaPorId:a.id,montoInicial:0,estado:'ABIERTA',abiertaEn:new Date()}});
}
type Item={productoId:string|null;nombre:string|null;precio:Prisma.Decimal|null;cantidad:number|null;qty:number|null};
@Injectable()
export class CajaService {
  constructor(@Inject(DbService)private store:DbService,@Inject(Access)private access:Access){}
  private get db(){return this.store.db;}
  private async scope(r:FastifyRequest){const a=await this.access.actor(r,managementRoles);return {a,id:await firstComplex(this.db,a)};}
  async hoy(r:FastifyRequest){
    const {id}=await this.scope(r);if(!id)return {total:'0.00',movimientos:[],caja:null};
    const movs=await this.db.movimientoCaja.findMany({where:{complejoId:id,creadoEn:{gte:startOfPeruDay(new Date())}},orderBy:{creadoEn:'desc'}});
    const caja=await this.db.cajaSesion.findFirst({where:{complejoId:id,estado:'ABIERTA'}});
    return {total:money(sum(movs,true)),movimientos:movs.map(movShape),caja:caja?cajaShape(caja):null};
  }
  async sesion(r:FastifyRequest){
    const {id}=await this.scope(r);if(!id)return {caja:null,resumen:emptySummary()};
    const caja=await this.db.cajaSesion.findFirst({where:{complejoId:id,estado:'ABIERTA'}});if(!caja)return {caja:null,resumen:emptySummary()};
    return {caja:cajaShape(caja),resumen:summary(caja,await this.db.movimientoCaja.findMany({where:{cajaId:caja.id}}))};
  }
  async apertura(r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),monto=decimal(body(r),'montoInicial'),id=await firstComplex(this.db,a);if(!id)fail(400,noComplex);
    return this.db.$transaction(async tx=>{await lockComplex(tx,id!);
      if(await tx.cajaSesion.findFirst({where:{complejoId:id!,estado:'ABIERTA'}}))fail(409,'Ya hay una caja abierta');
      if(monto===null||monto.lt(0))fail(400,'El monto inicial debe ser mayor o igual a cero');
      const caja=await tx.cajaSesion.create({data:{id:newId(),complejoId:id!,abiertaPorId:a.id,montoInicial:round2(monto!),estado:'ABIERTA',abiertaEn:new Date()}});
      return {ok:true,caja:cajaShape(caja)};
    },txOptions);
  }
  async cierre(r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),monto=decimal(body(r),'montoFinal'),id=await firstComplex(this.db,a);if(!id)fail(400,noComplex);
    if(monto===null||monto.lt(0))fail(400,'El monto final debe ser mayor o igual a cero');
    return this.db.$transaction(async tx=>{await lockComplex(tx,id!);
      const open=await tx.cajaSesion.findFirst({where:{complejoId:id!,estado:'ABIERTA'}});if(!open)fail(400,'No hay una caja abierta');
      const movs=await tx.movimientoCaja.findMany({where:{cajaId:open!.id}});
      const caja=await tx.cajaSesion.update({where:{id:open!.id},data:{montoFinal:round2(monto!),estado:'CERRADA',cerradaPorId:a.id,cerradaEn:new Date()}});
      const esperado=caja.montoInicial.plus(sum(movs,true)).minus(sum(movs,false));
      return {ok:true,caja:cajaShape(caja),resumen:summary(caja,movs),diferencia:money(caja.montoFinal!.minus(esperado))};
    },txOptions);
  }
  async movimientos(r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),b=body(r),list=field(b,'items'),raw=list?.value;
    const items:Item[]|null=Array.isArray(raw)?raw.map((i,n)=>{const at=`$.${list!.key}[${n}]`;return {productoId:str(i,'productoId','request',at),nombre:str(i,'nombre','request',at),precio:decimal(i,'precio','request',at),cantidad:int(i,'cantidad','request',at),qty:int(i,'qty','request',at)};}):null;
    const descripcion=str(b,'descripcion'),monto=decimal(b,'monto'),tipo=str(b,'tipo'),metodoPago=str(b,'metodoPago');
    const id=await firstComplex(this.db,a);if(!id)fail(400,noComplex);
    const metodo=parseEnum(paymentMethods,metodoPago??'EFECTIVO');if(!metodo)fail(400,'Método de pago inválido');
    // Like legacy, a session opened here stays open even when the ticket is rejected; stock is only written with the movements.
    const result=await this.db.$transaction(async tx=>{await lockComplex(tx,id!);
      const caja=await openSession(tx,id!,a),created:Prisma.MovimientoCajaCreateManyInput[]=[],products=new Map<string,Producto>();
      const add=(m:Omit<Prisma.MovimientoCajaCreateManyInput,'id'|'complejoId'|'cajaId'|'metodoPago'|'creadoPorId'|'creadoEn'>)=>created.push({id:newId(),complejoId:id!,cajaId:caja.id,metodoPago:metodo!,creadoPorId:a.id,creadoEn:new Date(),...m});
      if(items?.length){
        for(const item of items){
          const qty=item.cantidad??item.qty??1;if(qty<=0)return {error:'La cantidad debe ser mayor que cero'};
          if(!blank(item.productoId)){
            let p=products.get(item.productoId!);
            if(!p){const rows=await tx.$queryRaw<{id:string}[]>`SELECT id FROM "Producto" WHERE id=${item.productoId} AND "complejoId"=${id} AND activo FOR UPDATE`;
              const found=rows.length?await tx.producto.findUnique({where:{id:rows[0].id}}):null;if(!found)return {error:'Producto no disponible'};p={...found};products.set(p.id,p);}
            if(p.stock!==null&&p.stock<qty)return {error:`Stock insuficiente de ${p.nombre}`};
            add({tipo:p.categoria==='ALQUILER'?'ALQUILER':'SNACK',monto:round2(p.precio.times(qty)),descripcion:`Venta: ${p.nombre} x${qty}`,productoId:p.id});
            if(p.stock!==null)p.stock-=qty;
          } else {
            // Direct sale (e.g. court rental): free name and price.
            if(blank(item.nombre)||item.precio===null||item.precio.lte(0))return {error:'Cada ítem necesita producto o nombre y precio'};
            add({tipo:'ALQUILER',monto:round2(item.precio.times(qty)),descripcion:`Venta: ${item.nombre!.trim()} x${qty}`});
          }
        }
      } else {
        if(blank(descripcion)||monto===null||monto.lte(0))return {error:'Indica la descripción y un monto mayor que cero'};
        const t=parseEnum(movementTypes,tipo??'SNACK');if(!t)return {error:'Tipo de movimiento inválido'};
        add({tipo:t,monto:round2(monto),descripcion:descripcion!.trim()});
      }
      await tx.movimientoCaja.createMany({data:created});
      for(const p of products.values())await tx.producto.update({where:{id:p.id},data:{stock:p.stock}});
      const ms=created as unknown as Mov[];
      return {ok:true,total:money(ms.reduce((t,m)=>t.plus(m.monto),zero())),movimientos:ms.map(movShape)};
    },txOptions);
    if('error'in result&&result.error)fail(400,result.error);
    return result;
  }
  async productos(r:FastifyRequest){
    const {id}=await this.scope(r);if(!id)return {productos:[]};
    return {productos:(await this.db.producto.findMany({where:{complejoId:id,activo:true},orderBy:{nombre:'asc'}})).map(productShape)};
  }
  async crearProducto(r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),b=body(r),nombre=str(b,'nombre'),categoria=str(b,'categoria'),precio=decimal(b,'precio'),stock=int(b,'stock');
    const id=await firstComplex(this.db,a);if(!id)fail(400,'Primero crea tu complejo para agregar productos');
    if(blank(nombre))fail(400,'El nombre es obligatorio');
    if(categoria===null||!categories.includes(categoria.toUpperCase()))fail(400,badCategory);
    if(precio===null||precio.lte(0))fail(400,'El precio debe ser mayor que cero');
    if(stock!==null&&stock<0)fail(400,'El stock no puede ser negativo');
    const p=await this.db.producto.create({data:{id:newId(),complejoId:id!,nombre:nombre!.trim(),categoria:categoria!.toUpperCase(),precio:round2(precio!),stock,activo:true}});
    return {ok:true,producto:productShape(p)};
  }
  private async product(a:Actor,id:string,tx:Prisma.TransactionClient){
    const own=await firstComplex(tx,a);if(a.rol!=='TECNICO'&&!own)return null;
    return tx.producto.findFirst({where:{id,...(a.rol==='TECNICO'?{}:{complejoId:own!})}});
  }
  async actualizarProducto(id:string,r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),b=body(r),nombre=str(b,'nombre'),categoria=str(b,'categoria'),precio=decimal(b,'precio'),stock=int(b,'stock');
    return this.db.$transaction(async tx=>{
      const found=await this.product(a,id,tx);if(!found)fail(404,'Producto no encontrado');
      // Row lock: stock edits and ticket sales never overwrite each other.
      await tx.$queryRaw`SELECT id FROM "Producto" WHERE id=${found!.id} FOR UPDATE`;
      const data:Prisma.ProductoUpdateInput={};if(!blank(nombre))data.nombre=nombre!.trim();
      if(categoria!==null){if(!categories.includes(categoria.toUpperCase()))fail(400,badCategory);data.categoria=categoria.toUpperCase();}
      if(precio!==null){if(precio.lte(0))fail(400,'El precio debe ser mayor que cero');data.precio=round2(precio);}
      if(stock!==null){if(stock<0)fail(400,'El stock no puede ser negativo');data.stock=stock;}
      return {ok:true,producto:productShape(await tx.producto.update({where:{id:found!.id},data}))};
    },txOptions);
  }
  async eliminarProducto(id:string,r:FastifyRequest){
    const a=await this.access.actor(r,managementRoles),p=await this.product(a,id,this.db);
    if(p)await this.db.producto.update({where:{id:p.id},data:{activo:false}});return {ok:true};
  }
}
@Controller('api/caja')
export class CajaController {
  constructor(@Inject(CajaService)private service:CajaService){}
  @Get('hoy') hoy(@Req()r:FastifyRequest){return this.service.hoy(r);}
  @Get('sesion') sesion(@Req()r:FastifyRequest){return this.service.sesion(r);}
  @Post('apertura') @HttpCode(201) apertura(@Req()r:FastifyRequest){return this.service.apertura(r);}
  @Post('cierre') @HttpCode(200) cierre(@Req()r:FastifyRequest){return this.service.cierre(r);}
  @Post('movimientos') @HttpCode(201) movimientos(@Req()r:FastifyRequest){return this.service.movimientos(r);}
  @Get('productos') productos(@Req()r:FastifyRequest){return this.service.productos(r);}
  @Post('productos') @HttpCode(201) crearProducto(@Req()r:FastifyRequest){return this.service.crearProducto(r);}
  @Put('productos/:id') actualizarProducto(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.actualizarProducto(id,r);}
  @Delete('productos/:id') eliminarProducto(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.eliminarProducto(id,r);}
}
