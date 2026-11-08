// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ApprovalRequest {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export default function ApprovalsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    const res = await fetch('/api/approvals');
    if (res.status === 401) return router.push('/login');
    if (res.ok) {
      const data = (await res.json()) as ApprovalRequest[];
      setRequests(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchRequests();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    });

    if (!res.ok) {
      const err = (await res.json()) as { error?: { message?: string } };
      setError(err.error?.message || 'Failed to create request');
      return;
    }

    setTitle('');
    setDescription('');
    void fetchRequests();
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    const res = await fetch(`/api/approvals/${id}/act`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });

    if (res.ok) {
      void fetchRequests();
    } else {
      alert('Failed to perform action. Only owner/admin can approve.');
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'blue' }}>
          &larr; Back to Dashboard
        </Link>
      </div>
      <h1>Approval Requests</h1>

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
        <h3 style={{ margin: 0 }}>New Request</h3>
        <input
          type="text"
          placeholder="Request Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ padding: '0.5rem' }}
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
          style={{ padding: '0.5rem' }}
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
          Submit Request
        </button>
      </form>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {requests.map((req) => (
          <li
            key={req.id}
            style={{
              border: '1px solid #ddd',
              padding: '1rem',
              marginBottom: '0.5rem',
              borderRadius: '4px',
            }}
          >
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
            >
              <div>
                <h3 style={{ margin: 0 }}>{req.title}</h3>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                  {new Date(req.created_at).toLocaleString()}
                </span>
              </div>
              <span
                style={{
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  background:
                    req.status === 'approved'
                      ? '#d4edda'
                      : req.status === 'rejected'
                        ? '#f8d7da'
                        : '#fff3cd',
                  color:
                    req.status === 'approved'
                      ? '#155724'
                      : req.status === 'rejected'
                        ? '#721c24'
                        : '#856404',
                }}
              >
                {req.status.toUpperCase()}
              </span>
            </div>
            {req.status === 'pending' && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    void handleAction(req.id, 'approve');
                  }}
                  style={{
                    padding: '0.3rem 0.8rem',
                    background: 'green',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    void handleAction(req.id, 'reject');
                  }}
                  style={{
                    padding: '0.3rem 0.8rem',
                    background: 'red',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Reject
                </button>
              </div>
            )}
          </li>
        ))}
        {requests.length === 0 && <p>No approval requests yet.</p>}
      </ul>
    </div>
  );
}
