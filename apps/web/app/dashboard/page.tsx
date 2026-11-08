// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Org {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeOrg, setActiveOrg] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/organizations/me')
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(async (data: Org[]) => {
        setOrgs(data);
        if (data.length > 0 && data[0]) {
          const switchRes = await fetch('/api/auth/switch-org', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orgId: data[0].id }),
          });
          if (switchRes.ok) {
            setActiveOrg(data[0].id);
          } else {
            setError('Failed to activate organization. Please refresh.');
          }
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const switchOrg = async (orgId: string) => {
    const res = await fetch('/api/auth/switch-org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId }),
    });
    if (res.ok) {
      setActiveOrg(orgId);
      setError('');
    } else {
      setError('Failed to switch organization');
    }
  };

  return (
    <div>
      <h1>Dashboard</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <Link
          href="/workspaces"
          style={{
            padding: '0.5rem 1rem',
            background: '#000',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '4px',
          }}
        >
          Workspaces
        </Link>
        <Link
          href="/approvals"
          style={{
            padding: '0.5rem 1rem',
            background: '#000',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '4px',
          }}
        >
          Approvals
        </Link>
        <Link
          href="/notifications"
          style={{
            padding: '0.5rem 1rem',
            background: '#000',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '4px',
          }}
        >
          Notifications
        </Link>
      </div>

      <h2>Your Organizations</h2>
      <ul>
        {orgs.map((org) => (
          <li key={org.id} style={{ marginBottom: '0.5rem' }}>
            <strong>{org.name}</strong> ({org.role})
            {activeOrg === org.id ? (
              <span style={{ color: 'green', marginLeft: '1rem' }}>[Active]</span>
            ) : (
              <button
                onClick={() => {
                  void switchOrg(org.id);
                }}
                style={{ marginLeft: '1rem', cursor: 'pointer' }}
              >
                Switch
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
