// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, FileText } from 'lucide-react';

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
    if (res.ok) setDocs((await res.json()) as Document[]);
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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href={`/workspaces/${workspaceId}/projects/${projectId}`}
          className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-500 text-sm">Kelola dokumen proyek di sini.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" /> Buat Dokumen Baru
        </h2>
        <form
          onSubmit={(e) => {
            void handleCreate(e);
          }}
          className="space-y-4"
        >
          <input
            type="text"
            placeholder="Document Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
          <textarea
            placeholder="Content (markdown supported)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono transition"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition font-medium"
          >
            Create Document
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {docs.map((doc) => (
          <Link
            key={doc.id}
            href={`/workspaces/${workspaceId}/projects/${projectId}/documents/${doc.id}`}
            className="block group"
          >
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 group-hover:border-primary group-hover:shadow-md transition h-full flex flex-col justify-between">
              <div className="flex items-start gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary mt-1">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-primary transition">
                    {doc.title}
                  </h3>
                  <span className="text-xs text-gray-500">Version {doc.version}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
        {docs.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
            Belum ada dokumen. Buat satu di atas.
          </div>
        )}
      </div>
    </div>
  );
}
