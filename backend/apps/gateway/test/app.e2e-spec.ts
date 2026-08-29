// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { GatewayModule } from './../src/gateway.module';

describe('gateway (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [GatewayModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/(.*)'] });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health reports liveness', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });

  it('GET /api/v1/about is public and returns project metadata', () => {
    return request(app.getHttpServer())
      .get('/api/v1/about')
      .expect(200)
      .expect((res) => {
        if (res.body.data.author !== 'Arsi India Info') {
          throw new Error(
            'Expected about payload to name Arsi India Info as author',
          );
        }
      });
  });
});
