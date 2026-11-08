// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Budget {
  id: string;
  name: string;
  amount: number;
  used_amount: number;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  status: string;
  budget_name?: string;
}

export default function FinancePage() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [budgetName, setBudgetName] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');

  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [selectedBudget, setSelectedBudget] = useState('');

  const [error, setError] = useState('');

  const fetchData = async () => {
    const [resBud, resExp] = await Promise.all([
      fetch('/api/finance/budgets'),
      fetch('/api/finance/expenses/my'),
    ]);

    if (resBud.status === 401 || resExp.status === 401) return router.push('/login');

    if (resBud.ok) {
      const budData = (await resBud.json()) as Budget[];
      // Pastikan amount dan used_amount menjadi Number
      setBudgets(
        budData.map((b) => ({
          ...b,
          amount: Number(b.amount),
          used_amount: Number(b.used_amount),
        })),
      );
    }
    if (resExp.ok) {
      const expData = (await resExp.json()) as Expense[];
      setExpenses(
        expData.map((e) => ({
          ...e,
          amount: Number(e.amount),
        })),
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/finance/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: budgetName, amount: parseFloat(budgetAmount) }),
    });

    if (!res.ok) {
      const err = (await res.json()) as { error?: { message: string } };
      setError(err.error?.message || 'Failed to create budget');
      return;
    }
    setBudgetName('');
    setBudgetAmount('');
    void fetchData();
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/finance/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: expenseTitle,
        amount: parseFloat(expenseAmount),
        budgetId: selectedBudget || undefined,
      }),
    });

    if (!res.ok) {
      const err = (await res.json()) as { error?: { message: string } };
      setError(err.error?.message || 'Failed to create expense');
      return;
    }
    setExpenseTitle('');
    setExpenseAmount('');
    void fetchData();
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'blue' }}>
          &larr; Back to Dashboard
        </Link>
      </div>
      <h1>Keuangan</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
        <form
          onSubmit={(e) => {
            void handleCreateBudget(e);
          }}
          style={{ flex: 1, border: '1px solid #ddd', padding: '1rem', borderRadius: '4px' }}
        >
          <h3>Buat Anggaran Baru</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Nama Anggaran"
              value={budgetName}
              onChange={(e) => setBudgetName(e.target.value)}
              required
              style={{ padding: '0.5rem' }}
            />
            <input
              type="number"
              placeholder="Jumlah (Rp)"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              required
              style={{ padding: '0.5rem' }}
            />
            <button type="submit" style={{ padding: '0.5rem', background: '#000', color: '#fff' }}>
              Simpan
            </button>
          </div>
        </form>

        <form
          onSubmit={(e) => {
            void handleCreateExpense(e);
          }}
          style={{ flex: 1, border: '1px solid #ddd', padding: '1rem', borderRadius: '4px' }}
        >
          <h3>Ajukan Pengeluaran</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Judul Pengeluaran"
              value={expenseTitle}
              onChange={(e) => setExpenseTitle(e.target.value)}
              required
              style={{ padding: '0.5rem' }}
            />
            <input
              type="number"
              placeholder="Jumlah (Rp)"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              required
              style={{ padding: '0.5rem' }}
            />
            <select
              value={selectedBudget}
              onChange={(e) => setSelectedBudget(e.target.value)}
              style={{ padding: '0.5rem' }}
            >
              <option value="">(Tanpa Anggaran)</option>
              {budgets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button type="submit" style={{ padding: '0.5rem', background: '#000', color: '#fff' }}>
              Ajukan
            </button>
          </div>
        </form>
      </div>

      <h2>Daftar Anggaran</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
            <th style={{ padding: '0.5rem' }}>Nama</th>
            <th style={{ padding: '0.5rem' }}>Total (Rp)</th>
            <th style={{ padding: '0.5rem' }}>Terpakai (Rp)</th>
            <th style={{ padding: '0.5rem' }}>Sisa (Rp)</th>
          </tr>
        </thead>
        <tbody>
          {budgets.map((b) => (
            <tr key={b.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '0.5rem' }}>{b.name}</td>
              <td style={{ padding: '0.5rem' }}>{b.amount.toLocaleString()}</td>
              <td style={{ padding: '0.5rem' }}>{b.used_amount.toLocaleString()}</td>
              <td style={{ padding: '0.5rem' }}>{(b.amount - b.used_amount).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Riwayat Pengeluaran Saya</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
            <th style={{ padding: '0.5rem' }}>Judul</th>
            <th style={{ padding: '0.5rem' }}>Anggaran</th>
            <th style={{ padding: '0.5rem' }}>Jumlah (Rp)</th>
            <th style={{ padding: '0.5rem' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => (
            <tr key={e.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '0.5rem' }}>{e.title}</td>
              <td style={{ padding: '0.5rem' }}>{e.budget_name || '-'}</td>
              <td style={{ padding: '0.5rem' }}>{e.amount.toLocaleString()}</td>
              <td style={{ padding: '0.5rem' }}>
                <span
                  style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    background:
                      e.status === 'approved'
                        ? '#d4edda'
                        : e.status === 'rejected'
                          ? '#f8d7da'
                          : '#fff3cd',
                    color:
                      e.status === 'approved'
                        ? '#155724'
                        : e.status === 'rejected'
                          ? '#721c24'
                          : '#856404',
                  }}
                >
                  {e.status.toUpperCase()}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
