// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Controller, Get } from '@nestjs/common';
import { Public } from '@app/common';

/** §32.2 — public project + author metadata endpoint. */
@Controller('about')
export class AboutController {
  @Public()
  @Get()
  about() {
    return {
      name: 'Enterprise API Gateway + Microservices Demo',
      author: 'Arsi India Info',
      website: 'https://arsiindiainfo.com',
      license: 'MIT (code) + Trademark Notice (brand)',
      repository: 'nodejs-microservices-platform',
    };
  }
}
