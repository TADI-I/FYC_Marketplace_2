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
const { createAccountToken, hashAccountToken } = require('../services/accountTokenService');
const { sendEmailChangeVerificationEmail } = require('../services/emailService');

const EMAIL_CHANGE_WINDOW_MS = 10 * 60 * 1000;

function publicUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    type: user.type,
    campus: user.campus,
    subscribed: user.subscribed,
    ...publicSubscriptionFields(user),
    whatsapp: user.whatsapp || null,
    emailVerified: user.emailVerified !== false,
    pendingEmail: user.pendingEmail || null,
    pendingEmailExpiresAt: user.pendingEmailExpiresAt || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    accountStatus: user.accountStatus || 'active'
  };
}

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
    const { name, campus, email, whatsapp } = req.body;
    const normalizedEmail = String(email || '').toLowerCase().trim();

    // Validation
    if (!name?.trim()) {
      return res.status(400).json({ 
        error: 'Name is required',
        success: false,
        code: 'NAME_REQUIRED'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
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
      email: normalizedEmail,
      _id: { $ne: new ObjectId(userId) }
    });

    if (existingUser) {
      return res.status(409).json({ 
        error: 'Email already exists. Please use a different email.',
        success: false,
        code: 'EMAIL_EXISTS'
      });
    }

    const currentUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found', success: false, code: 'USER_NOT_FOUND' });
    }
    const emailChanged = currentUser.email !== normalizedEmail;
    const verification = emailChanged ? createAccountToken() : null;
    const now = new Date();

    // Build update object
    const updateData = {
      name: name.trim(),
      updatedAt: now
    };
    if (verification) {
      updateData.pendingEmail = normalizedEmail;
      updateData.pendingEmailTokenHash = verification.hash;
      updateData.pendingEmailExpiresAt = new Date(now.getTime() + EMAIL_CHANGE_WINDOW_MS);
    }

    // Only include campus if provided
    if (campus) updateData.campus = campus;
    // WhatsApp is optional; an empty value intentionally clears it.
    updateData.whatsapp = normalizedWhatsapp;

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        success: false,
        code: 'USER_NOT_FOUND'
      });
    }

    // Get updated user to return complete data
    const updatedUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    let verificationEmailSent = true;
    if (verification) {
      try {
        await sendEmailChangeVerificationEmail(updatedUser, normalizedEmail, verification.token);
      } catch (emailError) {
        verificationEmailSent = false;
        console.error('Profile email verification delivery failed:', emailError.message);
        await db.collection('users').updateOne(
          { _id: new ObjectId(userId), pendingEmailTokenHash: verification.hash },
          { $unset: { pendingEmail: '', pendingEmailTokenHash: '', pendingEmailExpiresAt: '' } }
        );
      }
    }

    const responseUser = verificationEmailSent
      ? updatedUser
      : await db.collection('users').findOne({ _id: new ObjectId(userId) });

    res.json({
      success: true,
      message: emailChanged
        ? (verificationEmailSent ? 'Profile updated. Confirm the new email within 10 minutes; your current email remains active until then.' : 'Your profile details were saved, but the email-change message could not be sent. Your current email is unchanged.')
        : 'Profile updated successfully',
      user: publicUser(responseUser),
      requiresEmailVerification: emailChanged && verificationEmailSent,
      verificationEmailSent
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

exports.confirmEmailChange = async (req, res, db) => {
  try {
    const token = String(req.body?.token || req.query?.token || '');
    if (!token || token.length > 200) {
      return res.status(400).json({ success: false, error: 'This email-change link is invalid or expired' });
    }

    const tokenHash = hashAccountToken(token);
    const now = new Date();
    const user = await db.collection('users').findOne({
      pendingEmailTokenHash: tokenHash,
      pendingEmailExpiresAt: { $gt: now }
    });
    if (!user?.pendingEmail) {
      await db.collection('users').updateMany(
        { pendingEmailTokenHash: tokenHash, pendingEmailExpiresAt: { $lte: now } },
        { $unset: { pendingEmail: '', pendingEmailTokenHash: '', pendingEmailExpiresAt: '' } }
      );
      return res.status(400).json({ success: false, error: 'This email-change link is invalid or expired' });
    }

    const conflict = await db.collection('users').findOne({
      email: user.pendingEmail,
      _id: { $ne: user._id }
    });
    if (conflict) {
      return res.status(409).json({ success: false, error: 'That email address is no longer available. Request a different address from your profile.' });
    }

    const result = await db.collection('users').updateOne(
      {
        _id: user._id,
        pendingEmailTokenHash: tokenHash,
        pendingEmailExpiresAt: { $gt: now }
      },
      {
        $set: {
          email: user.pendingEmail,
          emailVerified: true,
          emailVerifiedAt: now,
          updatedAt: now
        },
        $unset: { pendingEmail: '', pendingEmailTokenHash: '', pendingEmailExpiresAt: '' }
      }
    );
    if (result.matchedCount === 0) {
      return res.status(400).json({ success: false, error: 'This email-change link is invalid or expired' });
    }
    return res.json({ success: true, message: 'Your email address has been updated. Use it the next time you sign in.' });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, error: 'That email address is no longer available. Request a different address from your profile.' });
    }
    console.error('Email change confirmation failed:', error.message);
    return res.status(500).json({ success: false, error: 'Could not confirm the email change' });
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
      .project({
        password: 0,
        passwordResetTokenHash: 0,
        passwordResetExpiresAt: 0,
        emailVerificationTokenHash: 0,
        emailVerificationExpiresAt: 0,
        pendingEmailTokenHash: 0
      })
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

exports.getAdminOverview = async (_req, res, db) => {
  try {
    const now = new Date();
    const [users, sellers, activeSellers, products, pendingVerifications, suspendedUsers] = await Promise.all([
      db.collection('users').countDocuments({}),
      db.collection('users').countDocuments({ type: 'seller' }),
      db.collection('users').countDocuments({ type: 'seller', subscribed: true, accountStatus: { $ne: 'suspended' }, $or: [
        { subscriptionEndDate: { $exists: false } },
        { subscriptionEndDate: { $gte: now } }
      ] }),
      db.collection('products').countDocuments({ status: 'active' }),
      db.collection('verificationRequests').countDocuments({ status: 'pending' }),
      db.collection('users').countDocuments({ accountStatus: 'suspended' })
    ]);
    return res.json({ success: true, overview: { users, sellers, activeSellers, products, pendingVerifications, suspendedUsers } });
  } catch (error) {
    console.error('Admin overview failed:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to load the admin overview.' });
  }
};

