import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { AppNotificationHost, showConfirmation, showNotification } from './AppNotificationModal';

test('ordinary notifications render as non-blocking toasts', () => {
  render(<AppNotificationHost />);
  act(() => {
    showNotification({ type: 'success', title: 'Saved', message: 'The update is visible now.' });
  });
  expect(screen.getByRole('status')).toHaveTextContent('Saved');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
  expect(screen.queryByText('The update is visible now.')).not.toBeInTheDocument();
});

test('confirmations remain explicit modal decisions', async () => {
  render(<AppNotificationHost />);
  let decision!: Promise<boolean>;
  act(() => {
    decision = showConfirmation({ type: 'warning', title: 'Suspend account?', message: 'This removes access.', confirmLabel: 'Suspend' });
  });
  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Suspend' }));
  await expect(decision).resolves.toBe(true);
});
