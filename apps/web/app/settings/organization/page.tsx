// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Building2 } from 'lucide-react';

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

    const payload: Record<string, unknown> = { name, primaryColor };
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
    // Optional: reload to apply primary color globally
    // window.location.reload();
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!org) return <div className="p-8 text-center text-gray-500">Organisasi tidak ditemukan.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Organisasi</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>
      )}
      {success && (
        <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200">
          Pengaturan berhasil disimpan!
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form
          onSubmit={(e) => {
            void handleSave(e);
          }}
          className="space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nama Organisasi</label>
            <div className="relative">
              <Building2 className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition"
              placeholder="Deskripsi singkat organisasi..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">URL Logo</label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Warna Utama</label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-10 p-0 border border-gray-300 rounded cursor-pointer"
              />
              <code className="text-sm bg-gray-100 px-3 py-1.5 rounded-md text-gray-700">
                {primaryColor}
              </code>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-medium"
            >
              <Save className="w-4 h-4" />
              Simpan Pengaturan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
