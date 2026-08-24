let announcementSocket = null;

function setAnnouncementSocket(io) {
  announcementSocket = io;
}

function serializePublicAnnouncement(req, announcement) {
  const obj = typeof announcement.toObject === 'function' ? announcement.toObject() : { ...announcement };
  if (obj.image) {
    obj.imageUrl = /^https?:\/\//i.test(obj.image)
      ? obj.image
      : req
        ? `${req.protocol}://${req.get('host')}/uploads/announcements/${obj.image}`
        : obj.image;
  }
  return obj;
}

function isPublicAnnouncement(announcement) {
  const now = new Date();
  const scheduledAt = announcement.scheduledAt ? new Date(announcement.scheduledAt) : null;
  return !announcement.isArchived
    && (
      announcement.status === 'published'
      || (announcement.status === 'scheduled' && scheduledAt && scheduledAt <= now)
    );
}

function emitPublicAnnouncement(event, announcement, req = null) {
  if (!announcementSocket) return;

  announcementSocket.emit(`announcement:${event}`, {
    announcement: serializePublicAnnouncement(req, announcement)
  });
}

module.exports = {
  emitPublicAnnouncement,
  isPublicAnnouncement,
  serializePublicAnnouncement,
  setAnnouncementSocket
};
