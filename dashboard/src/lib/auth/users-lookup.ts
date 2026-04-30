import 'server-only';

import bcrypt from 'bcryptjs';
import type { User } from './users';
import { USERS } from './users';

/**
 * Verifica usuário + senha. Retorna User em caso de match; null caso contrário.
 * Usa bcrypt.compare em tempo constante pra evitar timing attacks triviais.
 */
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<User | null> {
  const normalized = username.trim().toLowerCase();
  const user = USERS.find((u) => u.username === normalized);
  if (!user) {
    // Ainda faz um compare dummy pra não dar timing leak de "user existe vs não existe"
    await bcrypt.compare(password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinvali');
    return null;
  }
  const ok = await bcrypt.compare(password, user.hash);
  return ok ? user : null;
}
