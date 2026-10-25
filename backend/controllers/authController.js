// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { getJwtSecret } = require('../config/security');
const { createAccountToken, hashAccountToken } = require('../services/accountTokenService');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../services/emailService');
const { isValidCampusId, pickupLocationFromInput } = require('../services/campusLocationService');
const {
  SUBSCRIPTION_STATUS,
  syncExpiredSellerAccess,
  publicSubscriptionFields
} = require('../services/sellerSubscriptionService');

// Validation helpers
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const clearExpiredPendingEmail = async (db, user) => {
  if (!user?.pendingEmailExpiresAt || new Date(user.pendingEmailExpiresAt) > new Date()) return user;
  await db.collection('users').updateOne(
    { _id: user._id, pendingEmailExpiresAt: { $lte: new Date() } },
    { $unset: { pendingEmail: '', pendingEmailTokenHash: '', pendingEmailExpiresAt: '' } }
  );
  const cleaned = { ...user };
  delete cleaned.pendingEmail;
  delete cleaned.pendingEmailTokenHash;
  delete cleaned.pendingEmailExpiresAt;
  return cleaned;
};

// Register controller
exports.register = async (req, res, db) => {
  try {
    const { name, email, password, campus, whatsapp, type = 'buyer', locationLabel, location } = req.body;
    const normalizedEmail = String(email || '').toLowerCase().trim();

    // simple normalize whatsapp: remove non-digits, allow leading country code (E.164 expected)
    const normalizedWhatsapp = whatsapp ? String(whatsapp).replace(/\D/g, '') : null;

    // Validation
    if (!name || !email || !password || !campus) {
      return res.status(400).json({ 
        error: 'All fields are required',
        success: false
      });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ 
        error: 'Please use a valid email address',
        success: false
      });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters', success: false });
    }

    if (!isValidCampusId(campus)) {
      return res.status(400).json({ 
        error: 'Please select a valid campus',
        success: false
      });
    }

    if (!['buyer', 'seller'].includes(type)) {
      return res.status(400).json({
        error: 'Account type must be buyer or seller',
        success: false
      });
    }

    const normalizedLocationLabel = String(locationLabel || '').trim().slice(0, 80);
    const pickupLocation = pickupLocationFromInput(location);
    if (campus === 'other' && (!normalizedLocationLabel || !pickupLocation)) {
      return res.status(400).json({
        error: 'Add a residence or area name and share its location when choosing Other',
        code: 'CUSTOM_LOCATION_REQUIRED',
        success: false
      });
    }

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ 
      email: normalizedEmail
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User already exists with this email',
        success: false
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const verification = createAccountToken();

    // Create user object
    const now = new Date();
    const userDoc = {
      name: name.trim(),
      email: normalizedEmail,
      campus: campus || null,
      ...(campus === 'other' ? { locationLabel: normalizedLocationLabel, pickupLocation } : {}),
      type,
      hasHadSellerAccess: false,
      subscribed: false,
      subscriptionStatus: type === 'seller'
        ? SUBSCRIPTION_STATUS.PAYMENT_REQUIRED
        : SUBSCRIPTION_STATUS.NONE,
      subscriptionAmount: 25,
      subscriptionCurrency: 'ZAR',
      createdAt: now,
      // store normalized whatsapp (or null)
      whatsapp: normalizedWhatsapp,
      password: hashedPassword,
      emailVerified: false,
      emailVerificationTokenHash: verification.hash,
      emailVerificationExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      updatedAt: now
    };

    // Insert user
    const result = await db.collection('users').insertOne(userDoc);
    userDoc._id = result.insertedId;

    let emailSent = true;
    try {
      await sendVerificationEmail(userDoc, verification.token);
    } catch (emailError) {
      emailSent = false;
      console.error('Registration verification email failed:', emailError.message);
    }

    // Build safe user object (same fields as login)
    const safeUser = {
      _id: userDoc._id,
      name: userDoc.name,
      email: userDoc.email,
      type: userDoc.type,
      campus: userDoc.campus,
      locationLabel: userDoc.locationLabel || null,
      hasCustomLocation: Boolean(userDoc.pickupLocation),
      subscribed: userDoc.subscribed,
      ...publicSubscriptionFields(userDoc),
      whatsapp: userDoc.whatsapp || null,
      emailVerified: false,
      createdAt: userDoc.createdAt,
      updatedAt: userDoc.updatedAt
    };

    res.status(201).json({
      success: true,
      message: emailSent
        ? 'Account created. Check your email to verify your address before signing in.'
        : 'Account created, but the verification email could not be sent. Use resend verification from the login screen.',
      user: safeUser,
      requiresEmailVerification: true,
      emailSent
    });

  } catch (error) {
    console.error('Registration failed:', error.message);
    res.status(500).json({ 
      error: 'Registration failed',
      success: false
    });
  }
};

