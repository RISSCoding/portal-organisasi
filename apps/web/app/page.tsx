// SPDX-License-Identifier: AGPL-3.0-or-later
import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <h1>Portal Organisasi</h1>
      <p>Welcome to Phase 0 foundation.</p>
      <Link
        href="/login"
        style={{
          display: 'inline-block',
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          background: '#000',
          color: '#fff',
          textDecoration: 'none',
        }}
      >
        Go to Login
      </Link>
    </div>
  );
}
