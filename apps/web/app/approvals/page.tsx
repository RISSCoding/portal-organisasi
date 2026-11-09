// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, FileCheck } from 'lucide-react';

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
    if (res.ok) setRequests((await res.json()) as ApprovalRequest[]);
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
      setError('Failed to create request');
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
    if (res.ok) void fetchRequests();
    else alert('Gagal. Hanya owner/admin yang bisa approve.');
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approval Requests</h1>
          <p className="text-gray-500 text-sm">Kelola persetujuan dokumen dan pengajuan.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-primary" /> Buat Request Baru
        </h2>
        <form
          onSubmit={(e) => {
            void handleCreate(e);
          }}
          className="space-y-4"
        >
          <input
            type="text"
            placeholder="Request Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none transition"
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none transition"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition font-medium"
          >
            Submit Request
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        {requests.map((req) => (
          <div
            key={req.id}
            className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <h3 className="font-bold text-gray-900">{req.title}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(req.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  req.status === 'approved'
                    ? 'bg-green-100 text-green-700'
                    : req.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {req.status.toUpperCase()}
              </span>
              {req.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      void handleAction(req.id, 'approve');
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition text-sm font-medium"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => {
                      void handleAction(req.id, 'reject');
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {requests.length === 0 && (
          <div className="p-8 text-center text-gray-500">Belum ada request.</div>
        )}
      </div>
    </div>
  );
}
