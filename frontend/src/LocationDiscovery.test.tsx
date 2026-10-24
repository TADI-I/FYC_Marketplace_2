import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import LocationDiscovery from './LocationDiscovery';

const defaultProps = {
  location: null,
  detectedCampus: null,
  searching: false,
  onLocation: jest.fn(),
  onDisable: jest.fn(),
  onCorrectCampus: jest.fn()
};

const installGeolocation = (getCurrentPosition: jest.Mock) => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition }
  });
};

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

test('requests geolocation only after Use My Location and returns an accurate reading', () => {
  const getCurrentPosition = jest.fn(success => success({ coords: { latitude: -25.7, longitude: 28.1, accuracy: 12 } }));
  installGeolocation(getCurrentPosition);
  render(<LocationDiscovery {...defaultProps} />);
  expect(getCurrentPosition).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Use My Location' }));
  expect(defaultProps.onLocation).toHaveBeenCalledWith({ latitude: -25.7, longitude: 28.1, accuracy: 12 });
  expect(localStorage.getItem('fyc_location_prompt_seen')).toBe('true');
});

test.each([
  [1, 'permission was denied'],
  [2, 'currently unavailable'],
  [3, 'took too long']
])('handles geolocation error code %s', (code, expectedMessage) => {
  installGeolocation(jest.fn((_success, failure) => failure({
    code,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3
  })));
  render(<LocationDiscovery {...defaultProps} />);
  fireEvent.click(screen.getByRole('button', { name: 'Use My Location' }));
  expect(screen.getByRole('alert')).toHaveTextContent(expectedMessage);
});

test('does not repeat a dismissed introduction and still offers later opt-in', () => {
  localStorage.setItem('fyc_location_prompt_seen', 'true');
  render(<LocationDiscovery {...defaultProps} />);
  expect(screen.queryByText('Find what’s closest to you')).not.toBeInTheDocument();
  expect(screen.getByText('Nearby discovery is off')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Use My Location' })).toBeInTheDocument();
});

test('shows inaccurate-reading guidance without hiding products behind a distance filter', () => {
  render(<LocationDiscovery {...defaultProps} location={{ latitude: -25.7, longitude: 28.1, accuracy: 250 }} />);
  expect(screen.getByText(/Approximate reading/)).toBeInTheDocument();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
});
