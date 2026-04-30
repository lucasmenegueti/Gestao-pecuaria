import 'server-only';

/**
 * Usuários permitidos. Hashes bcrypt (cost 10) — plaintexts nunca vivem aqui nem no
 * histórico git. Repo é privado; mesmo assim bcrypt protege contra vazamento acidental.
 * Para rotacionar ou adicionar usuário, gerar hash novo e atualizar este arquivo.
 */
export interface User {
  username: string;
  role: 'owner' | 'gestor';
  hash: string;
}

export const USERS: User[] = [
  {
    "username": "lucas",
    "role": "owner",
    "hash": "$2b$10$VG67k/60irv/XTGGmLF2AuR3K9HRdM0Rx4KYCMR/vp3grrUhEXpEm"
  },
  {
    "username": "alex",
    "role": "gestor",
    "hash": "$2b$10$Lb.UQvX1n93cWM99xTPIIOybwiE3cx4kyNcYPbPxQGxR5ZLEo7bR."
  },
  {
    "username": "everth",
    "role": "gestor",
    "hash": "$2b$10$rSiX.WyeqTrraL9Rq5hb4e5ZAQLHHA/mttjkT2a88ZGAQSoGGzk1C"
  },
  {
    "username": "gabriel",
    "role": "gestor",
    "hash": "$2b$10$XQOEOVMR.7sSKUoU9p95KOziIrd0FzwZYO95SMtlofvgoQV8sQ8Ly"
  },
  {
    "username": "marcelo",
    "role": "gestor",
    "hash": "$2b$10$2Lu1NGjTZZ0pWhrPV/H60e/LRkLGLxmHvFnjaB6aCXSlxCbmIL.a."
  }
];
