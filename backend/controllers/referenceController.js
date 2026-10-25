// controllers/referenceController.js

// Get campuses
const { CAMPUSES } = require('../services/campusLocationService');

exports.getCampuses = async (req, res, db) => {
  let campuses = CAMPUSES;
  if (db) {
    try {
      const stored = await db.collection('campuses').find({}, {
        projection: { _id: 0, id: 1, name: 1 }
      }).sort({ name: 1 }).toArray();
      if (stored.length) campuses = stored;
    } catch (error) {
      console.warn('Using bundled campus data:', error.message);
    }
  }
  res.json({
    success: true,
    campuses: campuses.map(({ id, name }) => ({ id, name }))
  });
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
