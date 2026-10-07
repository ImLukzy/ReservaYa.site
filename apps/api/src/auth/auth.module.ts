import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RateLimiter } from './rate';
import { GoogleProvider, MailProvider } from './providers';
import { DbModule } from '../public/db.module';
@Module({ imports:[DbModule], controllers:[AuthController], providers:[AuthService,RateLimiter,GoogleProvider,MailProvider], exports:[AuthService,RateLimiter,MailProvider] })
export class AuthModule {}
