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
  render(<ContactSellerModal product={product} whatsappUrl="https://wa.me/27123456789" signedIn={true} isOwnListing={false} onWhatsApp={onWhatsApp} onInAppChat={onInAppChat} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /In-app chat/ }));
  fireEvent.click(screen.getByRole('button', { name: /WhatsApp/ }));
  expect(onInAppChat).toHaveBeenCalledTimes(1);
  expect(onWhatsApp).toHaveBeenCalledTimes(1);
});

test('explains the account requirement before in-app chat', () => {
  render(<ContactSellerModal product={product} whatsappUrl={null} signedIn={false} isOwnListing={false} onWhatsApp={jest.fn()} onInAppChat={jest.fn()} onClose={jest.fn()} />);
  expect(screen.getByText('Sign in or create an account first')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /WhatsApp/ })).toBeDisabled();
});
