const { ObjectId } = require('mongodb');
const paymentService = require('../services/paymentService');

const MONTHLY_SUBSCRIPTION_CENTS = 2500;

async function activateSubscriptionForPaidOrder(db, order, payment, activatedAt = new Date()) {
  const providerPaidAt = payment.paidAt ? new Date(payment.paidAt) : activatedAt;
  const paidAt = Number.isNaN(providerPaidAt.getTime()) ? activatedAt : providerPaidAt;

  await db.collection('users').updateOne(
    { _id: order.userId },
    {
      $set: {
        type: 'seller',
        subscribed: true,
        subscriptionType: order.plan,
        subscriptionStatus: 'active',
        subscriptionStartDate: order.servicePeriodStart,
        subscriptionPaymentId: order._id.toString(),
        updatedAt: activatedAt
      },
      $max: { subscriptionEndDate: order.servicePeriodEnd }
    }
  );

  await db.collection('subscriptionOrders').updateOne(
    { _id: order._id },
    { $set: { status: 'PAID', paidAt, activatedAt, updatedAt: activatedAt } }
  );

  await db.collection('reactivationRequests').updateMany(
    { userId: order.userId, status: 'pending' },
    {
      $set: {
        status: 'approved',
        processedAt: activatedAt,
        adminId: null,
        adminNote: 'Automatically approved after verified subscription payment.',
        subscriptionPaymentId: order._id.toString()
      }
    }
  );
}

exports.activateSubscriptionForPaidOrder = activateSubscriptionForPaidOrder;

exports.startCheckout = async (req, res, db) => {
  try {
    const userId = req.params.id || req.user.id;
    if (userId !== req.user.id && req.user.type !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not allowed.' });
    }
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    const existing = await db.collection('subscriptionOrders').findOne({
      userId: user._id,
      status: { $in: ['PENDING', 'PROCESSING'] },
      expiresAt: { $gt: new Date() }
    });
    if (existing?.authorizationUrl) {
      return res.json({
        success: true,
        orderId: existing._id,
        paymentReference: existing.paymentReference,
        authorizationUrl: existing.authorizationUrl
      });
    }

    const now = new Date();
    const period = paymentService.subscriptionPeriod(user, now);
    const order = {
      userId: user._id,
      plan: 'monthly',
      amount: MONTHLY_SUBSCRIPTION_CENTS,
      currency: 'ZAR',
      status: 'PENDING',
      servicePeriodStart: period.start,
      servicePeriodEnd: period.end,
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
      createdAt: now,
      updatedAt: now
    };
    const inserted = await db.collection('subscriptionOrders').insertOne(order);
    const orderId = inserted.insertedId.toString();
    try {
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
      const result = await paymentService.createPayment({
        idempotencyKey: `marketplace:${orderId}:seller-subscription`,
        tenantId: user._id.toString(),
        orderId,
        customerId: user._id.toString(),
        email: user.email,
        amount: MONTHLY_SUBSCRIPTION_CENTS,
        currency: 'ZAR',
        returnUrl: `${frontendUrl}/?payment=return&order=${encodeURIComponent(orderId)}`,
        metadata: { purpose: 'seller_subscription', plan: 'monthly' }
      });
      await db.collection('subscriptionOrders').updateOne(
        { _id: inserted.insertedId },
        { $set: {
          status: 'PROCESSING',
          centralPaymentId: result.payment.id,
          paymentReference: result.payment.reference,
          authorizationUrl: result.authorizationUrl,
          updatedAt: new Date()
        } }
      );
      return res.status(201).json({
        success: true,
        orderId,
        paymentReference: result.payment.reference,
        authorizationUrl: result.authorizationUrl
      });
    } catch (error) {
      await db.collection('subscriptionOrders').updateOne(
        { _id: inserted.insertedId },
        { $set: { status: 'FAILED', failureReason: error.code || 'PAYMENT_SERVICE_ERROR', updatedAt: new Date() } }
      );
      throw error;
    }
  } catch (error) {
    console.error('Subscription checkout failed:', error.message);
    return res.status(error.status >= 400 && error.status < 500 ? error.status : 503).json({
      success: false,
      error: error.message || 'Could not start subscription checkout.',
      code: error.code || 'SUBSCRIPTION_CHECKOUT_FAILED'
    });
  }
};

exports.handleCallback = async (req, res, db) => {
  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
  const signature = req.get('x-lbg-signature') || '';
  const timestamp = req.get('x-lbg-timestamp') || '';
  if (!paymentService.verifyCallback({ rawBody, signature, timestamp })) {
    return res.status(401).json({ success: false, error: 'Invalid payment callback signature.' });
  }
  if (!paymentService.validateCallbackPayload(req.body)) {
    return res.status(422).json({ success: false, error: 'Invalid payment callback payload.' });
  }

  const payload = req.body;
  try {
    const existingEvent = await db.collection('paymentCallbackEvents').findOne({ eventId: payload.id });
    if (existingEvent?.processedAt) return res.json({ success: true, idempotent: true });
    await db.collection('paymentCallbackEvents').updateOne(
      { eventId: payload.id },
      { $setOnInsert: { eventId: payload.id, eventType: payload.type, receivedAt: new Date() } },
      { upsert: true }
    );

    if (!ObjectId.isValid(payload.payment.orderId)) {
      return res.status(422).json({ success: false, error: 'Invalid subscription order ID.' });
    }
    const order = await db.collection('subscriptionOrders').findOne({ _id: new ObjectId(payload.payment.orderId) });
    if (!order) return res.status(404).json({ success: false, error: 'Subscription order not found.' });
    const matches = payload.payment.tenantId === order.userId.toString()
      && payload.payment.reference === order.paymentReference
      && payload.payment.id === order.centralPaymentId
      && payload.payment.amount === order.amount
      && payload.payment.currency === order.currency;
    if (!matches) return res.status(409).json({ success: false, error: 'Payment does not match the subscription order.' });

    if (payload.type === 'PAYMENT_SUCCESS' && payload.payment.status === 'SUCCESS' && order.status !== 'REFUNDED') {
      await activateSubscriptionForPaidOrder(db, order, payload.payment);
    } else if (payload.type === 'PAYMENT_FAILED') {
      await db.collection('subscriptionOrders').updateOne(
        { _id: order._id, status: { $nin: ['PAID', 'REFUNDED'] } },
        { $set: { status: 'FAILED', updatedAt: new Date() } }
      );
    } else if (payload.type === 'PAYMENT_REFUNDED') {
      await db.collection('subscriptionOrders').updateOne(
        { _id: order._id },
        { $set: { status: 'REFUNDED', refundedAt: new Date(), updatedAt: new Date() } }
      );
      await db.collection('users').updateOne(
        { _id: order.userId, subscriptionPaymentId: order._id.toString() },
        { $set: { subscribed: false, subscriptionStatus: 'payment_refunded', type: 'customer', updatedAt: new Date() } }
      );
    }

    await db.collection('paymentCallbackEvents').updateOne(
      { eventId: payload.id },
      { $set: { processedAt: new Date(), paymentId: payload.payment.id } }
    );
    return res.json({ success: true, idempotent: false });
  } catch (error) {
    console.error('Payment callback failed:', error.message);
    return res.status(500).json({ success: false, error: 'Payment callback processing failed.' });
  }
};
