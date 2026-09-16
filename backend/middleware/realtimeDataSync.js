const { emitDataChanged } = require('../services/realtimeService');

const RESOURCE_BY_PATH = {
  announcements: 'announcements',
  incidents: 'incidents',
  lots: 'lots',
  notifications: 'notifications',
  patrols: 'patrols',
  payments: 'payments',
  reservations: 'reservations',
  'service-requests': 'service-requests',
  users: 'users',
  verifications: 'verifications',
  visitors: 'visitors'
};

function realtimeDataSync(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

  res.on('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;
    const path = req.originalUrl || req.path || '';
    const apiSegment = path.split('?')[0].split('/').filter(Boolean)[1];
    const resource = RESOURCE_BY_PATH[apiSegment];
    if (!resource) return;

    emitDataChanged({
      resource,
      action: req.method === 'POST' ? 'created' : req.method === 'DELETE' ? 'deleted' : 'updated',
      path: req.originalUrl || path
    });
  });

  next();
}

module.exports = realtimeDataSync;
