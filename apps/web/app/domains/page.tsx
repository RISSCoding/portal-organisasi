// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Domain {
  id: string;
  domain: string;
  auto_join_role: string;
  created_at: string;
}

export default function DomainsPage() {
  const router = useRouter();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [domain, setDomain] = useState('');
  const [autoJoinRole, setAutoJoinRole] = useState('member');

  const fetchDomains = async () => {
    const res = await fetch('/api/domains');
    if (res.status === 401) return router.push('/login');
    if (res.ok) {
      setDomains((await res.json()) as Domain[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchDomains();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/domains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, autoJoinRole }),
    });

    if (!res.ok) {
      const err = (await res.json()) as { error?: { message: string } };
      setError(err.error?.message || 'Gagal menambahkan domain');
      return;
    }

    setDomain('');
    void fetchDomains();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus domain ini?')) return;
    await fetch(`/api/domains/${id}`, { method: 'DELETE' });
    void fetchDomains();
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'blue' }}>
          &larr; Back to Dashboard
        </Link>
      </div>
      <h1>Domain Organisasi</h1>
      <p>
        Pengguna yang mendaftar dengan email dari domain ini akan otomatis bergabung ke organisasi
        Anda.
      </p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form
        onSubmit={(e) => {
          void handleAdd(e);
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
          placeholder="Domain (misal: kampus.ac.id)"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          required
          style={{ padding: '0.5rem', flex: 1 }}
        />
        <select
          value={autoJoinRole}
          onChange={(e) => setAutoJoinRole(e.target.value)}
          style={{ padding: '0.5rem' }}
        >
          <option value="member">Member</option>
          <option value="manager">Manager</option>
        </select>
        <button type="submit" style={{ padding: '0.5rem 1rem', background: '#000', color: '#fff' }}>
          Tambah Domain
        </button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
            <th style={{ padding: '0.5rem' }}>Domain</th>
            <th style={{ padding: '0.5rem' }}>Role Otomatis</th>
            <th style={{ padding: '0.5rem' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {domains.map((d) => (
            <tr key={d.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>@{d.domain}</td>
              <td style={{ padding: '0.5rem', textTransform: 'capitalize' }}>{d.auto_join_role}</td>
              <td style={{ padding: '0.5rem' }}>
                <button
                  onClick={() => {
                    void handleDelete(d.id);
                  }}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Hapus
                </button>
              </td>
            </tr>
          ))}
          {domains.length === 0 && (
            <tr>
              <td colSpan={3} style={{ padding: '1rem', textAlign: 'center' }}>
                Belum ada domain yang terdaftar.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
