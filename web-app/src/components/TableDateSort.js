import React from 'react';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';

export const SORT_OPTIONS = {
  basic: [
    ['date-desc', 'Recently Added — Newest first'],
    ['date-asc', 'Date Added — Oldest first'],
    ['name-asc', 'Name — A to Z'],
    ['name-desc', 'Name — Z to A'],
  ],
  users: [
    ['date-desc', 'Recently Added — Newest first'], ['date-asc', 'Date Added — Oldest first'],
    ['name-asc', 'Name — A to Z'], ['name-desc', 'Name — Z to A'],
    ['status-asc', 'Account Status — A to Z'], ['status-desc', 'Account Status — Z to A'],
  ],
  lots: [
    ['date-desc', 'Recently Added — Newest first'], ['date-asc', 'Date Added — Oldest first'],
    ['lot-asc', 'Lot / House Number — Low to High'], ['lot-desc', 'Lot / House Number — High to Low'],
    ['status-asc', 'Status — A to Z'], ['status-desc', 'Status — Z to A'],
  ],
  payments: [
    ['date-desc', 'Recently Added — Newest first'], ['date-asc', 'Date Added — Oldest first'],
    ['name-asc', 'Resident Name — A to Z'], ['name-desc', 'Resident Name — Z to A'],
    ['amount-desc', 'Amount — Highest first'], ['amount-asc', 'Amount — Lowest first'],
    ['status-asc', 'Status — A to Z'], ['status-desc', 'Status — Z to A'],
  ],
  requests: [
    ['date-desc', 'Recently Added — Newest first'], ['date-asc', 'Date Added — Oldest first'],
    ['name-asc', 'Resident Name — A to Z'], ['name-desc', 'Resident Name — Z to A'],
    ['priority-desc', 'Priority — Highest first'], ['priority-asc', 'Priority — Lowest first'],
    ['status-asc', 'Status — A to Z'], ['status-desc', 'Status — Z to A'],
  ],
  visitors: [
    ['date-desc', 'Recently Added — Newest first'], ['date-asc', 'Date Added — Oldest first'],
    ['name-asc', 'Visitor Name — A to Z'], ['name-desc', 'Visitor Name — Z to A'],
    ['status-asc', 'Status — A to Z'], ['status-desc', 'Status — Z to A'],
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
    <FormControl size="small" sx={{ minWidth: 245, ...sx }}>
      <InputLabel id="table-sort-label">Sort records</InputLabel>
      <Select labelId="table-sort-label" value={value} label="Sort records" onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, label]) => <MenuItem key={optionValue} value={optionValue}>{label}</MenuItem>)}
      </Select>
    </FormControl>
  );
}
