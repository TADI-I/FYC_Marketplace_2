// controllers/referenceController.js

// Get campuses
const { CAMPUSES } = require('../services/campusLocationService');

exports.getCampuses = async (req, res, db) => {
  let campuses = CAMPUSES;
  if (db) {
    try {
      const stored = await db.collection('campuses').find({}, {
        projection: { _id: 0, source: 0, createdAt: 0, updatedAt: 0 }
      }).sort({ name: 1 }).toArray();
      if (stored.length) campuses = stored;
    } catch (error) {
      console.warn('Using bundled campus data:', error.message);
    }
  }
  res.json({ success: true, campuses });
};

// Get categories
exports.getCategories = (req, res) => {
  const categories = [
    { id: 'books', name: 'Books' },
    { id: 'electronics', name: 'Electronics' },
    { id: 'services', name: 'Services' },
    { id: 'clothing', name: 'Clothing' },
    { id: 'food', name: 'Food' },
    { id: 'transport', name: 'Transport' },
    { id: 'accommodation', name: 'Accommodation' },
    { id: 'other', name: 'Other' }
  ];
  res.json({ success: true, categories });
};
