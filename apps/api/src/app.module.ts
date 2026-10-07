import { Module } from '@nestjs/common';
import { PublicReadController } from './public/read.controller';
import { PublicReadService } from './public/read.service';
import { DbService, Clock } from './public/db.service';
import { HealthController } from './health.controller';

@Module({ controllers: [HealthController, PublicReadController], providers: [PublicReadService, DbService, Clock] })
export class AppModule {}
