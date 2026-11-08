// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  slug: string;
}

export default function WorkspaceProjectsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;

  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    const res = await fetch(`/api/projects/workspace/${workspaceId}`);
    if (res.status === 401) return router.push('/login');
    if (res.ok) {
      const data = (await res.json()) as Project[];
      setProjects(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchProjects();
  }, [workspaceId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, name, slug }),
    });

    if (!res.ok) {
      const err = (await res.json()) as { error?: { message?: string } };
      setError(err.error?.message || 'Failed to create project');
      return;
    }

    setName('');
    setSlug('');
    void fetchProjects();
  };

  if (loading) return <p>Loading projects...</p>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/workspaces" style={{ color: 'blue' }}>
          &larr; Back to Workspaces
        </Link>
      </div>
      <h1>Projects</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form
        onSubmit={(e) => {
          void handleCreate(e);
        }}
        style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}
      >
        <input
          type="text"
          placeholder="Project Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ padding: '0.5rem', flex: 1 }}
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
        {projects.map((proj) => (
          <li
            key={proj.id}
            style={{
              border: '1px solid #ddd',
              padding: '1rem',
              marginBottom: '0.5rem',
              borderRadius: '4px',
            }}
          >
            <Link
              href={`/workspaces/${workspaceId}/projects/${proj.id}`}
              style={{ textDecoration: 'none', color: '#000', fontWeight: 'bold' }}
            >
              {proj.name} <span style={{ color: '#666', fontSize: '0.9rem' }}>/{proj.slug}</span>
            </Link>
          </li>
        ))}
        {projects.length === 0 && <p>No projects yet. Create one above.</p>}
      </ul>
    </div>
  );
}
