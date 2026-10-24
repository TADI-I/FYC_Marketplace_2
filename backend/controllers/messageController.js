const { ObjectId } = require('mongodb');

function canonicalConversationId(firstUserId, secondUserId) {
  return [String(firstUserId), String(secondUserId)].sort().join('-');
}

function asObjectId(value) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

async function loadProductConversationContext(db, currentUserId, participantId, productId, options = {}) {
  const participantObjectId = asObjectId(participantId);
  const productObjectId = asObjectId(productId);
  if (!participantObjectId || !productObjectId || currentUserId.equals(participantObjectId)) {
    return { error: 'Invalid product conversation', status: 400 };
  }

  const [product, participant] = await Promise.all([
    db.collection('products').findOne(
      { _id: productObjectId, status: { $ne: 'deleted' } },
      { projection: { title: 1, sellerId: 1, image: 1, imageUrl: 1 } }
    ),
    db.collection('users').findOne(
      { _id: participantObjectId, accountStatus: { $ne: 'suspended' } },
      { projection: { name: 1, campus: 1, type: 1 } }
    )
  ]);

  if (!product) return { error: 'Product not found', status: 404 };
  if (!participant) return { error: 'Conversation participant not found', status: 404 };

  const sellerId = asObjectId(product.sellerId);
  if (!sellerId) return { error: 'This listing cannot receive messages', status: 409 };

  const currentUserIsSeller = currentUserId.equals(sellerId);
  const participantIsSeller = participantObjectId.equals(sellerId);
  const conversationId = canonicalConversationId(currentUserId, participantObjectId);
  if (!currentUserIsSeller && !participantIsSeller) {
    return { error: 'Messages must be sent to the seller of this product', status: 403 };
  }

  if (currentUserIsSeller && !participantIsSeller && options.requireExistingSellerThread) {
    const existingMessage = await db.collection('messages').findOne({
      conversationId,
      productId: productObjectId,
      $or: [
        { senderId: currentUserId, receiverId: participantObjectId },
        { senderId: participantObjectId, receiverId: currentUserId }
      ]
    }, { projection: { _id: 1 } });
    if (!existingMessage) return { error: 'The buyer must start this product conversation', status: 403 };
  }

  return { product, participant, productObjectId, participantObjectId, conversationId };
}

exports.getMessages = async (req, res, db) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = new ObjectId(req.user.id);
    const { productId, participantId } = req.query || {};
    let context = null;

    if (productId || participantId) {
      if (!productId || !participantId) {
        return res.status(400).json({ error: 'Product and participant are required', success: false });
      }
      context = await loadProductConversationContext(db, currentUserId, participantId, productId, { requireExistingSellerThread: true });
      if (context.error) return res.status(context.status).json({ error: context.error, success: false });
      if (context.conversationId !== conversationId) {
        return res.status(400).json({ error: 'Invalid conversation', success: false });
      }
    }

    const filter = {
      conversationId,
      $or: [{ senderId: currentUserId }, { receiverId: currentUserId }]
    };
    if (context) filter.productId = context.productObjectId;
    const messages = await db.collection('messages').find(filter).sort({ createdAt: 1 }).toArray();

    res.json({
      success: true,
      messages,
      participant: context?.participant || null,
      product: context ? {
        _id: context.product._id,
        title: context.product.title,
        image: context.product.image,
        imageUrl: context.product.imageUrl
      } : null
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to retrieve messages', success: false });
  }
};

exports.sendMessage = async (req, res, db) => {
  try {
    const { receiverId, text, conversationId, productId } = req.body;
    if (!ObjectId.isValid(receiverId) || typeof text !== 'string') {
      return res.status(400).json({ error: 'A valid recipient and message are required', success: false });
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
    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({ error: 'A valid product is required', success: false });
    }

    const context = await loadProductConversationContext(db, senderId, receiverId, productId, { requireExistingSellerThread: true });
    if (context.error) return res.status(context.status).json({ error: context.error, success: false });

    const message = {
      senderId,
      receiverId: recipientId,
      productId: context.productObjectId,
      conversationId: expectedConversationId,
      text: trimmedText,
      read: false,
      createdAt: new Date()
    };
    const result = await db.collection('messages').insertOne(message);
    res.status(201).json({ success: true, message: { ...message, _id: result.insertedId } });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message', success: false });
  }
};

exports.markMessagesAsRead = async (req, res, db) => {
  try {
    const currentUserId = new ObjectId(req.user.id);
    const productId = asObjectId(req.body?.productId);
    if (!productId) return res.status(400).json({ error: 'A valid product is required', success: false });

    const result = await db.collection('messages').updateMany({
      conversationId: req.params.conversationId,
      productId,
      receiverId: currentUserId,
      read: false
    }, { $set: { read: true, readAt: new Date() } });
    res.json({ success: true, markedRead: result.modifiedCount || 0 });
  } catch (error) {
    console.error('Mark messages read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read', success: false });
  }
};

exports.getConversations = async (req, res, db) => {
  try {
    const currentUserId = new ObjectId(req.user.id);
    const messages = await db.collection('messages').find({
      $or: [{ senderId: currentUserId }, { receiverId: currentUserId }]
    }).sort({ createdAt: -1 }).toArray();

    const grouped = new Map();
    for (const message of messages) {
      const partnerId = message.senderId.equals(currentUserId) ? message.receiverId : message.senderId;
      const key = `${message.conversationId}:${message.productId || 'legacy'}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          conversationId: message.conversationId,
          productId: message.productId || null,
          participantId: partnerId,
          lastMessage: message,
          unreadCount: 0
        });
      }
      if (message.receiverId.equals(currentUserId) && !message.read) grouped.get(key).unreadCount += 1;
    }

    const rows = Array.from(grouped.values()).filter(row => row.productId);
    const participantIds = [...new Map(rows.map(row => [String(row.participantId), row.participantId])).values()];
    const productIds = [...new Map(rows.map(row => [String(row.productId), row.productId])).values()];
    const [participants, products] = await Promise.all([
      participantIds.length ? db.collection('users').find({ _id: { $in: participantIds } }).project({ name: 1, campus: 1 }).toArray() : [],
      productIds.length ? db.collection('products').find({ _id: { $in: productIds } }).project({ title: 1, image: 1, imageUrl: 1 }).toArray() : []
    ]);
    const participantMap = new Map(participants.map(user => [String(user._id), user]));
    const productMap = new Map(products.map(product => [String(product._id), product]));
    const conversations = rows.map(row => ({
      ...row,
      participant: participantMap.get(String(row.participantId)) || { _id: row.participantId, name: 'Marketplace user' },
      product: productMap.get(String(row.productId)) || { _id: row.productId, title: 'Listing' }
    }));
    res.json({ success: true, conversations, unreadCount: conversations.reduce((sum, row) => sum + row.unreadCount, 0) });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to retrieve conversations', success: false });
  }
};

exports.canonicalConversationId = canonicalConversationId;
exports.loadProductConversationContext = loadProductConversationContext;
