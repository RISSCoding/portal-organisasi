// SPDX-License-Identifier: AGPL-3.0-or-later
import { createHmac } from 'node:crypto';

export async function deliverWebhook(url: string, secret: string, event: string, payload: unknown) {
  const body = JSON.stringify({ event, payload });
  const signature = createHmac('sha256', secret).update(body).digest('hex');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Portal-Signature': signature,
      'X-Portal-Event': event,
    },
    body,
  });

  return {
    status: res.status,
    ok: res.ok,
    body: await res.text(),
  };
}
