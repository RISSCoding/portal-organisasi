// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface OrgSettings {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  settings: { primaryColor?: string } | null;
}

export default function OrgSettingsPage() {
  const router = useRouter();
  const [org, setOrg] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#000000');

  const fetchOrg = async () => {
    const res = await fetch('/api/organizations/current');
    if (res.status === 401) return router.push('/login');
    if (res.ok) {
      const data = (await res.json()) as OrgSettings;
      setOrg(data);
      setName(data.name);
      setDescription(data.description || '');
      setLogoUrl(data.logo_url || '');
      setPrimaryColor(data.settings?.primaryColor || '#000000');
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchOrg();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Kirim undefined (bukan '') untuk field opsional agar @IsUrl tidak gagal
    const payload: Record<string, unknown> = {
      name,
      primaryColor,
    };
    if (description) payload.description = description;
    if (logoUrl) payload.logoUrl = logoUrl;

    const res = await fetch('/api/organizations/current', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = (await res.json()) as { error?: { message: string } };
      setError(err.error?.message || 'Gagal menyimpan pengaturan');
      return;
    }

    localStorage.setItem('portal_primary_color', primaryColor);
    setSuccess(true);
    void fetchOrg();
  };

  if (loading) return <p>Loading...</p>;
  if (!org) return <p>Organisasi tidak ditemukan.</p>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'blue' }}>
          &larr; Back to Dashboard
        </Link>
      </div>
      <h1>Pengaturan Organisasi</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>Pengaturan berhasil disimpan!</p>}

      <form
        onSubmit={(e) => {
          void handleSave(e);
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          border: '1px solid #ddd',
          padding: '1rem',
          borderRadius: '4px',
        }}
      >
        <div>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>
            Nama Organisasi
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ padding: '0.5rem', width: '100%' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>
            Deskripsi
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ padding: '0.5rem', width: '100%' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>
            URL Logo
          </label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
            style={{ padding: '0.5rem', width: '100%' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>
            Warna Utama
          </label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              style={{ width: '50px', height: '40px', cursor: 'pointer' }}
            />
            <code>{primaryColor}</code>
          </div>
        </div>
        <button
          type="submit"
          style={{
            padding: '0.5rem 1rem',
            background: primaryColor,
            color: '#fff',
            alignSelf: 'flex-start',
            marginTop: '1rem',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Simpan Pengaturan
        </button>
      </form>
    </div>
  );
}
