// controllers/userController.js
const { ObjectId, GridFSBucket } = require('mongodb');

// Get subscription status
exports.getSubscriptionStatus = async (req, res, db) => {
  try {
    const user = await db.collection('users')
      .findOne({ _id: new ObjectId(req.user.id) });

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        success: false
      });
    }

    const hasActiveSubscription = user.subscribed && 
      (!user.subscriptionEndDate || new Date() <= new Date(user.subscriptionEndDate));

    res.json({
      success: true,
      hasActiveSubscription,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionEndDate: user.subscriptionEndDate,
      canSell: hasActiveSubscription
    });

  } catch (error) {
    console.error('❌ Subscription status error:', error);
    res.status(500).json({ 
      error: 'Failed to check subscription status: ' + error.message,
      success: false
    });
  }
};

// Update user profile
exports.updateUserProfile = async (req, res, db) => {
  try {
    const userId = req.params.id;
    console.log('✏️ Updating user profile for user ID:', userId);
    console.log('👤 Authenticated user ID:', req.user.id);
    console.log('📦 Request body:', req.body);
    
    const { name, campus, email, whatsapp } = req.body;

    // Validation
    if (!name?.trim()) {
      return res.status(400).json({ 
        error: 'Name is required',
        success: false,
        code: 'NAME_REQUIRED'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Please enter a valid email address',
        success: false,
        code: 'INVALID_EMAIL_FORMAT'
      });
    }

    // normalize whatsapp if provided
    let normalizedWhatsapp = null;
    if (whatsapp) {
      normalizedWhatsapp = String(whatsapp).replace(/\D/g, '');
      if (normalizedWhatsapp.length < 7) {
        return res.status(400).json({
          error: 'Please enter a valid WhatsApp number',
          success: false,
          code: 'INVALID_WHATSAPP'
        });
      }
    }

    // Check if email already exists (for different user)
    const existingUser = await db.collection('users').findOne({
      email: email.toLowerCase().trim(),
      _id: { $ne: new ObjectId(userId) }
    });

    if (existingUser) {
      return res.status(409).json({ 
        error: 'Email already exists. Please use a different email.',
        success: false,
        code: 'EMAIL_EXISTS'
      });
    }

    // Build update object
    const updateData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      updatedAt: new Date()
    };

    // Only include campus if provided
    if (campus) updateData.campus = campus;
    // Include whatsapp if provided
    if (normalizedWhatsapp !== null) updateData.whatsapp = normalizedWhatsapp;

    console.log('📤 Update data:', updateData);

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    );

    console.log('✅ MongoDB update result:', result);

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        success: false,
        code: 'USER_NOT_FOUND'
      });
    }

    // Get updated user to return complete data
    const updatedUser = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );

    console.log('✅ User profile updated successfully');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    
    // Handle invalid ObjectId error
    if (error.message.includes('ObjectId') || error.message.includes('hex string')) {
      return res.status(400).json({ 
        error: 'Invalid user ID format',
        success: false,
        code: 'INVALID_USER_ID'
      });
    }

    res.status(500).json({ 
      error: 'Failed to update profile',
      success: false,
      code: 'UPDATE_FAILED'
    });
  }
};

// Get user profile
exports.getUserProfile = async (req, res, db) => {
  try {
    const userId = req.params.id;
    console.log('👤 Getting user profile for ID:', userId);
    
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        error: 'Invalid user ID',
        success: false
      });
    }

    const user = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        success: false
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('❌ Get user profile error:', error);
    res.status(500).json({ 
      error: 'Failed to get user profile: ' + error.message,
      success: false
    });
  }
};

// Upgrade user to seller
exports.upgradeUserToSeller = async (_req, res) => {
  return res.status(410).json({
    error: 'Direct seller upgrades are disabled. Start verified subscription checkout.',
    code: 'PAYMENT_REQUIRED',
    success: false
  });
};

// Create a reactivation request (user requests admin review)
exports.createReactivationRequest = async (req, res, db) => {
  try {
    console.log('🔔 createReactivationRequest called by', req.user?.id);
    const userId = req.params.id;
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID', success: false });
    }

    // Only the user themself (or admin) may create this request
    if (req.user.id !== userId && req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Not allowed', success: false });
    }

    // Check target user exists and is not already active
    const targetUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found', success: false });
    }

    const hasActiveSubscription = targetUser.subscribed &&
      (!targetUser.subscriptionEndDate || new Date() <= new Date(targetUser.subscriptionEndDate));
    if (hasActiveSubscription) {
      return res.status(409).json({ error: 'Account already active', success: false });
    }

    const existing = await db.collection('reactivationRequests').findOne({
      userId: new ObjectId(userId),
      status: 'pending'
    });

    if (existing) {
      return res.status(409).json({ error: 'A pending request already exists', success: false });
    }

    const doc = {
      userId: new ObjectId(userId),
      userNote: req.body.note || '', // Renamed from 'note' to 'userNote' for clarity
      status: 'pending',
      requestedAt: new Date(),
      processedAt: null,
      adminId: null,
      adminNote: null
    };

    const result = await db.collection('reactivationRequests').insertOne(doc);
    doc._id = result.insertedId;

    console.log('✅ Reactivation request created:', doc._id);
    res.status(201).json({ success: true, request: doc });
  } catch (error) {
    console.error('❌ Create reactivation request error:', error);
    res.status(500).json({ error: 'Failed to create request', success: false });
  }
};

