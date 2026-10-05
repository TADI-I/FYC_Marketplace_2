const { ObjectId } = require('mongodb');
const {
  getEligibleOffers,
  claimOffer,
  findOfferById
} = require('../services/sellerOfferService');
const {
  syncExpiredSellerAccess
} = require('../services/sellerSubscriptionService');

exports.getEligibleOffers = async (req, res, db) => {
  try {
    let user = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
    user = await syncExpiredSellerAccess(db, user);

    const offers = await getEligibleOffers(db, user);
    return res.json({ success: true, offers });
  } catch (error) {
    console.error('Eligible seller offers error:', error);
    return res.status(500).json({ success: false, error: 'Could not load seller offers.' });
  }
};

exports.claimOffer = async (req, res, db) => {
  try {
    let user = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
    user = await syncExpiredSellerAccess(db, user);

    const offer = await findOfferById(db, req.params.offerId);
    if (!offer) return res.status(404).json({ success: false, error: 'Offer not found.' });

    const claim = await claimOffer(db, user, offer);
    const activatedUser = await db.collection('users').findOne(
      { _id: user._id },
      { projection: { password: 0 } }
    );
    const { password, ...safeUser } = activatedUser;

    return res.status(201).json({
      success: true,
      message: `${offer.name} claimed successfully.`,
      claim,
      user: safeUser
    });
  } catch (error) {
    console.error('Seller offer claim error:', error);
    return res.status(error.status || 500).json({
      success: false,
      code: error.code || 'OFFER_CLAIM_FAILED',
      error: error.message || 'Could not claim this offer.'
    });
  }
};
