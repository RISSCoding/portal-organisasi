// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import RichTextEditor from '@/app/components/RichTextEditor';

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
      const c = (await resComments.json()) as Comment[];
      setComments(c);
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

  if (loading) return <p>Loading...</p>;
  if (!doc) return <p>Document not found.</p>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link
          href={`/workspaces/${workspaceId}/projects/${projectId}/documents`}
          style={{ color: 'blue' }}
        >
          &larr; Back to Documents
        </Link>
      </div>

      {isEditing ? (
        <form
          onSubmit={(e) => {
            void handleSave(e);
          }}
          style={{ marginBottom: '2rem' }}
        >
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
            style={{ padding: '0.5rem', fontSize: '1.5rem', width: '100%', marginBottom: '1rem' }}
          />
          <div style={{ marginBottom: '1rem' }}>
            <RichTextEditor content={editContent} onChange={setEditContent} />
          </div>
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              background: '#000',
              color: '#fff',
              marginRight: '1rem',
            }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            style={{ padding: '0.5rem 1rem' }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ margin: 0 }}>
              {doc.title} <span style={{ fontSize: '0.8rem', color: '#666' }}>v{doc.version}</span>
            </h1>
            <button onClick={() => setIsEditing(true)} style={{ padding: '0.5rem 1rem' }}>
              Edit
            </button>
          </div>
          <div
            dangerouslySetInnerHTML={{ __html: doc.content }}
            style={{
              padding: '1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              marginTop: '1rem',
              minHeight: '200px',
            }}
          />
        </div>
      )}

      <hr style={{ margin: '2rem 0', borderTop: '1px solid #ddd' }} />

      <h2>Comments</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {comments.map((c) => (
          <li key={c.id} style={{ borderBottom: '1px solid #eee', padding: '1rem 0' }}>
            <strong>{c.author_name}</strong>{' '}
            <span style={{ fontSize: '0.8rem', color: '#666' }}>
              {new Date(c.created_at).toLocaleString()}
            </span>
            <p style={{ margin: '0.5rem 0 0 0' }}>{c.content}</p>
          </li>
        ))}
        {comments.length === 0 && <p>No comments yet.</p>}
      </ul>

      <form
        onSubmit={(e) => {
          void handleAddComment(e);
        }}
        style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}
      >
        <input
          type="text"
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          style={{ padding: '0.5rem', flex: 1 }}
        />
        <button type="submit" style={{ padding: '0.5rem 1rem', background: '#000', color: '#fff' }}>
          Post
        </button>
      </form>
    </div>
  );
}