// Admin: list pending reactivation requests only
exports.getReactivationRequests = async (req, res, db) => {
  try {
    console.log('🔎 getReactivationRequests called by', req.user?.id);

    // optional query param ?status=pending|approved|rejected (defaults to all)
    const status = req.query.status;
    const filter = (status && status !== 'all') ? { status } : {};

    const requests = await db.collection('reactivationRequests')
      .find(filter)
      .sort({ requestedAt: -1 })
      .toArray();

    const userIds = requests.map(r => r.userId).filter(Boolean);
    let usersMap = {};
    if (userIds.length) {
      const users = await db.collection('users').find({ _id: { $in: userIds } }).toArray();
      usersMap = users.reduce((acc, u) => { acc[u._id.toString()] = u; return acc; }, {});
    }

    // Include admin info for processed requests
    const adminIds = requests
      .map(r => r.adminId)
      .filter(id => id && ObjectId.isValid(id));
    let adminsMap = {};
    if (adminIds.length) {
      const admins = await db.collection('users')
        .find({ _id: { $in: adminIds } })
        .project({ name: 1, email: 1 })
        .toArray();
      adminsMap = admins.reduce((acc, a) => { acc[a._id.toString()] = a; return acc; }, {});
    }

    const payload = requests.map(r => ({
      ...r,
      user: usersMap[r.userId?.toString()] ? {
        _id: usersMap[r.userId.toString()]._id,
        name: usersMap[r.userId.toString()].name,
        email: usersMap[r.userId.toString()].email,
        subscriptionStatus: usersMap[r.userId.toString()].subscriptionStatus
      } : null,
      admin: r.adminId && adminsMap[r.adminId.toString()] ? {
        _id: adminsMap[r.adminId.toString()]._id,
        name: adminsMap[r.adminId.toString()].name,
        email: adminsMap[r.adminId.toString()].email
      } : null
    }));

    // also return counts by status for UI convenience
    const counts = payload.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {});

    res.json({ success: true, requests: payload, counts });
  } catch (error) {
    console.error('❌ Get reactivation requests error:', error);
    res.status(500).json({ error: 'Failed to load requests', success: false });
  }
};

// Admin: process (approve/reject) a request
exports.processReactivationRequest = async (req, res, db) => {
  try {
    console.log('🔧 processReactivationRequest called by', req.user?.id, 'body:', req.body);
    const requestId = req.params.requestId;
    const { action, adminNote = '' } = req.body;

    if (!ObjectId.isValid(requestId)) {
      return res.status(400).json({ error: 'Invalid request ID', success: false });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be "approve" or "reject"', success: false });
    }

    const requestDoc = await db.collection('reactivationRequests').findOne({ _id: new ObjectId(requestId) });
    if (!requestDoc) return res.status(404).json({ error: 'Request not found', success: false });
    if (requestDoc.status !== 'pending') return res.status(409).json({ error: 'Request already processed', success: false });

    if (action === 'approve') {
      const paidUser = await db.collection('users').findOne({
        _id: requestDoc.userId,
        subscribed: true,
        subscriptionStatus: 'active',
        subscriptionPaymentId: { $exists: true }
      });
      if (!paidUser) {
        return res.status(409).json({
          error: 'Verified subscription payment is required before approval.',
          code: 'PAYMENT_REQUIRED',
          success: false
        });
      }
    }

    const adminId = new ObjectId(req.user.id);
    const patch = {
      status: action === 'approve' ? 'approved' : 'rejected',
      processedAt: new Date(),
      adminId,
      adminNote: adminNote.trim() // Store admin's note
    };

    await db.collection('reactivationRequests').updateOne({ _id: new ObjectId(requestId) }, { $set: patch });

    res.json({ success: true, message: `Request ${action}ed successfully` });
  } catch (error) {
    console.error('❌ Process reactivation request error:', error);
    res.status(500).json({ error: 'Failed to process request', success: false });
  }
};

// Admin: list users (buyers/sellers/all)


// Get all users (admin only)
exports.getAllUsers = async (req, res, db) => {
  try {
    const { type } = req.query;
    
    let filter = {};
    if (type && type !== 'all') {
      filter.type = type;
    }

    const users = await db.collection('users')
      .find(filter)
      .project({ password: 0 }) // Don't send passwords
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`✅ Retrieved ${users.length} users`);

    res.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('❌ Get all users error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve users',
      success: false
    });
  }
};
