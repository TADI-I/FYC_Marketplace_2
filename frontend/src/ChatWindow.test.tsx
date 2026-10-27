import React from 'react';
import { act, render, screen } from '@testing-library/react';
import ChatWindow from './ChatWindow';
import { getMessages, markMessagesAsRead } from './api';

jest.mock('./api', () => ({
  getMessages: jest.fn(),
  markMessagesAsRead: jest.fn(),
  sendMessage: jest.fn()
}));

const mockedGetMessages = getMessages as jest.MockedFunction<typeof getMessages>;
const mockedMarkMessagesAsRead = markMessagesAsRead as jest.MockedFunction<typeof markMessagesAsRead>;

test('scrolls the message pane without scrolling the document', async () => {
  let resolveMessages!: (value: any) => void;
  mockedGetMessages.mockReturnValue(new Promise(resolve => { resolveMessages = resolve; }));
  mockedMarkMessagesAsRead.mockResolvedValue({} as any);

  render(
    <ChatWindow
      currentUser={{ _id: 'buyer-1', name: 'Buyer', email: 'buyer@example.com', type: 'buyer', subscribed: false, campus: 'Main' }}
      chatWith="seller-1"
      productId="product-1"
      onCloseChat={jest.fn()}
    />
  );

  const messageLog = screen.getByRole('log');
  Object.defineProperty(messageLog, 'scrollHeight', { configurable: true, value: 640 });

  await act(async () => {
    resolveMessages({
      messages: [{ _id: 'message-1', senderId: 'seller-1', receiverId: 'buyer-1', text: 'Still available', read: false }],
      participant: { _id: 'seller-1', name: 'Seller' },
      product: { _id: 'product-1', title: 'Textbook' }
    });
  });

  expect(messageLog.scrollTop).toBe(640);
  expect(window.scrollY).toBe(0);
});
