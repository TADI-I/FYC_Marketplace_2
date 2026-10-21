import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AddProduct from './AddProduct';
import type { User } from './types';

jest.mock('./AppNotificationModal', () => ({ showNotification: jest.fn() }));

const seller: User = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Seller',
  email: 'seller@example.com',
  type: 'seller',
  subscribed: true,
  campus: 'arts'
};

test('listing validation reports errors beside the relevant fields', () => {
  render(<AddProduct currentUser={seller} onProductAdded={jest.fn()} onCancel={jest.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: /publish listing/i }));

  expect(screen.getByText('Add a clear listing title.')).toBeInTheDocument();
  expect(screen.getByText('Describe what you are offering.')).toBeInTheDocument();
  expect(screen.getByText('Choose a category.')).toBeInTheDocument();
  expect(screen.getByText('Enter a price greater than R0.')).toBeInTheDocument();
});

test('listing image validation rejects unsupported files', () => {
  const { container } = render(<AddProduct currentUser={seller} onProductAdded={jest.fn()} onCancel={jest.fn()} />);
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;

  fireEvent.change(input, { target: { files: [new File(['not-an-image'], 'notes.txt', { type: 'text/plain' })] } });

  expect(screen.getByText('Choose a JPEG, PNG, WebP, or GIF image.')).toBeInTheDocument();
});
