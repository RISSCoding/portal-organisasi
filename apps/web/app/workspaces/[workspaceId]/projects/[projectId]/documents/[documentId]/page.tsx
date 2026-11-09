// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import RichTextEditor from '@/app/components/RichTextEditor';
import { ArrowLeft, Edit2, MessageSquare, Save, X } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  content: string;
  version: number;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author_name: string;
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const projectId = params.projectId as string;
  const documentId = params.documentId as string;

  const [doc, setDoc] = useState<Document | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const fetchData = async () => {
    const resDoc = await fetch(`/api/documents/${documentId}`);
    if (resDoc.status === 401) return router.push('/login');
    if (resDoc.ok) {
      const d = (await resDoc.json()) as Document;
      setDoc(d);
      setEditTitle(d.title);
      setEditContent(d.content);
    }

    const resComments = await fetch(`/api/comments?targetId=${documentId}&targetType=document`);
    if (resComments.ok) {
      setComments((await resComments.json()) as Comment[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
  }, [documentId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/documents/${documentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, content: editContent }),
    });

    if (res.ok) {
      setIsEditing(false);
      void fetchData();
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId: documentId, targetType: 'document', content: newComment }),
    });

    if (res.ok) {
      setNewComment('');
      void fetchData();
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!doc) return <div className="p-8 text-center text-gray-500">Document not found.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href={`/workspaces/${workspaceId}/projects/${projectId}/documents`}
          className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex-1">Document</h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            <Edit2 className="w-4 h-4" /> Edit
          </button>
        )}
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        {isEditing ? (
          <form
            onSubmit={(e) => {
              void handleSave(e);
            }}
            className="space-y-4"
          >
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
              className="w-full px-3 py-2 text-2xl font-bold border-b border-gray-300 focus:outline-none focus:border-primary transition"
            />
            <div className="border border-gray-300 rounded-lg p-2 focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition">
              <RichTextEditor content={editContent} onChange={setEditContent} />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition font-medium"
              >
                <Save className="w-4 h-4" /> Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-bold text-gray-900">{doc.title}</h2>
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                v{doc.version}
              </span>
            </div>
            <div
              className="prose max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: doc.content }}
            />
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" /> Comments
        </h3>
        <div className="space-y-4 mb-6">
          {comments.map((c) => (
            <div key={c.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <strong className="text-gray-900">{c.author_name}</strong>
                <span className="text-xs text-gray-500">
                  {new Date(c.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-gray-700">{c.content}</p>
            </div>
          ))}
          {comments.length === 0 && <p className="text-gray-500 text-sm">Belum ada komentar.</p>}
        </div>

        <form
          onSubmit={(e) => {
            void handleAddComment(e);
          }}
          className="flex gap-4"
        >
          <input
            type="text"
            placeholder="Tulis komentar..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition font-medium"
          >
            Post
          </button>
        </form>
      </div>
    </div>
  );
}
