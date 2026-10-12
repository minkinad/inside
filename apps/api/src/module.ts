import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  AuthController,
  DataController,
  AdminController,
  BrandController,
  ApiService,
} from './routes';

@Module({
  controllers: [
    AuthController,
    DataController,
    AdminController,
    BrandController,
  ],
  providers: [
    ApiService,
    { provide: PrismaClient, useFactory: () => new PrismaClient() },
  ],
})
export class AppModule {}
