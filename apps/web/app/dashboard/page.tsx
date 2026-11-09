// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  CheckSquare,
  Wallet,
  Bell,
  Key,
  Webhook,
  Globe,
  Settings,
  Search,
  Calendar,
} from 'lucide-react';

interface Org {
  id: string;
  name: string;
  slug: string;
  role: string;
}

const MENU_ITEMS = [
  { href: '/workspaces', label: 'Workspaces', icon: LayoutDashboard },
  { href: '/hr/leaves', label: 'HR (Cuti)', icon: Calendar },
  { href: '/finance', label: 'Keuangan', icon: Wallet },
  { href: '/approvals', label: 'Approvals', icon: CheckSquare },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/api-keys', label: 'API Keys', icon: Key },
  { href: '/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/domains', label: 'Domains', icon: Globe },
  { href: '/settings/organization', label: 'Pengaturan', icon: Settings },
];

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
          if (switchRes.ok) setActiveOrg(data[0].id);
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
    if (searchQuery.trim()) router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Kelola organisasi Anda di satu tempat.</p>
        </div>
        <form onSubmit={handleSearch} className="relative w-full md:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari tasks, documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {MENU_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-primary hover:shadow-md transition group"
          >
            <item.icon className="w-6 h-6 text-gray-500 group-hover:text-primary mb-2 transition" />
            <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition">
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Organizations</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {orgs.map((org) => (
            <div key={org.id} className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{org.name}</h3>
                <p className="text-sm text-gray-500">{org.role}</p>
              </div>
              {activeOrg === org.id ? (
                <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
                  Active
                </span>
              ) : (
                <button
                  onClick={() => {
                    void switchOrg(org.id);
                  }}
                  className="px-4 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition"
                >
                  Switch
                </button>
              )}
            </div>
          ))}
          {orgs.length === 0 && (
            <div className="p-8 text-center text-gray-500">Belum ada organisasi.</div>
          )}
        </div>
      </div>
    </div>
  );
}
