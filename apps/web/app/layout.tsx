// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [primaryColor, setPrimaryColor] = useState('#000000');

  useEffect(() => {
    const saved = localStorage.getItem('portal_primary_color');
    if (saved) setPrimaryColor(saved);
  }, []);

  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <style>{`
          :root {
            --primary-color: ${primaryColor};
          }
        `}</style>
        {children}
      </body>
    </html>
  );
}
