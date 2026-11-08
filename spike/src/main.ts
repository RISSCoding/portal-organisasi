// SPDX-License-Identifier: AGPL-3.0-or-later
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SpikeModule } from './spike.module';

const app = await NestFactory.create(SpikeModule);
app.useGlobalPipes(
  new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
);
app.enableShutdownHooks();
await app.listen(3001);
console.log('spike: listening on 3001');
