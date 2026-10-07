import { Body, Controller, Get, HttpCode, Inject, Post, Query, Req, Res } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService, type Body as Values } from './auth.service';
@Controller('api/auth')
export class AuthController {
  constructor(@Inject(AuthService)private readonly auth:AuthService){}
  @Post('login') @HttpCode(200) login(@Body()b:Values,@Req()r:FastifyRequest,@Res({passthrough:true})s:FastifyReply){return this.auth.login(b,r,s);}
  @Post('register') @HttpCode(200) register(@Body()b:Values,@Req()r:FastifyRequest,@Res({passthrough:true})s:FastifyReply){return this.auth.register(b,r,s);}
  @Post('logout') @HttpCode(200) logout(@Req()r:FastifyRequest,@Res({passthrough:true})s:FastifyReply){return this.auth.logout(r,s);}
  @Post('forgot-password') @HttpCode(200) forgot(@Body()b:Values,@Req()r:FastifyRequest){return this.auth.forgot(b,r);}
  @Post('reset-password') @HttpCode(200) reset(@Body()b:Values,@Req()r:FastifyRequest,@Res({passthrough:true})s:FastifyReply){return this.auth.reset(b,r,s);}
  @Post('refrescar') @HttpCode(200) refresh(@Req()r:FastifyRequest,@Res({passthrough:true})s:FastifyReply){return this.auth.refresh(r,s);}
  @Get('me') me(@Req()r:FastifyRequest){return this.auth.me(r);}
  @Get('google') google(@Query('returnUrl')url:string|undefined,@Req()r:FastifyRequest,@Res()s:FastifyReply){return this.auth.google(url,r,s);}
  @Get('google/callback') callback(@Query('code')code:string|undefined,@Query('state')state:string|undefined,@Req()r:FastifyRequest,@Res()s:FastifyReply){return this.auth.callback(code,state,r,s);}
  @Post('google/completar') @HttpCode(200) complete(@Body()b:Values,@Req()r:FastifyRequest,@Res({passthrough:true})s:FastifyReply){return this.auth.googleComplete(b,r,s);}
}
