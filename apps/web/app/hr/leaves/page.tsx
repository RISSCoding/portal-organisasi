// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

    if (resBal.status === 401 || resLeaves.status === 401) return router.push('/dashboard');

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
      const err = (await res.json()) as { error?: { message: string } };
      setError(err.error?.message || 'Gagal mengajukan cuti');
      return;
    }

    setStartDate('');
    setEndDate('');
    setReason('');
    void fetchData();
  };

  if (loading) return <p>Loading...</p>;

  const remainingDays = balance ? balance.total_days - balance.used_days : 0;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'blue' }}>
          &larr; Back to Dashboard
        </Link>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <h1>Pengajuan Cuti</h1>
        <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '4px' }}>
          Sisa Kuota Cuti: <strong>{remainingDays} Hari</strong>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form
        onSubmit={(e) => {
          void handleSubmit(e);
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
        <h3 style={{ margin: 0 }}>Ajukan Cuti Baru</h3>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ padding: '0.5rem', flex: 1 }}
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
            style={{ padding: '0.5rem', flex: 1 }}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            style={{ padding: '0.5rem', flex: 1 }}
          />
        </div>

        <textarea
          placeholder="Alasan Cuti"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
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
          Ajukan
        </button>
      </form>

      <h2>Riwayat Pengajuan</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
            <th style={{ padding: '0.5rem' }}>Jenis</th>
            <th style={{ padding: '0.5rem' }}>Tanggal</th>
            <th style={{ padding: '0.5rem' }}>Alasan</th>
            <th style={{ padding: '0.5rem' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {leaves.map((leave) => (
            <tr key={leave.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '0.5rem', textTransform: 'capitalize' }}>{leave.type}</td>
              <td style={{ padding: '0.5rem' }}>
                {leave.start_date} s/d {leave.end_date}
              </td>
              <td style={{ padding: '0.5rem' }}>{leave.reason}</td>
              <td style={{ padding: '0.5rem' }}>
                <span
                  style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    background:
                      leave.status === 'approved'
                        ? '#d4edda'
                        : leave.status === 'rejected'
                          ? '#f8d7da'
                          : '#fff3cd',
                    color:
                      leave.status === 'approved'
                        ? '#155724'
                        : leave.status === 'rejected'
                          ? '#721c24'
                          : '#856404',
                  }}
                >
                  {leave.status.toUpperCase()}
                </span>
              </td>
            </tr>
          ))}
          {leaves.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: '1rem', textAlign: 'center' }}>
                Belum ada pengajuan cuti.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
