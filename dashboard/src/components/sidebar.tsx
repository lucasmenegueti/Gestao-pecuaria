'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  Beef,
  ClipboardCheck,
  Grid2x2,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Package,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useState } from 'react';

interface NavItemDef {
  href: string;
  label: string;
  icon: typeof BarChart3;
  group?: string;
}

const NAV: ReadonlyArray<NavItemDef> = [
  { href: '/visao-geral', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/talhoes', label: 'Talhões', icon: Grid2x2, group: 'Pecuária' },
  { href: '/mapa', label: 'Mapa', icon: Map, group: 'Pecuária' },
  { href: '/rebanho', label: 'Rebanho', icon: Beef, group: 'Pecuária' },
  { href: '/estoque', label: 'Estoque', icon: Package, group: 'Pecuária' },
  { href: '/equipe', label: 'Equipe', icon: Users, group: 'Operação' },
  { href: '/alertas', label: 'Alertas', icon: AlertTriangle, group: 'Operação' },
  { href: '/inspecoes', label: 'Inspeções', icon: ClipboardCheck, group: 'Operação' },
];

interface Props {
  username: string;
  role: 'owner' | 'gestor';
}

export function Sidebar({ username, role }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const hrefWithQuery = (href: string): string => (qs ? `${href}?${qs}` : href);

  const displayName = username.charAt(0).toUpperCase() + username.slice(1);
  const displayRole = role === 'owner' ? 'Owner' : 'Gestor';

  // Agrupa itens por section
  const groups: Array<{ name: string | null; items: NavItemDef[] }> = [];
  for (const item of NAV) {
    const groupName = item.group ?? null;
    const last = groups[groups.length - 1];
    if (last && last.name === groupName) last.items.push(item);
    else groups.push({ name: groupName, items: [item] });
  }

  return (
    <>
      <header
        className="sticky top-0 z-30 flex items-center gap-3 bg-nsa-green-800 px-4 text-fg-inverse md:hidden"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex h-14 w-full items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            className="-ml-1 rounded-md p-1.5 transition-colors hover:bg-fg-inverse/10"
          >
            <Menu size={22} strokeWidth={1.75} />
          </button>
          <div className="flex items-baseline gap-1.5">
            <span
              className="font-serif text-[14px] leading-none"
              style={{ letterSpacing: '0.14em' }}
            >
              N.S.A
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-fg-inverse/60">
              · Pecuária
            </span>
          </div>
        </div>
      </header>

      {open ? (
        <button
          type="button"
          onClick={close}
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      ) : null}

      <aside
        className={
          'fixed left-0 top-0 z-50 flex h-dvh w-[232px] flex-shrink-0 flex-col bg-nsa-green-800 text-fg-inverse transition-transform duration-200 md:sticky md:top-0 md:translate-x-0 ' +
          (open ? 'translate-x-0' : '-translate-x-full')
        }
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-center gap-2.5 border-b border-fg-inverse/10 px-5 pb-5 pt-5">
          <Image
            src="/logo-nsa-cream.png"
            alt="Fazenda NSA"
            width={28}
            height={28}
            priority
            className="h-7 w-auto"
          />
          <div>
            <div
              className="font-serif text-[14px] leading-none"
              style={{ letterSpacing: '0.14em' }}
            >
              N.S.A
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-fg-inverse/60">
              fazenda · pecuária
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar menu"
            className="ml-auto rounded-md p-1.5 text-fg-inverse/75 transition-colors hover:bg-fg-inverse/10 hover:text-fg-inverse md:hidden"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {groups.map((g, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-3' : ''}>
              {g.name ? (
                <div className="px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[0.12em] text-fg-inverse/45">
                  {g.name}
                </div>
              ) : null}
              <ul className="flex flex-col gap-0.5">
                {g.items.map((item) => (
                  <NavItem
                    key={item.href}
                    def={item}
                    href={hrefWithQuery(item.href)}
                    active={pathname === item.href}
                    onNavigate={close}
                  />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t border-fg-inverse/10 px-3 py-3">
          <ul className="flex flex-col gap-0.5">
            <li>
              <a
                href="/api/logout"
                onClick={close}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-fg-inverse/75 transition-colors hover:bg-fg-inverse/5 hover:text-fg-inverse"
              >
                <LogOut size={16} strokeWidth={1.75} className="shrink-0" />
                <span>Sair</span>
              </a>
            </li>
          </ul>
          <div className="mt-3 flex items-center gap-2.5 border-t border-fg-inverse/10 px-2 pt-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-nsa-green-500 text-[11px] font-semibold text-fg-inverse">
              {displayName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{displayName}</div>
              <div className="text-[11px] text-fg-inverse/60">{displayRole}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function NavItem({
  def,
  href,
  active,
  onNavigate,
}: {
  def: NavItemDef;
  href: string;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = def.icon;
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        className={
          'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors ' +
          (active
            ? 'bg-fg-inverse/10 text-fg-inverse'
            : 'text-fg-inverse/75 hover:bg-fg-inverse/5 hover:text-fg-inverse')
        }
      >
        <Icon size={16} strokeWidth={1.75} className="shrink-0" />
        <span>{def.label}</span>
      </Link>
    </li>
  );
}
