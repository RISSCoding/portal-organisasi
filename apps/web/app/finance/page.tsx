// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Wallet, Plus } from 'lucide-react';

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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [budgetName, setBudgetName] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [selectedBudget, setSelectedBudget] = useState('');

  const fetchData = async () => {
    const [resBud, resExp] = await Promise.all([
      fetch('/api/finance/budgets'),
      fetch('/api/finance/expenses/my'),
    ]);

    if (resBud.status === 401 || resExp.status === 401) return router.push('/login');
    if (resBud.ok) {
      const data = (await resBud.json()) as Budget[];
      setBudgets(
        data.map((b) => ({ ...b, amount: Number(b.amount), used_amount: Number(b.used_amount) })),
      );
    }
    if (resExp.ok) {
      const data = (await resExp.json()) as Expense[];
      setExpenses(data.map((e) => ({ ...e, amount: Number(e.amount) })));
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
      setError('Failed to create budget');
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
      setError('Failed to create expense');
      return;
    }
    setExpenseTitle('');
    setExpenseAmount('');
    void fetchData();
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Keuangan</h1>
          <p className="text-gray-500 text-sm">Kelola anggaran dan pengeluaran.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" /> Buat Anggaran
          </h2>
          <form
            onSubmit={(e) => {
              void handleCreateBudget(e);
            }}
            className="space-y-4"
          >
            <input
              type="text"
              placeholder="Nama Anggaran"
              value={budgetName}
              onChange={(e) => setBudgetName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none transition"
            />
            <input
              type="number"
              placeholder="Jumlah (Rp)"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none transition"
            />
            <button
              type="submit"
              className="w-full py-2 bg-primary text-white rounded-lg hover:opacity-90 transition font-medium"
            >
              Simpan
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" /> Ajukan Pengeluaran
          </h2>
          <form
            onSubmit={(e) => {
              void handleCreateExpense(e);
            }}
            className="space-y-4"
          >
            <input
              type="text"
              placeholder="Judul Pengeluaran"
              value={expenseTitle}
              onChange={(e) => setExpenseTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none transition"
            />
            <input
              type="number"
              placeholder="Jumlah (Rp)"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none transition"
            />
            <select
              value={selectedBudget}
              onChange={(e) => setSelectedBudget(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none transition"
            >
              <option value="">(Tanpa Anggaran)</option>
              {budgets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="w-full py-2 bg-primary text-white rounded-lg hover:opacity-90 transition font-medium"
            >
              Ajukan
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Daftar Anggaran</h2>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 text-sm">
            <tr>
              <th className="px-6 py-3 font-medium">Nama</th>
              <th className="px-6 py-3 font-medium">Total (Rp)</th>
              <th className="px-6 py-3 font-medium">Terpakai (Rp)</th>
              <th className="px-6 py-3 font-medium">Sisa (Rp)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {budgets.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 font-medium text-gray-900">{b.name}</td>
                <td className="px-6 py-4 text-gray-700">{b.amount.toLocaleString()}</td>
                <td className="px-6 py-4 text-gray-700">{b.used_amount.toLocaleString()}</td>
                <td className="px-6 py-4 font-medium text-green-600">
                  {(b.amount - b.used_amount).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Riwayat Pengeluaran Saya</h2>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 text-sm">
            <tr>
              <th className="px-6 py-3 font-medium">Judul</th>
              <th className="px-6 py-3 font-medium">Anggaran</th>
              <th className="px-6 py-3 font-medium">Jumlah (Rp)</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {expenses.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 font-medium text-gray-900">{e.title}</td>
                <td className="px-6 py-4 text-gray-700">{e.budget_name || '-'}</td>
                <td className="px-6 py-4 text-gray-700">{e.amount.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      e.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : e.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {e.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
