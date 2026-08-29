// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuthServiceModule } from './../src/auth-service.module';

describe('auth-service health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthServiceModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health reports liveness', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });

  it('GET /health/ready reports Redis readiness', () => {
    return request(app.getHttpServer()).get('/health/ready').expect(200);
  });
});
