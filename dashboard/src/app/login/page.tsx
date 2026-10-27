import Image from 'next/image';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { from } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-nsa-cream px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center gap-5 text-center">
          <Image
            src="/logo-nsa-green.png"
            alt="Fazenda NSA"
            width={192}
            height={192}
            priority
            className="h-48 w-48"
          />
          <div>
            <div
              className="font-serif text-[13px] font-medium uppercase text-fg"
              style={{ letterSpacing: '0.22em' }}
            >
              Pecuária NSA
            </div>
            <div className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-fg-muted">
              Fazenda Nossa Senhora Aparecida · Gestão de campo
            </div>
          </div>
        </div>

        <LoginForm from={from ?? ''} />

        <p className="mt-10 text-center font-mono text-[11px] text-fg-subtle">
          Dashboard privado · acesso controlado
        </p>
      </div>
    </main>
  );
}
