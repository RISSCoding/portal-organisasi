// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface TaskResult {
  id: string;
  title: string;
  type: 'task';
  status: string;
}
interface DocResult {
  id: string;
  title: string;
  type: 'document';
  status: null;
}
type Result = TaskResult | DocResult;

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!query) {
      setResults([]);
      setLoading(false);
      return;
    }

    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((res) => {
        if (res.status === 401) {
          router.push('/login');
          return Promise.reject(new Error('Unauthorized'));
        }
        return res.json();
      })
      .then((data: { tasks: TaskResult[]; documents: DocResult[] }) => {
        setResults([...data.tasks, ...data.documents]);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mencari.');
        setLoading(false);
      });
  }, [query, router]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/dashboard" style={{ color: 'blue' }}>
          &larr; Back to Dashboard
        </Link>
      </div>
      <h1>Search Results for "{query}"</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {loading ? (
        <p>Searching...</p>
      ) : results.length === 0 ? (
        <p>No results found.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {results.map((r) => (
            <li
              key={`${r.type}-${r.id}`}
              style={{ padding: '1rem', borderBottom: '1px solid #eee' }}
            >
              <span
                style={{
                  fontSize: '0.8rem',
                  background: r.type === 'task' ? '#e3f2fd' : '#f3e5f5',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  marginRight: '1rem',
                }}
              >
                {r.type.toUpperCase()}
              </span>
              <strong>{r.title}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <SearchResults />
    </Suspense>
  );
}
