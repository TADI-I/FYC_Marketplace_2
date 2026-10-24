import React, { useEffect, useState } from 'react';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { getConversations } from './api';
import { ListSkeleton } from './LoadingSkeletons';
import { showNotification } from './AppNotificationModal';

type Conversation = {
  conversationId: string;
  productId: string;
  participantId: string;
  participant: { _id: string; name: string; campus?: string };
  product: { _id: string; title: string };
  lastMessage: { text: string; createdAt: string };
  unreadCount: number;
};

export default function MessagesPage({ onBack, onOpen }: { onBack: () => void; onOpen: (participantId: string, productId: string) => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConversations()
      .then(response => setConversations(response.conversations || []))
      .catch(error => showNotification({ type: 'error', title: 'Messages could not load', message: error.message || 'Please try again.' }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="messages-page" aria-labelledby="messages-title">
      <button type="button" className="messages-back" onClick={onBack}><ArrowLeft /> Back to marketplace</button>
      <div className="messages-heading">
        <div><span className="eyebrow">Conversations</span><h1 id="messages-title">Messages</h1><p>Keep product questions and collection details together.</p></div>
        <span className="messages-heading-icon"><MessageCircle /></span>
      </div>
      <div className="conversation-list">
        {loading ? <ListSkeleton rows={5} /> : conversations.length === 0 ? (
          <div className="conversation-empty"><MessageCircle /><h2>No conversations yet</h2><p>Open a listing and choose Chat to contact its seller.</p></div>
        ) : conversations.map(conversation => (
          <button key={`${conversation.conversationId}:${conversation.productId}`} type="button" className="conversation-row" onClick={() => onOpen(String(conversation.participant._id || conversation.participantId), String(conversation.product._id || conversation.productId))}>
            <span className="conversation-avatar">{conversation.participant.name?.slice(0, 1).toUpperCase() || 'M'}</span>
            <span className="conversation-copy"><span className="conversation-topline"><strong>{conversation.participant.name}</strong><small>{new Date(conversation.lastMessage.createdAt).toLocaleDateString()}</small></span><span className="conversation-product">{conversation.product.title}</span><span className="conversation-preview">{conversation.lastMessage.text}</span></span>
            {conversation.unreadCount > 0 && <span className="conversation-unread" aria-label={`${conversation.unreadCount} unread`}>{conversation.unreadCount}</span>}
          </button>
        ))}
      </div>
    </section>
  );
}
