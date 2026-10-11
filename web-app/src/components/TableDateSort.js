import React from 'react';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';

export const SORT_OPTIONS = {
  basic: [
    ['date-desc', 'Newest first'], ['date-asc', 'Oldest first'], ['name-asc', 'Name A–Z'], ['name-desc', 'Name Z–A'],
  ],
  users: [
    ['date-desc', 'Newest first'], ['date-asc', 'Oldest first'], ['name-asc', 'Name A–Z'], ['name-desc', 'Name Z–A'],
    ['status-asc', 'Status A–Z'], ['status-desc', 'Status Z–A'],
  ],
  lots: [
    ['date-desc', 'Newest first'], ['date-asc', 'Oldest first'], ['lot-asc', 'Lot / House low–high'], ['lot-desc', 'Lot / House high–low'],
    ['status-asc', 'Status A–Z'], ['status-desc', 'Status Z–A'],
  ],
  payments: [
    ['date-desc', 'Newest first'], ['date-asc', 'Oldest first'], ['name-asc', 'Resident A–Z'], ['name-desc', 'Resident Z–A'],
    ['amount-desc', 'Amount high–low'], ['amount-asc', 'Amount low–high'], ['status-asc', 'Status A–Z'], ['status-desc', 'Status Z–A'],
  ],
  requests: [
    ['date-desc', 'Newest first'], ['date-asc', 'Oldest first'], ['name-asc', 'Resident A–Z'], ['name-desc', 'Resident Z–A'],
    ['priority-desc', 'Priority high–low'], ['priority-asc', 'Priority low–high'], ['status-asc', 'Status A–Z'], ['status-desc', 'Status Z–A'],
  ],
  visitors: [
    ['date-desc', 'Newest first'], ['date-asc', 'Oldest first'], ['name-asc', 'Visitor A–Z'], ['name-desc', 'Visitor Z–A'],
    ['status-asc', 'Status A–Z'], ['status-desc', 'Status Z–A'],
  ],
};

const textValue = (record, key) => {
  const resident = record?.residentId || record?.resident || {};
  if (key === 'name') return record?.visitorName || record?.name || `${record?.firstName || resident?.firstName || ''} ${record?.lastName || resident?.lastName || ''}`.trim();
  if (key === 'lot') return record?.lotId || record?.houseNumber || record?.houseLot || record?.lotNumber || '';
  if (key === 'amount') return Number(record?.amount ?? record?.totalAmount ?? record?.paymentAmount ?? 0);
  return record?.[key] || '';
};

export const sortRecords = (records, value = 'date-desc') => {
  const [field, direction] = value.split('-');
  return [...records].sort((left, right) => {
    if (field === 'date') {
      const leftDate = new Date(left?.createdAt || left?.dateCreated || left?.updatedAt || 0).getTime();
      const rightDate = new Date(right?.createdAt || right?.dateCreated || right?.updatedAt || 0).getTime();
      return direction === 'asc' ? leftDate - rightDate : rightDate - leftDate;
    }
    const leftValue = textValue(left, field);
    const rightValue = textValue(right, field);
    const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: 'base' });
    return direction === 'asc' ? comparison : -comparison;
  });
};

export default function TableDateSort({ value, onChange, options = SORT_OPTIONS.basic, sx }) {
  return (
    <FormControl size="small" sx={{ minWidth: 0, ...sx }}>
      <InputLabel id="table-sort-label">Sort records</InputLabel>
      <Select labelId="table-sort-label" value={value} label="Sort records" onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, label]) => <MenuItem key={optionValue} value={optionValue}>{label}</MenuItem>)}
      </Select>
    </FormControl>
  );
}
