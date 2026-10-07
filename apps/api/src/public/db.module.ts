import { Global, Module } from '@nestjs/common';
import { Clock, DbService } from './db.service';
@Global()
@Module({providers:[DbService,Clock],exports:[DbService,Clock]})
export class DbModule {}
