// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from 'next';
import LandingPage from './components/LandingPage';

export const metadata: Metadata = {
  title: 'Portal Organisasi — Open-source multi-tenant workspace platform',
  description:
    'Self-hostable workspace platform for modern organizations. Hard multi-tenant isolation via PostgreSQL Row-Level Security, Kanban, rich documents, approval workflows, HR and Finance modules — all in one AGPLv3-licensed platform.',
  keywords: [
    'multi-tenant',
    'self-hosted',
    'workspace',
    'project management',
    'kanban',
    'AGPLv3',
    'PostgreSQL',
    'RLS',
  ],
  openGraph: {
    title: 'Portal Organisasi',
    description:
      'Open-source, self-hostable workspace platform for modern organizations. Powered by PostgreSQL RLS.',
    type: 'website',
  },
};

export default function Home() {
  return <LandingPage />;
}
