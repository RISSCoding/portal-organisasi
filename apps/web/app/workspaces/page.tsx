// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
    if (res.status === 401) {
      // User is logged in but no active org is set yet -> go to dashboard
      return router.push('/dashboard');
    }
    if (res.ok) {
      const data = (await res.json()) as Workspace[];
      setWorkspaces(data);
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
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'blue' }}>
          &larr; Back to Dashboard
        </Link>
      </div>
      <h1>Workspaces</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form
        onSubmit={(e) => {
          void handleCreate(e);
        }}
        style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}
      >
        <input
          type="text"
          placeholder="Workspace Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ padding: '0.5rem' }}
        />
        <input
          type="text"
          placeholder="slug-name"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          pattern="^[a-z0-9-]+$"
          style={{ padding: '0.5rem' }}
        />
        <button type="submit" style={{ padding: '0.5rem 1rem', background: '#000', color: '#fff' }}>
          Create
        </button>
      </form>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {workspaces.map((ws) => (
          <li
            key={ws.id}
            style={{
              border: '1px solid #ddd',
              padding: '1rem',
              marginBottom: '0.5rem',
              borderRadius: '4px',
            }}
          >
            <Link href={`/workspaces/${ws.id}`} style={{ textDecoration: 'none', color: '#000' }}>
              <h3 style={{ margin: 0 }}>
                {ws.name} <span style={{ color: '#666', fontSize: '0.9rem' }}>/{ws.slug}</span>
              </h3>
            </Link>
            <p style={{ margin: '0.5rem 0' }}>{ws.description || 'No description'}</p>
          </li>
        ))}
        {workspaces.length === 0 && <p>No workspaces yet. Create one above.</p>}
      </ul>
    </div>
  );
}
