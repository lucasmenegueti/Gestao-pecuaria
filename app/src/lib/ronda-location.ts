import * as Location from 'expo-location';
import type * as SQLite from 'expo-sqlite';

import { logInfo, logWarn } from './log';

// Grava onde o aparelho estava quando a ronda foi aberta, pra cruzar depois com
// o polígono do piquete. Existe porque, sem posição, a única coisa que dá pra
// checar é cadência/distância implícita entre lançamentos — o que não separa
// "não foi ao piquete" de "foi e lançou tudo depois na sede".
//
// Nunca bloqueia o fluxo: a ronda já foi criada quando isto roda, e todo
// caminho de falha (permissão negada, GPS frio, web) sai em silêncio deixando
// as colunas NULL. Peão sem sinal de satélite não pode ficar sem fazer ronda.
//
// Corrida conhecida (não tratada): se o UPDATE cair entre o `SELECT ...
// pending_sync = 1` do push e o `SET pending_sync = 0` que vem com a resposta,
// o fix fica só local. Janela = latência de rede, e o GPS leva segundos pra
// responder — mesma classe de corrida de toda tabela append-only.

const GPS_TIMEOUT_MS = 15000;

/** Não regrava se a ronda já tem posição — a ronda dura o dia inteiro. */
export async function captureRondaLocation(
  db: SQLite.SQLiteDatabase,
  rondaId: number,
): Promise<void> {
  try {
    const row = await db.getFirstAsync<{ gps_at: string | null }>(
      'SELECT gps_at FROM rondas WHERE id = ?',
      [rondaId]
    );
    if (!row || row.gps_at) return;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      logInfo('ui', 'ronda_gps_denied', { rondaId });
      return;
    }

    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('gps-timeout')), GPS_TIMEOUT_MS)
      ),
    ]);

    // pending_sync=1 na mão: `rondas` é appendOnly, então não tem trigger de
    // dirty (MUTABLE_TABLES). Sem isso o UPDATE nunca subiria. O push re-envia
    // a linha com o mesmo UUID estável e o upsert colapsa no mesmo row.
    await db.runAsync(
      `UPDATE rondas
          SET gps_lat = ?, gps_lng = ?, gps_accuracy_m = ?, gps_mocked = ?, gps_at = ?,
              pending_sync = 1, local_updated_at = datetime('now')
        WHERE id = ?`,
      [
        pos.coords.latitude,
        pos.coords.longitude,
        pos.coords.accuracy ?? null,
        // `mocked` só existe no Android; no iOS a plataforma não expõe equivalente.
        typeof (pos as { mocked?: boolean }).mocked === 'boolean'
          ? Number((pos as { mocked?: boolean }).mocked)
          : null,
        new Date().toISOString(),
        rondaId,
      ]
    );
    logInfo('ui', 'ronda_gps_saved', {
      rondaId,
      accuracy_m: Math.round(pos.coords.accuracy ?? 0),
    });
  } catch (e) {
    // GPS frio, indoor, web sem permissão, timeout: ronda segue sem posição.
    logWarn('ui', 'ronda_gps_failed', { rondaId, error: String(e) });
  }
}
