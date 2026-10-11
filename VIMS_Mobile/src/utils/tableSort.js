export const MOBILE_SORT_OPTIONS = {
  basic: [['date-desc', 'Newest first'], ['date-asc', 'Oldest first'], ['name-asc', 'Name A–Z'], ['name-desc', 'Name Z–A']],
  users: [['date-desc', 'Newest first'], ['date-asc', 'Oldest first'], ['name-asc', 'Name A–Z'], ['name-desc', 'Name Z–A'], ['status-asc', 'Status A–Z'], ['status-desc', 'Status Z–A']],
  payments: [['date-desc', 'Newest first'], ['date-asc', 'Oldest first'], ['amount-desc', 'Amount high–low'], ['amount-asc', 'Amount low–high'], ['status-asc', 'Status A–Z'], ['status-desc', 'Status Z–A']],
  requests: [['date-desc', 'Newest first'], ['date-asc', 'Oldest first'], ['name-asc', 'Resident A–Z'], ['name-desc', 'Resident Z–A'], ['priority-desc', 'Priority high–low'], ['priority-asc', 'Priority low–high'], ['status-asc', 'Status A–Z'], ['status-desc', 'Status Z–A']],
  visitors: [['date-desc', 'Newest first'], ['date-asc', 'Oldest first'], ['name-asc', 'Visitor A–Z'], ['name-desc', 'Visitor Z–A'], ['status-asc', 'Status A–Z'], ['status-desc', 'Status Z–A']],
  patrols: [['date-desc', 'Newest first'], ['date-asc', 'Oldest first'], ['name-asc', 'Officer A–Z'], ['name-desc', 'Officer Z–A'], ['status-asc', 'Status A–Z'], ['status-desc', 'Status Z–A']],
  incidents: [['date-desc', 'Newest first'], ['date-asc', 'Oldest first'], ['title-asc', 'Incident A–Z'], ['title-desc', 'Incident Z–A'], ['status-asc', 'Status A–Z'], ['status-desc', 'Status Z–A']],
};

const dateValue = (record) => new Date(record?.loggedAt || record?.arrivalTime || record?.expectedArrival || record?.createdAt || record?.dateCreated || record?.updatedAt || 0).getTime();

const textValue = (record, key) => {
  const person = record?.residentId || record?.resident || record?.officerId || record?.reportedBy || {};
  if (key === 'name') return record?.visitorName || record?.name || `${record?.firstName || person?.firstName || ''} ${record?.lastName || person?.lastName || ''}`.trim();
  if (key === 'amount') return Number(record?.amount ?? record?.totalAmount ?? record?.paymentAmount ?? 0);
  if (key === 'status') return typeof record?.isActive === 'boolean' ? (record.isActive ? 'active' : 'inactive') : (record?.qrStatus || record?.status || '');
  return record?.[key] || '';
};

export const sortRecords = (records, sortOrder = 'date-desc') => {
  const [field, direction] = sortOrder.split('-');
  return [...(records || [])].sort((left, right) => {
    if (field === 'date') return direction === 'asc' ? dateValue(left) - dateValue(right) : dateValue(right) - dateValue(left);
    const a = textValue(left, field);
    const b = textValue(right, field);
    const compare = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
    return compare === 0 ? dateValue(right) - dateValue(left) : (direction === 'asc' ? compare : -compare);
  });
};
