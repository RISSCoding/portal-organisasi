// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import Link from 'next/link';
import {
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  KanbanSquare,
  FileText,
  CheckSquare,
  Wallet,
  Webhook,
  Search,
  Users,
  Layers,
} from 'lucide-react';

const GITHUB_URL = 'https://github.com/RISSCoding/portal-organisasi';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Hard Multi-Tenancy',
    description:
      'PostgreSQL Row-Level Security enforces strict tenant isolation at the database layer. Cross-tenant leaks are structurally impossible.',
  },
  {
    icon: KanbanSquare,
    title: 'Kanban & Subtasks',
    description:
      'Drag-and-drop boards with subtasks, priorities, and statuses. Track work in real time across every project.',
  },
  {
    icon: FileText,
    title: 'Rich Documents',
    description:
      'TipTap-powered editor with automatic version bumping. Collaborate on specs, meeting notes, and your knowledge base.',
  },
  {
    icon: CheckSquare,
    title: 'Approval Workflows',
    description:
      'Multi-level approval chains with role-based permissions. Automate review cycles for HR, Finance, and operations.',
  },
  {
    icon: Wallet,
    title: 'HR & Finance',
    description:
      'Leave requests, budgets, and expenses — first-class modules, not afterthoughts. Built for real organizational workflows.',
  },
  {
    icon: Webhook,
    title: 'API Keys & Webhooks',
    description:
      'Integrate with your stack via Bearer tokens and HMAC-SHA256 signed webhooks. Automate anything that matters.',
  },
  {
    icon: Search,
    title: 'Full-Text Search',
    description:
      'PostgreSQL tsvector-powered search across tasks and documents. Fast, tenant-isolated, no external indexer required.',
  },
  {
    icon: Users,
    title: 'Domain Auto-Join',
    description:
      'Let teammates join automatically via verified email domains, or send a signed invitation link — your call.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-gray-900">
            <Layers className="w-6 h-6 text-primary" aria-hidden="true" />
            <span>Portal Organisasi</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-700">
            <Link href="#features" className="hover:text-primary transition">
              Features
            </Link>
            <Link href="/login" className="hover:text-primary transition">
              Sign in
            </Link>
          </nav>
          <Link
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            <span>GitHub</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 py-24 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-3 py-1 text-xs font-semibold text-primary bg-primary/10 rounded-full mb-6">
            Open-source · AGPLv3 · Self-hostable
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 tracking-tight mb-6">
            The workspace your <span className="text-primary">organization</span> actually needs.
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Multi-tenant, self-hostable, and built for real work — Kanban, documents, approval
            workflows, HR, and Finance in one platform. Powered by PostgreSQL Row-Level Security.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
              <span>Star on GitHub</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-24 bg-white border-y border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything your org needs. Nothing it doesn&apos;t.
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Feature-complete out of the box, extensible when you need it.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="p-6 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary/30 hover:shadow-sm transition"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Layers className="w-5 h-5 text-primary" aria-hidden="true" />
            <span>© {new Date().getFullYear()} Portal Organisasi · AGPL-3.0-or-later</span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium text-gray-700">
            <Link
              href={`${GITHUB_URL}/blob/main/docs/self-hosting.md`}
              className="hover:text-primary transition"
            >
              Self-Hosting
            </Link>
            <Link
              href={`${GITHUB_URL}/blob/main/ARCHITECTURE.md`}
              className="hover:text-primary transition"
            >
              Architecture
            </Link>
            <Link
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition"
            >
              GitHub
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
