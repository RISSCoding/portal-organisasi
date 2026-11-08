// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Notification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    const res = await fetch('/api/notifications');
    if (res.status === 401) return router.push('/login');
    if (res.ok) {
      const data = (await res.json()) as Notification[];
      setNotifications(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchNotifications();
  }, []);

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'PATCH' });
    void fetchNotifications();
  };

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    void fetchNotifications();
  };

  if (loading) return <p>Loading...</p>;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'blue' }}>
          &larr; Back to Dashboard
        </Link>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>
          Notifications{' '}
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: '1rem',
                background: 'red',
                color: 'white',
                padding: '0.2rem 0.5rem',
                borderRadius: '50%',
              }}
            >
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={() => {
              void markAllRead();
            }}
            style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            Mark all as read
          </button>
        )}
      </div>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {notifications.map((n) => (
          <li
            key={n.id}
            style={{
              border: '1px solid #ddd',
              padding: '1rem',
              marginBottom: '0.5rem',
              borderRadius: '4px',
              background: n.is_read ? '#fff' : '#f0f8ff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{n.title}</strong>
              <span style={{ fontSize: '0.8rem', color: '#666' }}>
                {new Date(n.created_at).toLocaleString()}
              </span>
            </div>
            <p style={{ margin: '0.5rem 0' }}>{n.body}</p>
            {!n.is_read && (
              <button
                onClick={() => {
                  void markRead(n.id);
                }}
                style={{ fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Mark as read
              </button>
            )}
          </li>
        ))}
        {notifications.length === 0 && <p>No notifications yet.</p>}
      </ul>
    </div>
  );
}
