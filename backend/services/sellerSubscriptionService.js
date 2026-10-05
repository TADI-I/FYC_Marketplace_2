const SUBSCRIPTION_STATUS = Object.freeze({
  NONE: 'NONE',
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
});

const SELLER_MONTHLY_PRICE_RANDS = 25;
const SELLER_MONTHLY_PRICE_CENTS = 2500;

// Add calendar months while clamping to the last valid day of the target month.
// For example, 31 December + 2 months becomes 28/29 February rather than March.
function addMonthsClamped(date, months) {
  const result = new Date(date);
  const originalDay = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDayOfTargetMonth = new Date(Date.UTC(
    result.getUTCFullYear(),
    result.getUTCMonth() + 1,
    0
  )).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));

  return result;
}

function hasHistoricalSellerActivation(user) {
  if (!user) return false;
  if (typeof user.hasHadSellerAccess === 'boolean') return user.hasHadSellerAccess;

  // Legacy records predate hasHadSellerAccess. Evidence of an actual access
  // period counts; merely choosing the seller account type does not.
  return Boolean(user.sellerActivatedAt)
    || Boolean(user.sellerTrialStartedAt)
    || Boolean(user.subscriptionStartDate)
    || Boolean(user.subscriptionPaymentId)
    || user.hasUsedSellerTrial === true;
}

function hasActiveSellerAccess(user, now = new Date()) {
  if (!user || user.type !== 'seller' || user.subscribed !== true) return false;
  if (!user.subscriptionEndDate) return true;

  const endDate = new Date(user.subscriptionEndDate);
  return !Number.isNaN(endDate.getTime()) && now < endDate;
}

async function syncExpiredSellerAccess(db, user, now = new Date()) {
  if (!user?.subscribed || hasActiveSellerAccess(user, now)) return user;

  await db.collection('users').updateOne(
    { _id: user._id, subscribed: true },
    { $set: {
      subscribed: false,
      subscriptionStatus: SUBSCRIPTION_STATUS.PAYMENT_REQUIRED,
      updatedAt: now
    } }
  );

  await db.collection('sellerSubscriptions').updateMany(
    { userId: user._id, status: SUBSCRIPTION_STATUS.ACTIVE, expiresAt: { $lte: now } },
    { $set: { status: SUBSCRIPTION_STATUS.EXPIRED, updatedAt: now } }
  );

  return {
    ...user,
    subscribed: false,
    subscriptionStatus: SUBSCRIPTION_STATUS.PAYMENT_REQUIRED,
    updatedAt: now
  };
}

function publicSubscriptionFields(user) {
  return {
    hasHadSellerAccess: hasHistoricalSellerActivation(user),
    sellerActivatedAt: user.sellerActivatedAt || null,
    subscriptionStatus: user.subscriptionStatus || SUBSCRIPTION_STATUS.NONE,
    subscriptionStartDate: user.subscriptionStartDate || null,
    subscriptionEndDate: user.subscriptionEndDate || null,
    subscriptionAmount: user.subscriptionAmount ?? SELLER_MONTHLY_PRICE_RANDS,
    subscriptionCurrency: user.subscriptionCurrency || 'ZAR',
    subscriptionSource: user.subscriptionSource || null,
    currentOfferId: user.currentOfferId || null,
    currentOfferClaimId: user.currentOfferClaimId || null
  };
}

module.exports = {
  SUBSCRIPTION_STATUS,
  SELLER_MONTHLY_PRICE_RANDS,
  SELLER_MONTHLY_PRICE_CENTS,
  addMonthsClamped,
  hasHistoricalSellerActivation,
  hasActiveSellerAccess,
  syncExpiredSellerAccess,
  publicSubscriptionFields
};
