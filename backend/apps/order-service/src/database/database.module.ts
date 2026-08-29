// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InitialSchema1700000000001 } from './migrations/1700000000001-initial-schema';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mssql' as const,
        host: config.getOrThrow<string>('MSSQL_HOST'),
        port: config.get<number>('MSSQL_PORT', 1433),
        username: config.getOrThrow<string>('MSSQL_USER'),
        password: config.getOrThrow<string>('MSSQL_PASSWORD'),
        database: config.getOrThrow<string>('MSSQL_DATABASE'),
        options: { encrypt: false, trustServerCertificate: true },
        entities: [],
        migrations: [InitialSchema1700000000001],
        migrationsRun: true,
        synchronize: false,
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
