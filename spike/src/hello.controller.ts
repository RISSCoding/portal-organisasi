// SPDX-License-Identifier: AGPL-3.0-or-later
import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { HelloService } from './hello.service';

class GreetDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

@Controller('hello')
export class HelloController {
  constructor(private readonly hello: HelloService) {}

  @Get()
  root(): { ok: true } {
    return { ok: true };
  }

  @Post()
  greet(@Body() dto: GreetDto): { message: string } {
    return { message: this.hello.greet(dto.name) };
  }
}
