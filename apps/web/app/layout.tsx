// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [primaryColor, setPrimaryColor] = useState('#000000');

  useEffect(() => {
    const saved = localStorage.getItem('portal_primary_color');
    if (saved) setPrimaryColor(saved);
  }, []);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
        <style>{`
          :root {
            --primary-color: ${primaryColor};
          }
          .btn-primary {
            background-color: var(--primary-color);
          }
        `}</style>
        {children}
      </body>
    </html>
  );
}
