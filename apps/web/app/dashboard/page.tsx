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
  const [searchQuery, setSearchQuery] = useState('');

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
          }
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const switchOrg = async (orgId: string) => {
    await fetch('/api/auth/switch-org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId }),
    });
    setActiveOrg(orgId);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const btnStyle = {
    padding: '0.5rem 1rem',
    background: '#000',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '4px',
  };

  return (
    <div>
      <h1>Dashboard</h1>

      <form
        onSubmit={handleSearch}
        style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', maxWidth: '400px' }}
      >
        <input
          type="text"
          placeholder="Search tasks, documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '0.5rem', flex: 1, borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button
          type="submit"
          style={{
            padding: '0.5rem 1rem',
            background: '#000',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Search
        </button>
      </form>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <Link href="/workspaces" style={btnStyle}>
          Workspaces
        </Link>
        <Link href="/hr/leaves" style={btnStyle}>
          HR (Cuti)
        </Link>
        <Link href="/finance" style={btnStyle}>
          Keuangan
        </Link>
        <Link href="/approvals" style={btnStyle}>
          Approvals
        </Link>
        <Link href="/notifications" style={btnStyle}>
          Notifications
        </Link>
        <Link href="/api-keys" style={btnStyle}>
          API Keys
        </Link>
        <Link href="/webhooks" style={btnStyle}>
          Webhooks
        </Link>
        <Link href="/domains" style={btnStyle}>
          Domains
        </Link>
        <Link href="/settings/organization" style={btnStyle}>
          Pengaturan
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