// Login controller
exports.login = async (req, res, db) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required',
        success: false
      });
    }

    // Find user
    let user = await db.collection('users').findOne({
      email: email.toLowerCase() 
    });
    
    if (!user) {
      return res.status(400).json({ 
        error: 'Invalid email or password',
        success: false
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ 
        error: 'Invalid email or password',
        success: false
      });
    }

    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        error: 'This account has been suspended. Contact support for assistance.',
        code: 'ACCOUNT_SUSPENDED',
        success: false
      });
    }

    if (user.emailVerified === false) {
      return res.status(403).json({
        error: 'Verify your email address before signing in. You can request a new link below.',
        code: 'EMAIL_NOT_VERIFIED',
        success: false
      });
    }

    user = await syncExpiredSellerAccess(db, user);
    user = await clearExpiredPendingEmail(db, user);

    // Create JWT token
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, type: user.type, campus: user.campus },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    // Build safe user object (mirror getCurrentUser) so client always receives the same fields
    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      type: user.type,
      campus: user.campus,
      locationLabel: user.locationLabel || null,
      hasCustomLocation: Boolean(user.pickupLocation),
      subscribed: user.subscribed,
      ...publicSubscriptionFields(user),
      whatsapp: user.whatsapp || null,
      emailVerified: user.emailVerified !== false,
      pendingEmail: user.pendingEmail || null,
      pendingEmailExpiresAt: user.pendingEmailExpiresAt || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
 
    res.json({
      success: true,
      message: 'Login successful',
      user: safeUser,
      token
    });

  } catch (error) {
    console.error('Login failed:', error.message);
    res.status(500).json({ 
      error: 'Login failed',
      success: false
    });
  }
};

// Get current user
exports.getCurrentUser = async (req, res, db) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    // Use the ObjectId already imported at the top of the file
    let user = await db.collection('users').findOne({
      _id: new ObjectId(userId) 
    });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user = await syncExpiredSellerAccess(db, user);
    user = await clearExpiredPendingEmail(db, user);

    // only return safe fields (include whatsapp)
    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      type: user.type,
      campus: user.campus,
      locationLabel: user.locationLabel || null,
      hasCustomLocation: Boolean(user.pickupLocation),
      subscribed: user.subscribed,
      ...publicSubscriptionFields(user),
      whatsapp: user.whatsapp || null,
      emailVerified: user.emailVerified !== false,
      pendingEmail: user.pendingEmail || null,
      pendingEmailExpiresAt: user.pendingEmailExpiresAt || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error('getCurrentUser error', err);
    res.status(500).json({ success: false, error: 'Failed to fetch current user' });
  }
};

exports.verifyEmail = async (req, res, db) => {
  try {
    const token = String(req.body?.token || req.query?.token || '');
    if (!token || token.length > 200) {
      return res.status(400).json({ success: false, error: 'Invalid verification link' });
    }

    const now = new Date();
    const result = await db.collection('users').updateOne(
      {
        emailVerificationTokenHash: hashAccountToken(token),
        emailVerificationExpiresAt: { $gt: now },
        emailVerified: false
      },
      {
        $set: { emailVerified: true, emailVerifiedAt: now, updatedAt: now },
        $unset: { emailVerificationTokenHash: '', emailVerificationExpiresAt: '' }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(400).json({ success: false, error: 'This verification link is invalid or expired' });
    }
    return res.json({ success: true, message: 'Email verified. You can now sign in.' });
  } catch (error) {
    console.error('Email verification failed:', error.message);
    return res.status(500).json({ success: false, error: 'Could not verify email' });
  }
};

exports.resendVerification = async (req, res, db) => {
  const generic = { success: true, message: 'If that account needs verification, a new link has been sent.' };
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
    if (!isValidEmail(email)) return res.json(generic);
    const user = await db.collection('users').findOne({ email });
    if (!user || user.emailVerified !== false) return res.json(generic);

    const verification = createAccountToken();
    const now = new Date();
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: {
        emailVerificationTokenHash: verification.hash,
        emailVerificationExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        updatedAt: now
      } }
    );
    await sendVerificationEmail(user, verification.token);
    return res.json(generic);
  } catch (error) {
    console.error('Resend verification failed:', error.message);
    return res.json(generic);
  }
};

exports.forgotPassword = async (req, res, db) => {
  const generic = { success: true, message: 'If an account exists for that email, a reset link has been sent.' };
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
    if (!isValidEmail(email)) return res.json(generic);
    const user = await db.collection('users').findOne({ email });
    if (!user) return res.json(generic);

    const reset = createAccountToken();
    const now = new Date();
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: {
        passwordResetTokenHash: reset.hash,
        passwordResetExpiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        updatedAt: now
      } }
    );
    await sendPasswordResetEmail(user, reset.token);
    return res.json(generic);
  } catch (error) {
    console.error('Password reset email failed:', error.message);
    return res.json(generic);
  }
};

exports.resetPassword = async (req, res, db) => {
  try {
    const token = String(req.body?.token || '');
    const password = String(req.body?.password || '');
    if (!token || token.length > 200 || password.length < 8) {
      return res.status(400).json({ success: false, error: 'A valid reset link and password of at least 8 characters are required' });
    }

    const now = new Date();
    const user = await db.collection('users').findOne({
      passwordResetTokenHash: hashAccountToken(token),
      passwordResetExpiresAt: { $gt: now }
    });
    if (!user) {
      return res.status(400).json({ success: false, error: 'This reset link is invalid or expired' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await db.collection('users').updateOne(
      { _id: user._id, passwordResetTokenHash: hashAccountToken(token) },
      {
        $set: { password: hashedPassword, passwordChangedAt: now, updatedAt: now },
        $unset: { passwordResetTokenHash: '', passwordResetExpiresAt: '' }
      }
    );
    if (result.matchedCount === 0) {
      return res.status(400).json({ success: false, error: 'This reset link is invalid or expired' });
    }
    return res.json({ success: true, message: 'Password updated. You can now sign in.' });
  } catch (error) {
    console.error('Password reset failed:', error.message);
    return res.status(500).json({ success: false, error: 'Could not reset password' });
  }
};
