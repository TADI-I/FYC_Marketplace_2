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

  // User routes
  router.get('/users/me', authenticateToken, withDb(authController.getCurrentUser));
  router.get('/users/:id', authenticateToken, validateObjectId('id'), withDb(userController.getUserProfile));
  router.put('/users/:id', authenticateToken, validateObjectId('id'), withOwnershipCheck('user'), withDb(userController.updateUserProfile));
  router.post('/users/:id/upgrade', authenticateToken, validateObjectId('id'), withOwnershipCheck('user'), withDb(subscriptionPaymentController.startCheckout));
  router.post('/subscriptions/checkout', authenticateToken, withDb(subscriptionPaymentController.startCheckout));
  router.post('/webhooks/payments', withDb(subscriptionPaymentController.handleCallback));
  router.get('/user/subscription-status', authenticateToken, withDb(userController.getSubscriptionStatus));
  router.post('/users/:id/reactivate-request', authenticateToken, validateObjectId('id'), withDb(userController.createReactivationRequest));

  // Admin endpoints
  router.get('/admin/reactivation-requests', authenticateToken, requireAdmin, withDb(userController.getReactivationRequests));
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
  router.get('/products/:id', validateObjectId('id'), withDb(productController.getProductById));
  router.get('/products/seller/:sellerId', validateObjectId('sellerId'), withDb(productController.getProductsBySeller));
  router.post('/products', authenticateToken, withSubscriptionCheck, withDb(productController.createProduct));
  router.put('/products/:id', authenticateToken, validateObjectId('id'), withOwnershipCheck('product'), withDb(productController.updateProduct));
  router.delete('/products/:id', authenticateToken, validateObjectId('id'), withOwnershipCheck('product'), withDb(productController.deleteProduct));

  // Message routes
  router.get('/messages/:conversationId', authenticateToken, withDb(messageController.getMessages));
  router.post('/messages', authenticateToken, withDb(messageController.sendMessage));

  // Reference data routes
  router.get('/campuses', referenceController.getCampuses);
  router.get('/categories', referenceController.getCategories);

  return router;
};
