import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ContactSellerModal from './ContactSellerModal';

const product = {
  id: 1,
  title: 'Calculator',
  description: 'Scientific calculator',
  price: 100,
  category: 'Electronics',
  sellerId: 'seller-1',
  sellerName: 'Alex',
  sellerCampus: 'Central',
  rating: 0,
  type: 'Physical Product'
};

test('offers both WhatsApp and in-app chat for another seller listing', () => {
  const onWhatsApp = jest.fn();
  const onInAppChat = jest.fn();
  render(<ContactSellerModal product={product} signedIn={true} isOwnListing={false} whatsappState="ready" onWhatsApp={onWhatsApp} onInAppChat={onInAppChat} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /In-app chat/ }));
  fireEvent.click(screen.getByRole('button', { name: /WhatsApp/ }));
  expect(onInAppChat).toHaveBeenCalledTimes(1);
  expect(onWhatsApp).toHaveBeenCalledTimes(1);
});

test('requires an account for both contact channels without exposing WhatsApp availability', () => {
  render(<ContactSellerModal product={product} signedIn={false} isOwnListing={false} onWhatsApp={jest.fn()} onInAppChat={jest.fn()} onClose={jest.fn()} />);
  expect(screen.getAllByText('Sign in or create an account first')).toHaveLength(2);
  expect(screen.getByRole('button', { name: /WhatsApp/ })).toBeEnabled();
});
