// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  version: number;
}

export default function ProjectDocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const projectId = params.projectId as string;

  const [docs, setDocs] = useState<Document[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDocs = async () => {
    const res = await fetch(`/api/documents/project/${projectId}`);
    if (res.status === 401) return router.push('/login');
    if (res.ok) {
      const data = (await res.json()) as Document[];
      setDocs(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchDocs();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, title, content }),
    });

    if (!res.ok) {
      const err = (await res.json()) as { error?: { message?: string } };
      setError(err.error?.message || 'Failed to create document');
      return;
    }

    setTitle('');
    setContent('');
    void fetchDocs();
  };

  if (loading) return <p>Loading documents...</p>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href={`/workspaces/${workspaceId}/projects/${projectId}`} style={{ color: 'blue' }}>
          &larr; Back to Project
        </Link>
      </div>
      <h1>Documents</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form
        onSubmit={(e) => {
          void handleCreate(e);
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          marginBottom: '2rem',
          border: '1px solid #ddd',
          padding: '1rem',
          borderRadius: '4px',
        }}
      >
        <input
          type="text"
          placeholder="Document Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ padding: '0.5rem' }}
        />
        <textarea
          placeholder="Content (markdown supported)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={4}
          style={{ padding: '0.5rem', fontFamily: 'monospace' }}
        />
        <button
          type="submit"
          style={{
            padding: '0.5rem 1rem',
            background: '#000',
            color: '#fff',
            alignSelf: 'flex-start',
          }}
        >
          Create Document
        </button>
      </form>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {docs.map((doc) => (
          <li
            key={doc.id}
            style={{
              border: '1px solid #ddd',
              padding: '1rem',
              marginBottom: '0.5rem',
              borderRadius: '4px',
            }}
          >
            <Link
              href={`/workspaces/${workspaceId}/projects/${projectId}/documents/${doc.id}`}
              style={{ textDecoration: 'none', color: '#000' }}
            >
              <h3 style={{ margin: 0 }}>
                {doc.title}{' '}
                <span style={{ fontSize: '0.8rem', color: '#666' }}>v{doc.version}</span>
              </h3>
            </Link>
          </li>
        ))}
        {docs.length === 0 && <p>No documents yet. Create one above.</p>}
      </ul>
    </div>
  );
}
