// routes/index.js
const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');
const productController = require('../controllers/productController');
const userController = require('../controllers/userController');
const messageController = require('../controllers/messageController');
const referenceController = require('../controllers/referenceController');
const healthController = require('../controllers/healthController');
const verificationController = require('../controllers/verificationController');
const subscriptionPaymentController = require('../controllers/subscriptionPaymentController');
const sellerOfferController = require('../controllers/sellerOfferController');
const { createRateLimit } = require('../middleware/rateLimit');

// Import middleware
const { 
  authenticateToken, 
  requireActiveSubscription,
  validateObjectId,
  requireOwnership,
  requireAdmin
} = require('../middleware/authMiddleware');

// Database dependency injection middleware
const injectDb = (db) => (req, res, next) => {
  req.db = db;
  next();
};

// Middleware with db injection
const withDb = (controllerFn) => (req, res) => {
  controllerFn(req, res, req.db);
};
const contactRevealRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: 'Too many seller contact requests. Please try again later.',
  keyGenerator: req => req.user?.id || req.ip || 'unknown'
});

const withSubscriptionCheck = (req, res, next) => {
  requireActiveSubscription(req, res, next, req.db);
};

const withOwnershipCheck = (resourceType) => (req, res, next) => {
  requireOwnership(resourceType)(req, res, next, req.db);
};

module.exports = (db) => {
  // Health checks
  router.get('/health', withDb(healthController.healthCheck));
  router.get('/test-db', withDb(healthController.testDbConnection));

  // Auth routes
  router.post('/auth/register', withDb(authController.register));
  router.post('/auth/login', withDb(authController.login));
  router.post('/auth/verify-email', withDb(authController.verifyEmail));
  router.post('/auth/resend-verification', withDb(authController.resendVerification));
  router.post('/auth/forgot-password', withDb(authController.forgotPassword));
  router.post('/auth/reset-password', withDb(authController.resetPassword));
  router.post('/auth/confirm-email-change', withDb(userController.confirmEmailChange));

  // User routes
  router.get('/users/me', authenticateToken, withDb(authController.getCurrentUser));
  router.get('/users/:id', authenticateToken, validateObjectId('id'), withDb(userController.getUserProfile));
  router.put('/users/:id', authenticateToken, validateObjectId('id'), withOwnershipCheck('user'), withDb(userController.updateUserProfile));
  router.post('/users/:id/upgrade', authenticateToken, validateObjectId('id'), withOwnershipCheck('user'), withDb(userController.upgradeUserToSeller));
  router.post('/subscriptions/checkout', authenticateToken, withDb(subscriptionPaymentController.startCheckout));
  router.post('/webhooks/payments', withDb(subscriptionPaymentController.handleCallback));
  router.get('/user/subscription-status', authenticateToken, withDb(userController.getSubscriptionStatus));
  router.get('/seller-offers/eligible', authenticateToken, withDb(sellerOfferController.getEligibleOffers));
  router.post('/seller-offers/:offerId/claim', authenticateToken, validateObjectId('offerId'), withDb(sellerOfferController.claimOffer));
  router.post('/users/:id/reactivate-request', authenticateToken, validateObjectId('id'), withDb(userController.createReactivationRequest));

  // Admin endpoints
  router.get('/admin/reactivation-requests', authenticateToken, requireAdmin, withDb(userController.getReactivationRequests));
  router.get('/admin/overview', authenticateToken, requireAdmin, withDb(userController.getAdminOverview));
  router.get('/admin/users', authenticateToken, requireAdmin, withDb(userController.getAllUsers));
  router.patch('/admin/users/:id', authenticateToken, requireAdmin, validateObjectId('id'), withDb(userController.adminUpdateUser));
  router.post('/admin/reactivation-requests/:requestId/process', authenticateToken, requireAdmin, validateObjectId('requestId'), withDb(userController.processReactivationRequest));
// Verification routes
 router.post(
    '/verification/:userId/submit',
    authenticateToken,
    validateObjectId('userId'),
    withOwnershipCheck('user'),
    verificationController.upload.single('idPhoto'),
    withDb(verificationController.submitVerificationRequest)
  );

  router.get(
    '/verification/:userId/status',
    authenticateToken,
    validateObjectId('userId'),
    withOwnershipCheck('user'),
    withDb(verificationController.getVerificationStatus)
  );

  router.get(
    '/verification/requests',
    authenticateToken,
    requireAdmin,
    withDb(verificationController.getVerificationRequests)
  );

  router.get(
    '/verification/image/:imageId',
    authenticateToken,
    requireAdmin,
    withDb(verificationController.getVerificationImage)
  );

  router.post(
    '/verification/:requestId/process',
    authenticateToken,
    requireAdmin,
    validateObjectId('requestId'),
    withDb(verificationController.processVerificationRequest)
  );
  // Product routes
  router.get('/products', withDb(productController.getProducts));
  router.post('/products/nearby', withDb(productController.getNearbyProducts));
  router.get('/products/:id/contact', authenticateToken, contactRevealRateLimit, validateObjectId('id'), withDb(productController.getProductContact));
  router.get('/products/:id', validateObjectId('id'), withDb(productController.getProductById));
  router.get('/products/seller/:sellerId', validateObjectId('sellerId'), withDb(productController.getProductsBySeller));
  router.post('/products', authenticateToken, withSubscriptionCheck, withDb(productController.createProduct));
  router.put('/products/:id', authenticateToken, validateObjectId('id'), withOwnershipCheck('product'), withDb(productController.updateProduct));
  router.delete('/products/:id', authenticateToken, validateObjectId('id'), withOwnershipCheck('product'), withDb(productController.deleteProduct));

  // Message routes
  router.get('/messages', authenticateToken, withDb(messageController.getConversations));
  router.patch('/messages/:conversationId/read', authenticateToken, withDb(messageController.markMessagesAsRead));
  router.get('/messages/:conversationId', authenticateToken, withDb(messageController.getMessages));
  router.post('/messages', authenticateToken, withDb(messageController.sendMessage));

  // Reference data routes
  router.get('/campuses', withDb(referenceController.getCampuses));
  router.get('/categories', referenceController.getCategories);

  return router;
};
