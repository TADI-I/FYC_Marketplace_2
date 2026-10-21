// controllers/messageController.js
const { ObjectId } = require('mongodb');

function canonicalConversationId(firstUserId, secondUserId) {
  return [String(firstUserId), String(secondUserId)].sort().join('-');
}

// Get messages for conversation
exports.getMessages = async (req, res, db) => {
  try {
    const conversationId = req.params.conversationId;
    const userId = new ObjectId(req.user.id);

    const messages = await db.collection('messages')
      .find({
        conversationId,
        $or: [{ senderId: userId }, { receiverId: userId }]
      })
      .sort({ createdAt: 1 })
      .toArray();

    res.json({
      success: true,
      messages
    });

  } catch (error) {
    console.error('❌ Get messages error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve messages',
      success: false
    });
  }
};

// Send message
exports.sendMessage = async (req, res, db) => {
  try {
    const { receiverId, text, conversationId } = req.body;

    if (!ObjectId.isValid(receiverId) || typeof text !== 'string') {
      return res.status(400).json({ 
        error: 'A valid recipient and message are required',
        success: false
      });
    }

    const senderId = new ObjectId(req.user.id);
    const recipientId = new ObjectId(receiverId);
    const trimmedText = text.trim();
    if (!trimmedText || trimmedText.length > 2000 || senderId.equals(recipientId)) {
      return res.status(400).json({ error: 'Invalid message', success: false });
    }

    const expectedConversationId = canonicalConversationId(senderId, recipientId);
    if (conversationId && conversationId !== expectedConversationId) {
      return res.status(400).json({ error: 'Invalid conversation', success: false });
    }

    const recipient = await db.collection('users').findOne(
      { _id: recipientId },
      { projection: { _id: 1 } }
    );
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found', success: false });
    }

    const message = {
      senderId,
      receiverId: recipientId,
      conversationId: expectedConversationId,
      text: trimmedText,
      read: false,
      createdAt: new Date()
    };

    const result = await db.collection('messages').insertOne(message);
    
    res.status(201).json({
      success: true,
      message: { ...message, _id: result.insertedId }
    });

  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({ 
      error: 'Failed to send message',
      success: false
    });
  }
};

exports.canonicalConversationId = canonicalConversationId;
