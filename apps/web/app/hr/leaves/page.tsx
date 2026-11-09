// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Plus } from 'lucide-react';

interface Balance {
  total_days: number;
  used_days: number;
}

interface Leave {
  id: string;
  type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
}

export default function LeavesPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const fetchData = async () => {
    const [resBal, resLeaves] = await Promise.all([
      fetch('/api/hr/leaves/balance'),
      fetch('/api/hr/leaves/my'),
    ]);
    if (resBal.status === 401 || resLeaves.status === 401) return router.push('/login');
    if (resBal.ok) setBalance((await resBal.json()) as Balance);
    if (resLeaves.ok) setLeaves((await resLeaves.json()) as Leave[]);
    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/hr/leaves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, startDate, endDate, reason }),
    });
    if (!res.ok) {
      setError('Gagal mengajukan cuti');
      return;
    }
    setStartDate('');
    setEndDate('');
    setReason('');
    void fetchData();
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  const remainingDays = balance ? balance.total_days - balance.used_days : 0;

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
          <h1 className="text-2xl font-bold text-gray-900">Pengajuan Cuti</h1>
          <p className="text-gray-500 text-sm">Kelola cuti dan izin Anda.</p>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 p-6 rounded-xl flex items-center justify-between">
        <div>
          <p className="text-primary font-medium">Sisa Kuota Cuti</p>
          <h2 className="text-3xl font-bold text-primary">{remainingDays} Hari</h2>
        </div>
        <Calendar className="w-12 h-12 text-primary/50" />
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" /> Ajukan Cuti Baru
        </h2>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none transition"
            >
              <option value="annual">Cuti Tahunan</option>
              <option value="sick">Sakit</option>
              <option value="urgent">Keperluan Mendesak</option>
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none transition"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none transition"
            />
          </div>
          <textarea
            placeholder="Alasan Cuti"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none transition"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition font-medium"
          >
            Ajukan
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Riwayat Pengajuan</h2>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 text-sm">
            <tr>
              <th className="px-6 py-3 font-medium">Jenis</th>
              <th className="px-6 py-3 font-medium">Tanggal</th>
              <th className="px-6 py-3 font-medium">Alasan</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leaves.map((leave) => (
              <tr key={leave.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 font-medium capitalize">{leave.type}</td>
                <td className="px-6 py-4 text-gray-700">
                  {leave.start_date} s/d {leave.end_date}
                </td>
                <td className="px-6 py-4 text-gray-700">{leave.reason}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      leave.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : leave.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {leave.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
            {leaves.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  Belum ada pengajuan cuti.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
