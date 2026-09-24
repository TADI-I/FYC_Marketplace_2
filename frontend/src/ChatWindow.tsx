import React, { useState, useEffect } from 'react';
import { X, Clock, Check, CheckCheck } from 'lucide-react';
import { sendMessage, getMessages, markMessagesAsRead } from './api';

// Define Message type to match the API
type Message = {
  id: number;
  senderId: number;
  receiverId: number;
  text: string;
  timestamp: string;
  read: boolean;
};

type User = {
  id: number;
  name: string;
  email: string;
  type: string;
  subscribed: boolean;
  campus: string;
};

interface ChatWindowProps {
  currentUser: User | null;
  chatWith: number | null;
  users: User[];
  onCloseChat: () => void;
  onNewMessage: (message: Message) => void;
  onLoadMessages: (messages: Message[]) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  currentUser, 
  chatWith, 
  users, 
  onCloseChat,
  onNewMessage,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const otherUser = users.find(user => user.id === chatWith);

  // Load messages and mark as read when chat opens
  // loadMessages and markAsRead are stable here; avoid exhaustive-deps error in CI
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (currentUser && chatWith) {
      loadMessages();
      markAsRead();
    }
  }, [currentUser, chatWith]);

  const loadMessages = async () => {
    if (!currentUser || !chatWith) return;

    setLoading(true);
    setError('');
    
    try {
      // Use the conversation ID format expected by the API
      const conversationId = `${Math.min(currentUser.id, chatWith)}-${Math.max(currentUser.id, chatWith)}`;
      const loadedMessages = await getMessages(conversationId);
      setMessages(loadedMessages);
    } catch (err) {
      setError('Failed to load messages');
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    if (!currentUser || !chatWith) return;
    
    try {
      await markMessagesAsRead(currentUser.id, chatWith);
      // Update local messages to mark as read
      setMessages(prev => prev.map(msg => 
        msg.senderId === chatWith ? { ...msg, read: true } : msg
      ));
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

 const handleSendMessage = async () => {
  // Add more comprehensive null checks
  if (!newMessage.trim() || !currentUser || !chatWith || !currentUser.id) {
    setError('Cannot send message: missing required information');
    return;
  }

  setSending(true);
  setError('');
  
  try {
    const messageData = {
      senderId: currentUser.id.toString(), // Now safe to call toString()
      receiverId: chatWith.toString(), // Now safe to call toString()
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      conversationId: `${Math.min(currentUser.id, chatWith)}-${Math.max(currentUser.id, chatWith)}`
    };

    const sentMessage = await sendMessage(messageData);
    
    // Add to local messages
    setMessages(prev => [...prev, sentMessage]);
    onNewMessage(sentMessage);
    
    setNewMessage('');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
    setError(errorMessage);
    console.error('Error sending message:', err);
  } finally {
    setSending(false);
  }
};

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  if (!currentUser || !chatWith) {
    return (
      <div className="apple-page max-w-2xl mx-auto p-6">
        <div className="apple-surface bg-white rounded-lg shadow-lg p-6 text-center">
          <div>Please log in to view messages.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="apple-page chat-shell max-w-2xl mx-auto p-6">
      <div className="apple-surface chat-card bg-white rounded-lg shadow-lg h-[600px] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-blue-600 text-white rounded-t-lg flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-semibold">Chat with {otherUser?.name || 'Unknown User'}</h3>
              {otherUser && (
                <p className="text-blue-100 text-sm">{otherUser.campus} Campus</p>
              )}
            </div>
            {loading && (
              <Clock className="h-4 w-4 animate-spin" />
            )}
          </div>
          <button 
            onClick={onCloseChat} 
            className="text-white hover:text-gray-200 transition-colors"
            disabled={sending}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
          {loading ? (
            <div className="text-center text-gray-500 py-10">
              <p>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              <p className="text-lg">No messages yet.</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            messages.map(msg => (
              <div 
                key={msg.id} 
                className={`mb-4 flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md rounded-lg p-3 ${
                  msg.senderId === currentUser.id
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-gray-200 text-gray-800 rounded-bl-none'
                }`}>
                  <p className="break-words">{msg.text}</p>
                  <div className={`flex items-center gap-1 mt-1 text-xs ${
                    msg.senderId === currentUser.id ? 'text-blue-200' : 'text-gray-600'
                  }`}>
                    <span>{formatTimestamp(msg.timestamp)}</span>
                    {msg.senderId === currentUser.id && (
                      msg.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 p-3 border rounded focus:outline-none focus:border-blue-500"
              disabled={sending || loading}
            />
            <button 
              onClick={handleSendMessage}
              disabled={sending || loading || !newMessage.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
