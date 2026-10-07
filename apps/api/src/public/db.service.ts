import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@reservaya/db';
@Injectable()
export class DbService implements OnModuleDestroy {
  private client?: PrismaClient;
  get db(): PrismaClient { return this.client ??= new PrismaClient(); }
  async onModuleDestroy() { await this.client?.$disconnect(); }
}
@Injectable()
export class Clock { now(): Date { return new Date(); } }
