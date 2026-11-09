// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, LayoutGrid, ArrowLeft } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export default function WorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');

  const fetchWorkspaces = async () => {
    const res = await fetch('/api/workspaces');
    if (res.status === 401) return router.push('/login');
    if (res.status === 403) return router.push('/dashboard');
    if (res.ok) {
      setWorkspaces((await res.json()) as Workspace[]);
    }
  };

  useEffect(() => {
    void fetchWorkspaces();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug }),
    });

    if (!res.ok) {
      const err = (await res.json()) as { error?: { message?: string } };
      setError(err.error?.message || 'Failed to create workspace');
      return;
    }

    setName('');
    setSlug('');
    void fetchWorkspaces();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
          <p className="text-gray-500 text-sm">Kelola ruang kerja organisasi Anda.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" /> Buat Workspace Baru
        </h2>
        <form
          onSubmit={(e) => {
            void handleCreate(e);
          }}
          className="flex gap-4"
        >
          <input
            type="text"
            placeholder="Nama Workspace"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
          <input
            type="text"
            placeholder="slug-name"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            pattern="^[a-z0-9-]+$"
            className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition font-medium"
          >
            Create
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces.map((ws) => (
          <Link key={ws.id} href={`/workspaces/${ws.id}`} className="block group">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 group-hover:border-primary group-hover:shadow-md transition h-full">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 group-hover:text-primary transition">
                  {ws.name}
                </h3>
              </div>
              <p className="text-sm text-gray-500">/{ws.slug}</p>
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {ws.description || 'No description'}
              </p>
            </div>
          </Link>
        ))}
        {workspaces.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
            Belum ada workspace. Buat satu di atas.
          </div>
        )}
      </div>
    </div>
  );
}
