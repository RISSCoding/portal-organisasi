// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  last_used_at: string | null;
  created_at: string;
}

export default function ApiKeysPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchKeys = async () => {
    const res = await fetch('/api/api-keys');
    if (res.status === 401) return router.push('/login');
    if (res.ok) {
      setKeys((await res.json()) as ApiKey[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchKeys();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNewKey(null);

    const res = await fetch('/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const err = (await res.json()) as { error?: { message: string } };
      setError(err.error?.message || 'Gagal membuat API Key');
      return;
    }

    const data = (await res.json()) as { key: string };
    setNewKey(data.key);
    setName('');
    void fetchKeys();
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'blue' }}>
          &larr; Back to Dashboard
        </Link>
      </div>
      <h1>API Keys</h1>
      <p>
        Gunakan API Key untuk mengakses API Portal Organisasi dari aplikasi eksternal atau script.
      </p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {newKey && (
        <div
          style={{
            background: '#d4edda',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '2rem',
          }}
        >
          <h3 style={{ marginTop: 0, color: '#155724' }}>API Key Berhasil Dibuat!</h3>
          <p style={{ color: '#155724' }}>
            Salin kunci ini sekarang. Anda tidak akan bisa melihatnya lagi.
          </p>
          <code
            style={{
              display: 'block',
              padding: '1rem',
              background: 'white',
              border: '1px solid #c3e6cb',
              borderRadius: '4px',
              wordBreak: 'break-all',
            }}
          >
            {newKey}
          </code>
        </div>
      )}

      <form
        onSubmit={(e) => {
          void handleCreate(e);
        }}
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          border: '1px solid #ddd',
          padding: '1rem',
          borderRadius: '4px',
        }}
      >
        <input
          type="text"
          placeholder="Nama API Key (misal: Script LPJ)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ padding: '0.5rem', flex: 1 }}
        />
        <button type="submit" style={{ padding: '0.5rem 1rem', background: '#000', color: '#fff' }}>
          Generate Key
        </button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
            <th style={{ padding: '0.5rem' }}>Nama</th>
            <th style={{ padding: '0.5rem' }}>Prefix</th>
            <th style={{ padding: '0.5rem' }}>Terakhir Digunakan</th>
            <th style={{ padding: '0.5rem' }}>Dibuat</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '0.5rem' }}>{k.name}</td>
              <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{k.prefix}...</td>
              <td style={{ padding: '0.5rem' }}>
                {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'Belum pernah'}
              </td>
              <td style={{ padding: '0.5rem' }}>{new Date(k.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
          {keys.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: '1rem', textAlign: 'center' }}>
                Belum ada API Key.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
