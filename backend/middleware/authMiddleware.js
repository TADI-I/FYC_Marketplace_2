// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const {
  SUBSCRIPTION_STATUS,
  hasActiveSellerAccess,
  syncExpiredSellerAccess
} = require('../services/sellerSubscriptionService');

// JWT authentication middleware
exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      success: false
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'tut_marketplace_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ 
        error: 'Invalid or expired token',
        success: false
      });
    }
    req.user = user;
    next();
  });
};
// ...existing code...
exports.requireAdmin = (req, res, next) => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        success: false
      });
    }
    next();
  } catch (err) {
    console.error('Admin check error:', err);
    res.status(500).json({ error: 'Server error', success: false });
  }
};

// Create a reactivation request (user requests admin review)
exports.createReactivationRequest = async (req, res, db) => {
  try {
    const userId = req.params.id;
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID', success: false });
    }

    // Only the user themself (or admin) may create this request
    if (req.user.id !== userId && req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Not allowed', success: false });
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
      note: req.body.note || '',
      status: 'pending',
      requestedAt: new Date(),
      processedAt: null,
      adminId: null,
      adminNote: null
    };

    const result = await db.collection('reactivationRequests').insertOne(doc);
    doc._id = result.insertedId;

    res.status(201).json({ success: true, request: doc });
  } catch (error) {
    console.error('❌ Create reactivation request error:', error);
    res.status(500).json({ error: 'Failed to create request', success: false });
  }
};

// Admin: list all reactivation requests
exports.getReactivationRequests = async (req, res, db) => {
  try {
    const requests = await db.collection('reactivationRequests')
      .find({})
      .sort({ requestedAt: -1 })
      .toArray();

    // Optionally populate user info
    const userIds = requests.map(r => r.userId);
    const users = await db.collection('users').find({ _id: { $in: userIds } }).toArray();
    const usersMap = users.reduce((acc, u) => { acc[u._id.toString()] = u; return acc; }, {});

    const payload = requests.map(r => ({
      ...r,
      user: usersMap[r.userId.toString()] ? { 
        _id: usersMap[r.userId.toString()]._id,
        name: usersMap[r.userId.toString()].name,
        email: usersMap[r.userId.toString()].email,
        subscriptionStatus: usersMap[r.userId.toString()].subscriptionStatus
      } : null
    }));

    res.json({ success: true, requests: payload });
  } catch (error) {
    console.error('❌ Get reactivation requests error:', error);
    res.status(500).json({ error: 'Failed to load requests', success: false });
  }
};

// Admin: process (approve/reject) a request
exports.processReactivationRequest = async (req, res, db) => {
  try {
    const requestId = req.params.requestId;
    const { action, adminNote = '', subscriptionType = 'monthly' } = req.body;

    if (!ObjectId.isValid(requestId)) {
      return res.status(400).json({ error: 'Invalid request ID', success: false });
    }

    const requestDoc = await db.collection('reactivationRequests').findOne({ _id: new ObjectId(requestId) });
    if (!requestDoc) return res.status(404).json({ error: 'Request not found', success: false });
    if (requestDoc.status !== 'pending') return res.status(409).json({ error: 'Request already processed', success: false });

    const adminId = new ObjectId(req.user.id);
    const patch = {
      status: action === 'approve' ? 'approved' : 'rejected',
      processedAt: new Date(),
      adminId,
      adminNote
    };

    await db.collection('reactivationRequests').updateOne({ _id: new ObjectId(requestId) }, { $set: patch });

    if (action === 'approve') {
      // grant seller subscription (30 days monthly or 365 yearly)
      const days = subscriptionType === 'monthly' ? 30 : 365;
      const subscriptionEndDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      await db.collection('users').updateOne(
        { _id: requestDoc.userId },
        {
          $set: {
            subscribed: true,
            subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE,
            subscriptionStartDate: new Date(),
            subscriptionEndDate,
            type: 'seller',
            updatedAt: new Date()
          }
        }
      );
    }

    res.json({ success: true, message: `Request ${action}ed` });
  } catch (error) {
    console.error('❌ Process reactivation request error:', error);
    res.status(500).json({ error: 'Failed to process request', success: false });
  }
};

// ...existing code...

// Middleware to check if user has active subscription
exports.requireActiveSubscription = async (req, res, next, db) => {
  try {
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        success: false
      });
    }

    if (user.type !== 'seller' || !user.subscribed) {
      return res.status(403).json({ 
        error: 'Active seller subscription required',
        code: 'SUBSCRIPTION_REQUIRED',
        success: false
      });
    }

    // Check if subscription has expired
    if (!hasActiveSellerAccess(user)) {
      await syncExpiredSellerAccess(db, user);
      
      return res.status(403).json({ 
        error: 'Subscription has expired',
        code: 'SUBSCRIPTION_EXPIRED',
        success: false
      });
    }

    req.userProfile = user;
    next();

  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ 
      error: 'Error checking subscription',
      success: false
    });
  }
};

// Validate ObjectId middleware
exports.validateObjectId = (paramName) => (req, res, next) => {
  const id = req.params[paramName];
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ 
      error: `Invalid ${paramName} ID format`,
      success: false
    });
  }
  next();
};

// Check ownership middleware
exports.requireOwnership = (resourceType) => async (req, res, next, db) => {
  try {
    const userId = req.user.id;
    const resourceId = req.params.id;
    
    let resource;
    
    switch(resourceType) {
      case 'user':
        resource = await db.collection('users').findOne({ _id: new ObjectId(resourceId) });
        break;
      case 'product':
        resource = await db.collection('products').findOne({ _id: new ObjectId(resourceId) });
        break;
      default:
        return res.status(500).json({ 
          error: 'Invalid resource type',
          success: false
        });
    }
    
    if (!resource) {
      return res.status(404).json({ 
        error: `${resourceType} not found`,
        success: false
      });
    }
    
    // Check if user owns the resource
    const ownerId = resourceType === 'user' ? resource._id.toString() : resource.sellerId.toString();
    
    if (ownerId !== userId && req.user.type !== 'admin') {
      return res.status(403).json({ 
        error: `You do not have permission to access this ${resourceType}`,
        success: false
      });
    }
    
    next();
  } catch (error) {
    console.error('Ownership check error:', error);
    res.status(500).json({ 
      error: 'Error checking ownership',
      success: false
    });
  }
};
