import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DbModule } from '../public/db.module';
import { Access } from './access';
import { Media } from './media';
import { Canchas } from './canchas';
import { Horarios } from './horarios';
import { Promociones } from './promociones';
import { Usuarios } from './usuarios';
import { CanchasWriteController, HorariosController, PromocionesController, UsuariosController } from './controller';
@Module({imports:[DbModule,AuthModule],controllers:[CanchasWriteController,HorariosController,PromocionesController,UsuariosController],providers:[Access,Media,Canchas,Horarios,Promociones,Usuarios]})
export class ManagementModule {}
