// SPDX-License-Identifier: AGPL-3.0-or-later
export const metadata = { title: 'Portal Organisasi' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>{children}</body>
    </html>
  );
}
