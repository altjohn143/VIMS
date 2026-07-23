import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import RegistrationLotMap from './RegistrationLotMap';

const lots = [
  {
    lotId: 'P1-B2-L3',
    phase: 1,
    block: 2,
    lotNumber: 3,
    sqm: 180,
    status: 'vacant',
    mapPosition: { isPositioned: true, left: 20, top: 30, width: 3, height: 4, rotate: 5 },
  },
  {
    lotId: 'P2-B4-L8',
    phase: 2,
    block: 4,
    lotNumber: 8,
    sqm: 240,
    status: 'occupied',
    mapPosition: { isPositioned: true, left: 60, top: 55, width: 3, height: 4, rotate: 0 },
  },
];

test('renders the actual subdivision map and organized lot selector', () => {
  render(<RegistrationLotMap lots={lots} selectedLotId="" onSelectLot={jest.fn()} />);

  expect(screen.getByAltText('Casimiro Westville Homes actual lot map')).toBeInTheDocument();
  expect(screen.getByLabelText('Select lot by phase and block')).toBeInTheDocument();
  expect(screen.getByTitle('Phase 1, Block 2, Lot 3 — Vacant')).toBeInTheDocument();
  expect(screen.getByTitle('Phase 2, Block 4, Lot 8 — Occupied')).toBeInTheDocument();
});

test('allows selecting vacant overlays but not occupied overlays', () => {
  const onSelectLot = jest.fn();
  render(<RegistrationLotMap lots={lots} selectedLotId="" onSelectLot={onSelectLot} />);

  fireEvent.click(screen.getByTitle('Phase 1, Block 2, Lot 3 — Vacant'));
  expect(onSelectLot).toHaveBeenCalledWith(lots[0]);

  fireEvent.click(screen.getByTitle('Phase 2, Block 4, Lot 8 — Occupied'));
  expect(onSelectLot).toHaveBeenCalledTimes(1);
});
