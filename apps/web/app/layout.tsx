// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect } from 'react';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem('portal_primary_color');
    if (saved) {
      document.documentElement.style.setProperty('--primary-color', saved);
    }
  }, []);

  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
