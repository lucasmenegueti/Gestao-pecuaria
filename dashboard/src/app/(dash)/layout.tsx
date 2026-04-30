import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { Sidebar } from '@/components/sidebar';
import { readSessionOptions, type SessionData } from '@/lib/auth/session';

export default async function DashLayout({ children }: { children: ReactNode }) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    readSessionOptions(),
  );
  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar username={session.username ?? '—'} role={session.role ?? 'gestor'} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
