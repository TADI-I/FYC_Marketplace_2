const SUBSCRIPTION_POLICY_ID = 'seller-subscriptions';
const SUBSCRIPTION_NOTICE_DAYS = 30;

const SUBSCRIPTION_MODE = Object.freeze({
  FREE: 'FREE',
  NOTICE: 'NOTICE',
  PAID: 'PAID'
});

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

function normalizeSubscriptionPolicy(document, now = new Date()) {
  if (!document?.paymentsEnabled) {
    return {
      paymentsEnabled: false,
      mode: SUBSCRIPTION_MODE.FREE,
      noticeStartedAt: null,
      paymentsRequiredAt: null
    };
  }

  const requiredAt = document.paymentsRequiredAt ? new Date(document.paymentsRequiredAt) : now;
  const validRequiredAt = Number.isNaN(requiredAt.getTime()) ? now : requiredAt;
  return {
    paymentsEnabled: true,
    mode: now < validRequiredAt ? SUBSCRIPTION_MODE.NOTICE : SUBSCRIPTION_MODE.PAID,
    noticeStartedAt: document.noticeStartedAt || null,
    paymentsRequiredAt: validRequiredAt
  };
}

async function getSubscriptionPolicy(db, now = new Date()) {
  try {
    const document = await db.collection('marketplaceSettings').findOne({ _id: SUBSCRIPTION_POLICY_ID });
    // A new deployment starts in traction mode until an administrator enables payments.
    return normalizeSubscriptionPolicy(document, now);
  } catch (error) {
    // Preserve the historical paid behavior if a partial test double or a database
    // problem prevents the setting from being read.
    return normalizeSubscriptionPolicy({ paymentsEnabled: true, paymentsRequiredAt: now }, now);
  }
}

async function setSubscriptionPaymentsEnabled(db, enabled, adminId, now = new Date()) {
  const collection = db.collection('marketplaceSettings');
  const current = await collection.findOne({ _id: SUBSCRIPTION_POLICY_ID });

  if (enabled) {
    // Re-saving an enabled switch must not restart the notice period.
    if (!current?.paymentsEnabled) {
      await collection.updateOne(
        { _id: SUBSCRIPTION_POLICY_ID },
        {
          $set: {
            paymentsEnabled: true,
            noticeStartedAt: now,
            paymentsRequiredAt: addDays(now, SUBSCRIPTION_NOTICE_DAYS),
            updatedAt: now,
            updatedBy: adminId
          },
          $setOnInsert: { createdAt: now }
        },
        { upsert: true }
      );
    }
  } else {
    await collection.updateOne(
      { _id: SUBSCRIPTION_POLICY_ID },
      {
        $set: {
          paymentsEnabled: false,
          noticeStartedAt: null,
          paymentsRequiredAt: null,
          updatedAt: now,
          updatedBy: adminId
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );
  }

  return getSubscriptionPolicy(db, now);
}

function sellerHasAccessUnderPolicy(user, policy, now = new Date()) {
  if (!user || user.type !== 'seller' || user.accountStatus === 'suspended') return false;
  if (policy.mode !== SUBSCRIPTION_MODE.PAID) return true;
  if (user.subscribed !== true) return false;
  if (!user.subscriptionEndDate) return true;
  const endDate = new Date(user.subscriptionEndDate);
  return !Number.isNaN(endDate.getTime()) && now < endDate;
}

function publicPolicyFields(policy) {
  return {
    subscriptionMode: policy.mode,
    subscriptionsEnabled: policy.paymentsEnabled,
    subscriptionNoticeEndsAt: policy.paymentsRequiredAt || null
  };
}

module.exports = {
  SUBSCRIPTION_MODE,
  SUBSCRIPTION_NOTICE_DAYS,
  normalizeSubscriptionPolicy,
  getSubscriptionPolicy,
  setSubscriptionPaymentsEnabled,
  sellerHasAccessUnderPolicy,
  publicPolicyFields
};
