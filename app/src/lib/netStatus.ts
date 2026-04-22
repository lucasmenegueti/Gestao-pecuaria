import NetInfo from '@react-native-community/netinfo';

// Única fonte de verdade sobre conectividade. Antes tínhamos subscriptions
// duplicadas em supabase/client.ts e sync/daemon.ts — ambas calculando
// `isConnected && isInternetReachable !== false` com o mesmo formato.

type Listener = (isOnline: boolean, wasOnline: boolean) => void;

let _isOnline = true; // otimista até NetInfo responder
const _listeners = new Set<Listener>();

function apply(netState: { isConnected?: boolean | null; isInternetReachable?: boolean | null } | null | undefined) {
  const next = !!(netState?.isConnected && netState?.isInternetReachable !== false);
  const prev = _isOnline;
  _isOnline = next;
  if (prev !== next) {
    for (const l of _listeners) l(next, prev);
  }
}

NetInfo.addEventListener(apply);
NetInfo.fetch().then(apply).catch(() => {});

export function isOnline(): boolean {
  return _isOnline;
}

/** Inscreve callback nas transições online/offline. Retorna unsubscribe. */
export function onNetChange(listener: Listener): () => void {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}
