// SPDX-License-Identifier: AGPL-3.0-or-later
import { Global, Module } from '@nestjs/common';
import postgres from 'postgres';

export const DB_CONNECTION = 'DB_CONNECTION';

@Global()
@Module({
  providers: [
    {
      provide: DB_CONNECTION,
      useFactory: () => {
        const url = process.env.DATABASE_URL || 'postgres://portal_app:app@localhost:5432/portal';
        return postgres(url, { max: 10 });
      },
    },
  ],
  exports: [DB_CONNECTION],
})
export class DbModule {}
