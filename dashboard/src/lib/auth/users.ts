import 'server-only';

// Antes este arquivo tinha hashes bcrypt locais. Auth agora vai contra o
// Supabase (mesma fonte do app pecuária). Mantemos só os tipos.

export interface AuthedUser {
  username: string;
  role: 'owner' | 'gestor';
}
