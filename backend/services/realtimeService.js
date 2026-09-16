let io = null;

function setRealtimeSocket(serverIo) {
  io = serverIo;
}

function emitDataChanged({ resource, action, path }) {
  if (!io || !resource) return;

  // Only publish a small invalidation signal. Clients must still use their
  // authenticated API endpoint to retrieve the current records.
  io.to('authenticated').emit('data:changed', {
    resource,
    action: action || 'updated',
    path,
    occurredAt: new Date().toISOString()
  });
}

module.exports = { emitDataChanged, setRealtimeSocket };
