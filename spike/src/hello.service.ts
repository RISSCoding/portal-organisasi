// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable } from '@nestjs/common';

@Injectable()
export class HelloService {
  greet(name: string): string {
    return `hello, ${name}`;
  }
}
