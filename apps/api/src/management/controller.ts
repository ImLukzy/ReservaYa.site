import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Put, Query, Req, Res } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { Canchas, type CanchaBody } from './canchas';
import { Horarios, type HorarioBody } from './horarios';
import { Promociones, type PromoBody } from './promociones';
import { Usuarios, type UserBody } from './usuarios';
@Controller('api/canchas')
export class CanchasWriteController {
  constructor(@Inject(Canchas)private service:Canchas){}
  @Post() @HttpCode(201) create(@Body()b:CanchaBody,@Req()r:FastifyRequest){return this.service.create(b,r);}
  @Put(':id') update(@Param('id')id:string,@Body()b:CanchaBody,@Req()r:FastifyRequest){return this.service.update(id,b,r);}
  @Delete(':id') delete(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.delete(id,r);}
  @Put(':id/imagen') image(@Param('id')id:string,@Body()b:{url?:string},@Req()r:FastifyRequest){return this.service.image(id,b,r);}
  @Post(':id/imagen') @HttpCode(200) upload(@Param('id')id:string,@Req()r:FastifyRequest,@Res({passthrough:true})s:FastifyReply){return this.service.upload(id,r,s);}
}
@Controller('api/horarios')
export class HorariosController {
  constructor(@Inject(Horarios)private service:Horarios){}
  @Get() list(@Query('complejoId')id:string|undefined,@Query('canchaId')cancha:string|undefined,@Req()r:FastifyRequest){return this.service.list(id,cancha,r);}
  @Put() replace(@Body()b:HorarioBody,@Req()r:FastifyRequest){return this.service.replace(b,r);}
}
@Controller('api/promociones')
export class PromocionesController {
  constructor(@Inject(Promociones)private service:Promociones){}
  @Get() list(@Query('complejoId')id:string|undefined,@Query('tipo')tipo:string|undefined,@Req()r:FastifyRequest){return this.service.list(id,tipo,r);}
  @Post() @HttpCode(201) create(@Body()b:PromoBody,@Req()r:FastifyRequest){return this.service.create(b,r);}
  @Put(':id') update(@Param('id')id:string,@Body()b:PromoBody,@Req()r:FastifyRequest){return this.service.update(id,b,r);}
  @Delete(':id') delete(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.delete(id,r);}
}
@Controller('api/usuarios')
export class UsuariosController {
  constructor(@Inject(Usuarios)private service:Usuarios){}
  @Get('buscar') search(@Query('q')q:string|undefined,@Req()r:FastifyRequest){return this.service.search(q,r);}
  @Get() list(@Req()r:FastifyRequest){return this.service.list(r);}
  @Get('clientes') clients(@Req()r:FastifyRequest){return this.service.clients(r);}
  @Get(':id/historial') history(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.history(id,r);}
  @Patch('me') me(@Body()b:UserBody,@Req()r:FastifyRequest){return this.service.me(b,r);}
  @Patch(':id') patch(@Param('id')id:string,@Body()b:UserBody,@Req()r:FastifyRequest){return this.service.patch(id,b,r);}
  @Put('me/foto') photo(@Body()b:{url?:string},@Req()r:FastifyRequest){return this.service.photo(b,r);}
  @Post('me/foto') @HttpCode(200) upload(@Req()r:FastifyRequest,@Res({passthrough:true})s:FastifyReply){return this.service.upload(r,s);}
  @Delete(':id') delete(@Param('id')id:string,@Req()r:FastifyRequest){return this.service.delete(id,r);}
}
