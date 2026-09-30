import { useEffect, useRef } from 'react';
import websocketService from './websocket';

// Reload only the mounted screen whose backing resource changed. Keeping the
// callback in a ref avoids reconnecting the socket whenever screen state moves.
export default function useRealtimeRefresh(resources, refresh) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const resourceKey = Array.isArray(resources) ? resources.join('|') : resources;

  useEffect(() => websocketService.onDataChanged((change) => {
    const accepted = Array.isArray(resources) ? resources : [resources];
    // The same callback is used by manual pull-to-refresh controls. Mark socket
    // refreshes as silent so screens can preserve their current content.
    if (accepted.includes(change?.resource)) refreshRef.current?.({ silent: true });
  }), [resourceKey]); // resource set is intentionally stable at call sites
}
