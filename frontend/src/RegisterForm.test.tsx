import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import RegisterForm from './RegisterForm';
import { showNotification } from './AppNotificationModal';

jest.mock('./api', () => ({ registerUser: jest.fn() }));
jest.mock('./AppNotificationModal', () => ({ showNotification: jest.fn() }));

test('selecting Other reveals the residence name and private location flow', () => {
  render(<RegisterForm onRegisterSuccess={jest.fn()} onShowLogin={jest.fn()} onClose={jest.fn()} />);

  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'other' } });

  expect(screen.getByLabelText(/residence, campus or area name/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /use current location/i })).toBeInTheDocument();
  expect(screen.getByText(/exact coordinates stay private/i)).toBeInTheDocument();
});

test('Other cannot be submitted without a label and shared point', () => {
  render(<RegisterForm onRegisterSuccess={jest.fn()} onShowLogin={jest.fn()} onClose={jest.fn()} />);
  fireEvent.change(screen.getByPlaceholderText('Full Name'), { target: { value: 'Student' } });
  fireEvent.change(screen.getByPlaceholderText('Email Address'), { target: { value: 'student@example.test' } });
  fireEvent.change(screen.getByPlaceholderText('Password (min 8 characters)'), { target: { value: 'password123' } });
  fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { value: 'password123' } });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'other' } });
  fireEvent.click(screen.getByRole('button', { name: 'Register' }));

  expect(showNotification).toHaveBeenCalledWith(expect.objectContaining({ title: 'Add your location' }));
});
