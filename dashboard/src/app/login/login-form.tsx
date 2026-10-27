'use client';

import { LogIn, Check } from 'lucide-react';
import { useActionState } from 'react';
import { loginAction, type LoginState } from './actions';

const initialState: LoginState = {};

export function LoginForm({ from }: { from: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <input type="hidden" name="from" value={from} />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="username"
          className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted"
        >
          Usuário
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoFocus
          required
          defaultValue={state.username}
          placeholder="seu.nome"
          className="rounded-md border border-border-strong bg-bg-elevated px-3 py-2.5 text-body text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted"
        >
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-border-strong bg-bg-elevated px-3 py-2.5 text-body text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <label className="group mb-1 mt-1 flex cursor-pointer select-none items-center gap-2.5 text-small text-fg-muted">
        <input type="checkbox" name="remember" defaultChecked className="sr-only" />
        <span
          aria-hidden
          className="flex h-[18px] w-[18px] items-center justify-center rounded border border-border-strong bg-bg-elevated transition-colors group-has-[input:checked]:border-accent group-has-[input:checked]:bg-accent group-has-[input:focus-visible]:ring-2 group-has-[input:focus-visible]:ring-accent/30"
        >
          <Check
            size={12}
            strokeWidth={2.5}
            className="text-fg-inverse opacity-0 transition-opacity group-has-[input:checked]:opacity-100"
          />
        </span>
        Lembrar-me neste aparelho (30 dias)
      </label>

      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-danger/40 bg-danger-bg px-3 py-2 text-small text-fg"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-body font-semibold text-fg-inverse transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        <LogIn size={16} strokeWidth={1.75} />
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
