// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AcceptInvitationPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Token undangan tidak ditemukan di URL.');
      return;
    }

    const acceptInvite = async () => {
      try {
        const res = await fetch('/api/invitations/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = (await res.json()) as {
          ok?: boolean;
          orgId?: string;
          error?: { message: string };
        };

        if (!res.ok) {
          if (res.status === 401) {
            throw new Error('Anda harus login terlebih dahulu untuk menerima undangan ini.');
          }
          throw new Error(data.error?.message || 'Gagal menerima undangan.');
        }

        setStatus('success');
        setMessage('Undangan berhasil diterima! Mengalihkan ke Dashboard...');

        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
      }
    };

    void acceptInvite();
  }, [router]);

  return (
    <div style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center' }}>
      <h1>Penerimaan Undangan</h1>

      {status === 'loading' && <p>Memproses undangan Anda...</p>}

      {status === 'success' && (
        <div
          style={{ padding: '1rem', background: '#d4edda', color: '#155724', borderRadius: '4px' }}
        >
          <p>{message}</p>
        </div>
      )}

      {status === 'error' && (
        <div
          style={{ padding: '1rem', background: '#f8d7da', color: '#721c24', borderRadius: '4px' }}
        >
          <p>{message}</p>
          <a
            href="/login"
            style={{
              display: 'inline-block',
              marginTop: '1rem',
              color: '#000',
              textDecoration: 'underline',
            }}
          >
            Pergi ke Halaman Login
          </a>
        </div>
      )}
    </div>
  );
}
