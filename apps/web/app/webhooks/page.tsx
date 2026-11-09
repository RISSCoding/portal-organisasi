// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

const AVAILABLE_EVENTS = [
  { id: 'task.created', label: 'Task Dibuat' },
  { id: 'task.updated', label: 'Task Diperbarui' },
  { id: 'member.joined', label: 'Anggota Bergabung' },
  { id: 'expense.approved', label: 'Pengeluaran Disetujui' },
];

export default function WebhooksPage() {
  const router = useRouter();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newSecret, setNewSecret] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const fetchData = async () => {
    const res = await fetch('/api/webhooks');
    if (res.status === 401) return router.push('/login');
    if (res.ok) {
      setWebhooks((await res.json()) as Webhook[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNewSecret(null);

    if (selectedEvents.length === 0) {
      setError('Pilih minimal satu event.');
      return;
    }

    const res = await fetch('/api/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url, events: selectedEvents }),
    });

    if (!res.ok) {
      const err = (await res.json()) as { error?: { message: string } };
      setError(err.error?.message || 'Gagal membuat webhook');
      return;
    }

    const data = (await res.json()) as { secret: string };
    setNewSecret(data.secret);
    setName('');
    setUrl('');
    setSelectedEvents([]);
    void fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus webhook ini?')) return;
    await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
    void fetchData();
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId],
    );
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'blue' }}>
          &larr; Back to Dashboard
        </Link>
      </div>
      <h1>Webhooks</h1>
      <p>Terima notifikasi real-time saat ada aktivitas di organisasi Anda.</p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {newSecret && (
        <div
          style={{
            background: '#d4edda',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '2rem',
          }}
        >
          <h3 style={{ marginTop: 0, color: '#155724' }}>Webhook Berhasil Dibuat!</h3>
          <p style={{ color: '#155724' }}>
            Gunakan Secret ini untuk memverifikasi signature (<code>X-Portal-Signature</code>) dari
            setiap request.
          </p>
          <code
            style={{
              display: 'block',
              padding: '1rem',
              background: 'white',
              border: '1px solid #c3e6cb',
              borderRadius: '4px',
              wordBreak: 'break-all',
            }}
          >
            {newSecret}
          </code>
        </div>
      )}

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
        <h3 style={{ margin: 0 }}>Buat Webhook Baru</h3>
        <input
          type="text"
          placeholder="Nama Webhook (misal: Slack Notification)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ padding: '0.5rem' }}
        />
        <input
          type="url"
          placeholder="https://example.com/webhook"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          style={{ padding: '0.5rem' }}
        />

        <div>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Pilih Events:</p>
          {AVAILABLE_EVENTS.map((ev) => (
            <label key={ev.id} style={{ display: 'block', marginBottom: '0.25rem' }}>
              <input
                type="checkbox"
                checked={selectedEvents.includes(ev.id)}
                onChange={() => toggleEvent(ev.id)}
                style={{ marginRight: '0.5rem' }}
              />
              {ev.label} <code style={{ fontSize: '0.8rem', color: '#666' }}>({ev.id})</code>
            </label>
          ))}
        </div>

        <button
          type="submit"
          style={{
            padding: '0.5rem 1rem',
            background: '#000',
            color: '#fff',
            alignSelf: 'flex-start',
          }}
        >
          Buat Webhook
        </button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
            <th style={{ padding: '0.5rem' }}>Nama</th>
            <th style={{ padding: '0.5rem' }}>URL</th>
            <th style={{ padding: '0.5rem' }}>Events</th>
            <th style={{ padding: '0.5rem' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {webhooks.map((wh) => (
            <tr key={wh.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '0.5rem' }}>{wh.name}</td>
              <td
                style={{
                  padding: '0.5rem',
                  fontSize: '0.8rem',
                  maxWidth: '200px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {wh.url}
              </td>
              <td style={{ padding: '0.5rem', fontSize: '0.8rem' }}>{wh.events.join(', ')}</td>
              <td style={{ padding: '0.5rem' }}>
                <button
                  onClick={() => {
                    void handleDelete(wh.id);
                  }}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Hapus
                </button>
              </td>
            </tr>
          ))}
          {webhooks.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: '1rem', textAlign: 'center' }}>
                Belum ada webhook.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
