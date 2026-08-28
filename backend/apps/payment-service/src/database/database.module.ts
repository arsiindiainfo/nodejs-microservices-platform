import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InitialSchema1700000000002 } from './migrations/1700000000002-initial-schema';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql' as const,
        host: config.getOrThrow<string>('MYSQL_HOST'),
        port: config.get<number>('MYSQL_PORT', 3306),
        username: config.getOrThrow<string>('MYSQL_USER'),
        password: config.getOrThrow<string>('MYSQL_PASSWORD'),
        database: config.getOrThrow<string>('MYSQL_DATABASE'),
        // Session variables (`@p_status`, ...) carry OUT parameters back from
        // a CALL — the repository pins one connection per call sequence via
        // createQueryRunner() (payments.repository.ts), and this flag lets
        // that pinned connection run the CALL + the SELECT of those
        // variables as one round trip when convenient.
        extra: { multipleStatements: true },
        entities: [],
        migrations: [InitialSchema1700000000002],
        migrationsRun: true,
        synchronize: false,
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