exports.adminUpdateUser = async (req, res, db) => {
  try {
    const targetId = req.params.id;
    const target = await db.collection('users').findOne({ _id: new ObjectId(targetId) });
    if (!target) return res.status(404).json({ success: false, error: 'User not found.' });

    const update = { updatedAt: new Date() };
    if (typeof req.body.name === 'string' && req.body.name.trim()) update.name = req.body.name.trim();
    if (typeof req.body.email === 'string') {
      const email = req.body.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, error: 'Enter a valid email address.' });
      const duplicate = await db.collection('users').findOne({ email, _id: { $ne: target._id } });
      if (duplicate) return res.status(409).json({ success: false, error: 'That email address is already in use.' });
      update.email = email;
    }
    if (typeof req.body.campus === 'string' && req.body.campus) update.campus = req.body.campus;
    if (req.body.whatsapp === null || typeof req.body.whatsapp === 'string') update.whatsapp = req.body.whatsapp ? req.body.whatsapp.replace(/\D/g, '') : null;
    if (typeof req.body.verified === 'boolean') {
      update.verified = req.body.verified;
      update.verifiedAt = req.body.verified ? new Date() : null;
    }
    if (['buyer', 'seller'].includes(req.body.type) && target.type !== 'admin') {
      update.type = req.body.type;
      if (req.body.type === 'buyer') {
        update.subscribed = false;
        update.subscriptionStatus = SUBSCRIPTION_STATUS.NONE;
      }
    }
    if (['active', 'suspended'].includes(req.body.accountStatus)) {
      if (String(target._id) === String(req.user.id) && req.body.accountStatus === 'suspended') {
        return res.status(400).json({ success: false, error: 'You cannot suspend your own administrator account.' });
      }
      update.accountStatus = req.body.accountStatus;
      update.suspendedAt = req.body.accountStatus === 'suspended' ? new Date() : null;
      update.suspendedBy = req.body.accountStatus === 'suspended' ? new ObjectId(req.user.id) : null;
    }

    await db.collection('users').updateOne({ _id: target._id }, { $set: update });
    const user = await db.collection('users').findOne({ _id: target._id }, { projection: {
      password: 0,
      passwordResetTokenHash: 0,
      passwordResetExpiresAt: 0,
      emailVerificationTokenHash: 0,
      emailVerificationExpiresAt: 0,
      pendingEmailTokenHash: 0
    } });
    return res.json({ success: true, user });
  } catch (error) {
    console.error('Admin user update failed:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update the user.' });
  }
};
