import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UserProfile from './UserProfile';
import type { User } from './types';

jest.mock('./api', () => ({
  getCurrentUser: jest.fn(),
  getSubscriptionStatus: jest.fn(() => Promise.resolve({ hasActiveSubscription: false, subscriptionStatus: 'NONE' })),
  updateUserProfile: jest.fn(),
  upgradeUserToSeller: jest.fn()
}));

const api = require('./api');

const originalUser: User = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Campus Cart Student',
  email: 'old@example.com',
  type: 'buyer',
  subscribed: false,
  campus: 'arts',
  whatsapp: '27123456789'
};

test('background user refreshes do not overwrite profile edits in progress', async () => {
  api.getCurrentUser.mockResolvedValue(originalUser);
  const props = { currentUser: originalUser, onLogout: jest.fn(), onBack: jest.fn(), onUserUpdate: jest.fn() };
  const { rerender } = render(<UserProfile {...props} />);

  const editButton = await screen.findByRole('button', { name: /edit profile/i });
  fireEvent.click(editButton);
  const email = screen.getByLabelText(/email address/i) as HTMLInputElement;
  fireEvent.change(email, { target: { value: 'typing@example.com' } });
  expect(email.value).toBe('typing@example.com');

  const refreshedUser = { ...originalUser, subscriptionStatus: 'NONE' };
  api.getCurrentUser.mockResolvedValue(refreshedUser);
  rerender(<UserProfile {...props} currentUser={refreshedUser} />);

  await waitFor(() => expect(api.getCurrentUser).toHaveBeenCalledTimes(1));
  expect((screen.getByLabelText(/email address/i) as HTMLInputElement).value).toBe('typing@example.com');
});
