/** Formata uma data ISO como "DD/MM". Retorna '' se nula/vazia.
 *  Aceita date-only (`2026-05-30`), timestamp do Supabase (`2026-05-30T08:34:03Z`)
 *  e do SQLite (`2026-05-30 08:34:03`, com espaço). */
export function formatDayMonth(iso: string | null | undefined): string {
  if (!iso) return '';
  const datePart = iso.split(/[T ]/)[0]; // SQLite separa data/hora com espaço; Supabase com 'T'
  const parts = datePart.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return iso;
}
