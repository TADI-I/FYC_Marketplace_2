const { ObjectId } = require('mongodb');
const {
  SUBSCRIPTION_STATUS,
  addMonthsClamped,
  hasActiveSellerAccess,
  hasHistoricalSellerActivation
} = require('./sellerSubscriptionService');

const REACTIVATION_OFFER_CODE = 'SELLER_REACTIVATION_2_MONTHS';

async function ensureDefaultSellerOffers(db) {
  const now = new Date();
  await db.collection('sellerOffers').updateOne(
    { code: REACTIVATION_OFFER_CODE },
    {
      $setOnInsert: {
        code: REACTIVATION_OFFER_CODE,
        name: '2 Months Free Reactivation',
        description: 'A special two-month free seller period for eligible expired sellers.',
        type: 'FREE_PERIOD',
        durationMonths: 2,
        price: 0,
        currency: 'ZAR',
        active: true,
        eligibilityRules: {
          accountTypes: ['buyer', 'seller'],
          subscriptionStatuses: [
            SUBSCRIPTION_STATUS.PAYMENT_REQUIRED,
            SUBSCRIPTION_STATUS.EXPIRED,
            SUBSCRIPTION_STATUS.CANCELLED
          ],
          requiresPreviousSellerAccess: true,
          requiresInactiveSubscription: true,
          maxClaimsPerUser: 1
        },
        createdAt: now
      }
    },
    { upsert: true }
  );
}

function isOfferWithinSchedule(offer, now) {
  if (offer.startsAt && new Date(offer.startsAt) > now) return false;
  if (offer.endsAt && new Date(offer.endsAt) <= now) return false;
  return true;
}

function satisfiesEligibilityRules(user, offer, claimCount, now = new Date()) {
  if (!offer?.active || !isOfferWithinSchedule(offer, now)) return false;

  const rules = offer.eligibilityRules || {};
  if (rules.accountTypes?.length && !rules.accountTypes.includes(user.type)) return false;
  if (rules.subscriptionStatuses?.length) {
    const status = (user.subscriptionStatus || SUBSCRIPTION_STATUS.NONE).toUpperCase();
    if (!rules.subscriptionStatuses.some(ruleStatus => String(ruleStatus).toUpperCase() === status)) return false;
  }
  if (rules.requiresPreviousSellerAccess && !hasHistoricalSellerActivation(user)) return false;
  if (rules.requiresInactiveSubscription && hasActiveSellerAccess(user, now)) return false;
  if (Number.isInteger(rules.maxClaimsPerUser) && claimCount >= rules.maxClaimsPerUser) return false;

  return true;
}

function publicOffer(offer) {
  return {
    id: offer._id,
    code: offer.code,
    name: offer.name,
    description: offer.description,
    type: offer.type,
    durationMonths: offer.durationMonths,
    price: offer.price,
    currency: offer.currency,
    endsAt: offer.endsAt || null
  };
}

async function getEligibleOffers(db, user, now = new Date()) {
  const offers = await db.collection('sellerOffers')
    .find({ active: true })
    .sort({ createdAt: 1 })
    .toArray();

  if (!offers.length) return [];
  const offerIds = offers.map(offer => offer._id);
  const claims = await db.collection('sellerOfferClaims').aggregate([
    { $match: { userId: user._id, offerId: { $in: offerIds }, status: 'CLAIMED' } },
    { $group: { _id: '$offerId', count: { $sum: 1 } } }
  ]).toArray();
  const claimCounts = new Map(claims.map(claim => [claim._id.toString(), claim.count]));

  return offers
    .filter(offer => satisfiesEligibilityRules(
      user,
      offer,
      claimCounts.get(offer._id.toString()) || 0,
      now
    ))
    .map(publicOffer);
}

async function claimOffer(db, user, offer, now = new Date()) {
  const existingClaimCount = await db.collection('sellerOfferClaims').countDocuments({
    userId: user._id,
    offerId: offer._id,
    status: 'CLAIMED'
  });
  if (!satisfiesEligibilityRules(user, offer, existingClaimCount, now)) {
    const error = new Error('This offer is not available for this account.');
    error.code = 'OFFER_NOT_ELIGIBLE';
    error.status = 409;
    throw error;
  }
  if (offer.type !== 'FREE_PERIOD' || offer.price !== 0) {
    const error = new Error('This paid promotion must be completed through secure checkout.');
    error.code = 'OFFER_PAYMENT_REQUIRED';
    error.status = 409;
    throw error;
  }

  const startsAt = now;
  const expiresAt = addMonthsClamped(startsAt, offer.durationMonths);
  const claim = {
    userId: user._id,
    offerId: offer._id,
    status: 'PENDING',
    claimedAt: now,
    startsAt,
    expiresAt,
    createdAt: now,
    updatedAt: now
  };

  let claimId;
  let subscriptionId;
  let userActivated = false;
  try {
    claimId = (await db.collection('sellerOfferClaims').insertOne(claim)).insertedId;
    const subscription = {
      userId: user._id,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      source: 'OFFER',
      startedAt: startsAt,
      expiresAt,
      price: offer.price,
      currency: offer.currency,
      offerId: offer._id,
      offerClaimId: claimId,
      createdAt: now,
      updatedAt: now
    };
    subscriptionId = (await db.collection('sellerSubscriptions').insertOne(subscription)).insertedId;

    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          type: 'seller',
          hasHadSellerAccess: true,
          subscribed: true,
          subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE,
          subscriptionStartDate: startsAt,
          subscriptionEndDate: expiresAt,
          subscriptionAmount: offer.price,
          subscriptionCurrency: offer.currency,
          subscriptionSource: 'OFFER',
          currentOfferId: offer._id,
          currentOfferClaimId: claimId,
          currentSellerSubscriptionId: subscriptionId,
          updatedAt: now
        },
        $min: { sellerActivatedAt: startsAt }
      }
    );
    userActivated = true;

    await db.collection('sellerOfferClaims').updateOne(
      { _id: claimId },
      { $set: { status: 'CLAIMED', subscriptionId, updatedAt: now } }
    );

    return { claimId, subscriptionId, startsAt, expiresAt };
  } catch (error) {
    if (userActivated) {
      await db.collection('users').updateOne(
        { _id: user._id, currentOfferClaimId: claimId },
        {
          $set: {
            subscribed: false,
            subscriptionStatus: SUBSCRIPTION_STATUS.PAYMENT_REQUIRED,
            updatedAt: new Date()
          },
          $unset: {
            currentOfferId: '',
            currentOfferClaimId: '',
            currentSellerSubscriptionId: ''
          }
        }
      ).catch(() => {});
    }
    if (subscriptionId) {
      await db.collection('sellerSubscriptions').deleteOne({ _id: subscriptionId }).catch(() => {});
    }
    if (claimId) {
      await db.collection('sellerOfferClaims').deleteOne({ _id: claimId, status: 'PENDING' }).catch(() => {});
    }
    if (error?.code === 11000) {
      const duplicate = new Error('This offer has already been claimed.');
      duplicate.code = 'OFFER_ALREADY_CLAIMED';
      duplicate.status = 409;
      throw duplicate;
    }
    throw error;
  }
}

async function findOfferById(db, offerId) {
  if (!ObjectId.isValid(offerId)) return null;
  return db.collection('sellerOffers').findOne({ _id: new ObjectId(offerId), active: true });
}

module.exports = {
  REACTIVATION_OFFER_CODE,
  ensureDefaultSellerOffers,
  satisfiesEligibilityRules,
  getEligibleOffers,
  claimOffer,
  findOfferById,
  publicOffer
};
