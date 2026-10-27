import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, CheckCheck, Send } from 'lucide-react';
import { getMessages, markMessagesAsRead, sendMessage } from './api';
import { conversationIdentifier, userIdentifier, User } from './types';
import { ListSkeleton } from './LoadingSkeletons';
import { showNotification } from './AppNotificationModal';

type Message = { _id?: string; senderId: string; receiverId: string; text: string; createdAt?: string; read: boolean };
type Context = { participant: { _id: string; name: string; campus?: string } | null; product: { _id: string; title: string } | null };

export default function ChatWindow({ currentUser, chatWith, productId, onCloseChat }: { currentUser: User | null; chatWith: string; productId: string; onCloseChat: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [context, setContext] = useState<Context>({ participant: null, product: null });
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messageListRef = useRef<HTMLDivElement>(null);
  const currentUserId = currentUser ? userIdentifier(currentUser) : '';
  const conversationId = conversationIdentifier(currentUserId, chatWith);

  const loadMessages = useCallback(async (silent = false) => {
    if (!currentUserId || !chatWith || !productId) return;
    if (!silent) setLoading(true);
    try {
      const response = await getMessages(conversationId, productId, chatWith);
      setMessages(response.messages || []);
      setContext({ participant: response.participant, product: response.product });
      await markMessagesAsRead(conversationId, productId);
      setMessages(previous => previous.map(message => String(message.receiverId) === currentUserId ? { ...message, read: true } : message));
    } catch (error: any) {
      if (!silent) showNotification({ type: 'error', title: 'Conversation could not load', message: error.message || 'Please try again.' });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [chatWith, conversationId, currentUserId, productId]);

  useEffect(() => {
    loadMessages();
    const timer = window.setInterval(() => loadMessages(true), 10000);
    return () => window.clearInterval(timer);
  }, [loadMessages]);

  useLayoutEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) return;
    messageList.scrollTop = messageList.scrollHeight;
  }, [messages.length]);

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const sent = await sendMessage({ receiverId: chatWith, productId, text, conversationId });
      setMessages(previous => [...previous, sent]);
      setNewMessage('');
    } catch (error: any) {
      showNotification({ type: 'error', title: 'Message not sent', message: error.message || 'Please try again.' });
    } finally {
      setSending(false);
    }
  };

  if (!currentUser) return <div className="conversation-empty"><h2>Sign in to view messages</h2></div>;

  return (
    <section className="chat-page" aria-label="Product conversation">
      <div className="chat-card">
        <header className="chat-header">
          <button type="button" onClick={onCloseChat} aria-label="Back to messages"><ArrowLeft /></button>
          <span className="conversation-avatar">{context.participant?.name?.slice(0, 1).toUpperCase() || 'M'}</span>
          <div><h1>{context.participant?.name || 'Conversation'}</h1><p>{context.product?.title || 'Product enquiry'}{context.participant?.campus ? ` · ${context.participant.campus}` : ''}</p></div>
        </header>
        <div ref={messageListRef} className="chat-messages" role="log" aria-live="polite">
          {loading ? <ListSkeleton rows={5} /> : messages.length === 0 ? (
            <div className="conversation-empty"><h2>Start the conversation</h2><p>Ask about availability, condition, or collection. Keep payment details private.</p></div>
          ) : messages.map(message => {
            const mine = String(message.senderId) === currentUserId;
            return <div key={String(message._id)} className={`chat-message-row ${mine ? 'mine' : ''}`}><div className="chat-bubble"><p>{message.text}</p><span>{message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}{mine && (message.read ? <CheckCheck /> : <Check />)}</span></div></div>;
          })}
        </div>
        <div className="chat-composer">
          <textarea value={newMessage} onChange={event => setNewMessage(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSend(); } }} maxLength={2000} rows={1} placeholder="Write a message" aria-label="Message" disabled={sending || loading} />
          <button type="button" onClick={handleSend} disabled={sending || loading || !newMessage.trim()} aria-label="Send message"><Send /> <span>{sending ? 'Sending' : 'Send'}</span></button>
        </div>
      </div>
    </section>
  );
}
