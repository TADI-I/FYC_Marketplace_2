import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CustomLocationCapture from './CustomLocationCapture';

const installGeolocation = (getCurrentPosition: jest.Mock) => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition }
  });
};

test('captures a private pickup point after an explicit user action', () => {
  const onLocation = jest.fn();
  const getCurrentPosition = jest.fn(success => success({ coords: { latitude: -25.745, longitude: 28.19, accuracy: 16 } }));
  installGeolocation(getCurrentPosition);

  render(<CustomLocationCapture label="Example Residence" onLabelChange={jest.fn()} location={null} onLocation={onLocation} />);

  expect(screen.getByText(/accredited residence/i)).toBeInTheDocument();
  expect(getCurrentPosition).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /use current location/i }));
  expect(onLocation).toHaveBeenCalledWith({ latitude: -25.745, longitude: 28.19, accuracy: 16 });
});

test('explains a denied location permission without requesting address details', () => {
  installGeolocation(jest.fn((_success, failure) => failure({
    code: 1,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3
  })));
  render(<CustomLocationCapture label="" onLabelChange={jest.fn()} location={null} onLocation={jest.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: /use current location/i }));
  expect(screen.getByRole('alert')).toHaveTextContent(/permission was denied/i);
});
