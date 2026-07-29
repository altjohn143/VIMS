import React from 'react';

const CHUNK_RELOAD_KEY = 'vims-chunk-reload';

export const isChunkLoadError = (error) => {
  const message = String(error?.message || error || '');
  return error?.name === 'ChunkLoadError' ||
    /Loading (CSS )?chunk [\d]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message);
};

const reloadWithFreshDocument = () => {
  const url = new URL(window.location.href);
  url.searchParams.set('_vims_refresh', Date.now().toString());
  window.location.replace(url.toString());
};

export const recoverFromChunkError = (error) => {
  if (!isChunkLoadError(error)) return false;

  if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
    reloadWithFreshDocument();
    return true;
  }

  return false;
};

export const clearChunkReloadMarker = () => {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  const url = new URL(window.location.href);
  if (url.searchParams.has('_vims_refresh')) {
    url.searchParams.delete('_vims_refresh');
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }
};

export const lazyWithRetry = (importer) => React.lazy(async () => {
  try {
    return await importer();
  } catch (error) {
    if (recoverFromChunkError(error)) {
      return new Promise(() => {});
    }
    throw error;
  }
});
