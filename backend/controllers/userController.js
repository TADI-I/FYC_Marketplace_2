// controllers/userController.js
const { ObjectId, GridFSBucket } = require('mongodb');
const subscriptionPaymentController = require('./subscriptionPaymentController');
const {
  SUBSCRIPTION_STATUS,
  hasHistoricalSellerActivation,
  hasActiveSellerAccess,
  syncExpiredSellerAccess,
  publicSubscriptionFields
} = require('../services/sellerSubscriptionService');
const { getEligibleOffers } = require('../services/sellerOfferService');

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

    const syncedUser = await syncExpiredSellerAccess(db, user);
    Object.assign(user, syncedUser);
    const hasActiveSubscription = hasActiveSellerAccess(user);

    res.json({
      success: true,
      hasActiveSubscription,
      ...publicSubscriptionFields(user),
      canSell: hasActiveSubscription,
      requiresPayment: user.type === 'seller' && !hasActiveSubscription && hasHistoricalSellerActivation(user)
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

// Activate seller account type. Offers are presented for an explicit claim;
// this endpoint never starts a free period automatically.
exports.upgradeUserToSeller = async (req, res, db) => {
  try {
    const userId = req.params.id || req.user.id;
    const objectId = new ObjectId(userId);
    let user = await db.collection('users').findOne({ _id: objectId });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    if (hasActiveSellerAccess(user)) {
      const { password, ...safeUser } = user;
      return res.json({
        success: true,
        activation: user.subscriptionStatus === SUBSCRIPTION_STATUS.TRIAL ? 'TRIAL' : 'ACTIVE',
        alreadyActive: true,
        user: safeUser
      });
    }

    if (user.type !== 'seller') {
      await db.collection('users').updateOne(
        { _id: objectId },
        { $set: {
          type: 'seller',
          subscriptionStatus: SUBSCRIPTION_STATUS.PAYMENT_REQUIRED,
          updatedAt: new Date()
        } }
      );
      user = {
        ...user,
        type: 'seller',
        subscriptionStatus: SUBSCRIPTION_STATUS.PAYMENT_REQUIRED
      };
    }

    const offers = await getEligibleOffers(db, user);
    if (offers.length) {
      const { password, ...safeUser } = user;
      return res.json({
        success: true,
        activation: 'OFFER_AVAILABLE',
        claimRequired: true,
        offers,
        user: safeUser
      });
    }

    return subscriptionPaymentController.startCheckout(req, res, db);
  } catch (error) {
    console.error('Seller activation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Could not activate seller status.'
    });
  }
};

// Kept as a compatibility response for older clients. Seller activation is
// automatic and never enters an administrator approval queue.
exports.createReactivationRequest = async (_req, res) => {
  return res.status(410).json({
    success: false,
    code: 'ADMIN_APPROVAL_REMOVED',
    error: 'Seller activation no longer requires admin approval. Use Become a Seller from your profile.'
  });
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

// Historical requests remain readable, but they can no longer grant access.
exports.processReactivationRequest = async (_req, res) => {
  return res.status(410).json({
    success: false,
    code: 'ADMIN_APPROVAL_REMOVED',
    error: 'Seller access is activated automatically or by verified subscription payment.'
  });
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
