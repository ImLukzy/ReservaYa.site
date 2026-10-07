import { ManagementModule } from './management/module';
import { DomainsModule } from './domains.module';
import { AuthModule } from './auth/auth.module';
import { Module } from '@nestjs/common';
import { PublicReadController } from './public/read.controller';
import { PublicReadService } from './public/read.service';
import { DbModule } from './public/db.module';
import { HealthController } from './health.controller';

@Module({ imports: [DbModule, AuthModule, ManagementModule, DomainsModule], controllers: [HealthController, PublicReadController], providers: [PublicReadService] })
export class AppModule {}
