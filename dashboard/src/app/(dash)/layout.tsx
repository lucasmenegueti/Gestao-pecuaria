import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { Sidebar } from '@/components/sidebar';
import { readSessionOptions, type SessionData } from '@/lib/auth/session';
import { contarEntradasSemPreco } from '@/lib/precos';

export default async function DashLayout({ children }: { children: ReactNode }) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    readSessionOptions(),
  );
  // Badge de "tem compra sem preço" no menu. Falha aqui não pode derrubar o
  // dashboard inteiro — sem o número, o menu só não mostra o aviso.
  const pendenciasPreco = session.accessToken
    ? await contarEntradasSemPreco(session.accessToken).catch(() => 0)
    : 0;

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar
        username={session.username ?? '—'}
        role={session.role ?? 'gestor'}
        pendenciasPreco={pendenciasPreco}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
