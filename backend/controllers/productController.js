// controllers/productController.js - Updated with whatsappRedirects support
const { ObjectId } = require('mongodb');
const {
  isValidCoordinates,
  rankNearbyProducts,
  recognizeCampus
} = require('../services/campusLocationService');

const isValidCategory = (category) => {
  const validCategories = [
    'books', 'electronics', 'services', 'clothing', 'food', 'transport', 'accommodation', 'other'
  ];
  return validCategories.includes(category);
};

const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildFilter = ({ category, campus, search }) => {
  const filter = { status: 'active' };
  if (category && category !== 'all') filter.category = category;
  if (campus && campus !== 'all') filter.sellerCampus = campus;
  if (search) {
    const safeSearch = escapeRegex(String(search).trim().slice(0, 100));
    filter.$or = [
      { title: { $regex: safeSearch, $options: 'i' } },
      { description: { $regex: safeSearch, $options: 'i' } }
    ];
  }
  return filter;
};

const buildEligibleProductPipeline = filter => {
  const now = new Date();
  return [
    { $match: filter },
    { $lookup: { from: 'users', localField: 'sellerId', foreignField: '_id', as: 'seller' } },
    { $unwind: '$seller' },
    {
      $match: {
        'seller.subscribed': true,
        'seller.accountStatus': { $ne: 'suspended' },
        $or: [
          { 'seller.subscriptionEndDate': { $exists: false } },
          { 'seller.subscriptionEndDate': { $gte: now } }
        ]
      }
    },
    {
      $lookup: {
        from: 'campuses',
        localField: 'seller.campus',
        foreignField: 'id',
        as: 'campus'
      }
    },
    { $unwind: { path: '$campus', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        sellerVerified: { $ifNull: ['$seller.verified', false] },
        sellerName: '$seller.name',
        sellerCampus: '$seller.campus',
        whatsappRedirects: { $ifNull: ['$whatsappRedirects', 0] }
      }
    }
  ];
};

const sanitizeNearbyProduct = product => {
  const { seller, campus, pickupLocation, ...publicProduct } = product;
  return {
    ...publicProduct,
    distanceMeters: product.distanceMeters === null ? null : Math.round(product.distanceMeters / 10) * 10
  };
};

// Existing feed behaviour when location discovery is disabled.
exports.getProducts = async (req, res, db) => {
  try {
    const { category, campus, search } = req.query;
    const filter = buildFilter({ category, campus, search });
    const pipeline = [
      ...buildEligibleProductPipeline(filter),
      { $project: { seller: 0, campus: 0, pickupLocation: 0 } },
      { $sort: { sellerVerified: -1, title: 1, _id: 1 } }
    ];

    const products = await db.collection('products').aggregate(pipeline).toArray();

    console.log(`✅ Returning all ${products.length} matching products`);

    res.json({
      success: true,
      products,
      total: products.length
    });

  } catch (error) {
    console.error('❌ Get products error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve products: ' + error.message,
      success: false
    });
  }
};

// Location is sent in a POST body so precise coordinates do not appear in URLs.
exports.getNearbyProducts = async (req, res, db) => {
  try {
    const latitude = typeof req.body?.latitude === 'number' ? req.body.latitude : NaN;
    const longitude = typeof req.body?.longitude === 'number' ? req.body.longitude : NaN;
    const accuracy = typeof req.body?.accuracy === 'number' ? req.body.accuracy : NaN;
    const page = Math.max(1, Math.min(100000, Number.parseInt(req.body?.page, 10) || 1));
    const limit = Math.max(1, Math.min(100, Number.parseInt(req.body?.limit, 10) || 24));
    if (!isValidCoordinates(latitude, longitude)) {
      return res.status(400).json({ success: false, error: 'Valid latitude and longitude are required.' });
    }

    const filter = buildFilter(req.body?.filters || {});
    const products = await db.collection('products')
      .aggregate(buildEligibleProductPipeline(filter))
      .toArray();
    const ranked = rankNearbyProducts(products, { latitude, longitude });
    const offset = (page - 1) * limit;
    const campuses = await db.collection('campuses').find({}).toArray();
    const detected = recognizeCampus(campuses, {
      latitude,
      longitude,
      accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : Infinity
    });

    return res.set('Cache-Control', 'no-store').json({
      success: true,
      products: ranked.slice(offset, offset + limit).map(sanitizeNearbyProduct),
      total: ranked.length,
      page,
      limit,
      hasMore: offset + limit < ranked.length,
      detectedCampus: detected ? {
        id: detected.campus.id,
        name: detected.campus.name,
        distanceMeters: Math.round(detected.distanceMeters)
      } : null
    });
  } catch (error) {
    console.error('Nearby product lookup failed:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to retrieve nearby products.' });
  }
};

// Get single product
exports.getProductById = async (req, res, db) => {
  try {
    const productId = req.params.id;
    console.log('📦 Getting product:', productId);
    
    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({ 
        error: 'Invalid product ID',
        success: false
      });
    }
    
    const pipeline = [
      { $match: { _id: new ObjectId(productId), status: 'active' } },
      {
        $lookup: {
          from: 'users',
          localField: 'sellerId',
          foreignField: '_id',
          as: 'seller'
        }
      },
      { $unwind: '$seller' },
      {
        $match: {
          'seller.subscribed': true,
          'seller.accountStatus': { $ne: 'suspended' },
          $or: [
            { 'seller.subscriptionEndDate': { $exists: false } },
            { 'seller.subscriptionEndDate': { $gte: new Date() } }
          ]
        }
      },
      {
        $addFields: {
          sellerVerified: { $ifNull: ['$seller.verified', false] },
          sellerName: '$seller.name',
          sellerCampus: '$seller.campus',
          whatsappRedirects: { $ifNull: ['$whatsappRedirects', 0] }
        }
      },
      { $project: { seller: 0, pickupLocation: 0 } }
    ];

    const results = await db.collection('products').aggregate(pipeline).toArray();
    const product = results[0];

    if (!product) {
      return res.status(404).json({ 
        error: 'Product not found',
        success: false
      });
    }

    console.log('✅ Product found:', product.title, 'WhatsApp clicks:', product.whatsappRedirects);
    
    res.json({
      success: true,
      ...product
    });

  } catch (error) {
    console.error('❌ Get product error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve product: ' + error.message,
      success: false
    });
  }
};

// Get products by seller
exports.getProductsBySeller = async (req, res, db) => {
  try {
    const sellerId = req.params.sellerId;
    console.log('📦 Getting products for seller:', sellerId);
    
    if (!ObjectId.isValid(sellerId)) {
      return res.status(400).json({ 
        error: 'Invalid seller ID',
        success: false
      });
    }

    const seller = await db.collection('users').findOne(
      { _id: new ObjectId(sellerId) },
      { projection: { subscribed: 1, subscriptionEndDate: 1, verified: 1, name: 1, campus: 1, accountStatus: 1 } }
    );
    
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found', success: false });
    }
    if (seller.accountStatus === 'suspended') {
      return res.status(404).json({ error: 'Seller account not active', success: false });
    }
    
    const hasActiveSubscription = seller.subscribed && (!seller.subscriptionEndDate || new Date() <= new Date(seller.subscriptionEndDate));
    if (!hasActiveSubscription) {
      return res.status(404).json({ error: 'Seller account not active', success: false });
    }

    const products = await db.collection('products')
      .find({ 
        sellerId: new ObjectId(sellerId),
        status: 'active'
      })
      .sort({ createdAt: -1 })
      .toArray();

    const enhancedProducts = products.map(product => {
      const { pickupLocation, ...publicProduct } = product;
      return {
        ...publicProduct,
        sellerVerified: seller.verified || false,
        sellerName: seller.name,
        sellerCampus: seller.campus,
        whatsappRedirects: product.whatsappRedirects || 0
      };
    });

    console.log(`✅ Found ${enhancedProducts.length} products for seller ${sellerId}`);
    
    res.json({
      success: true,
      products: enhancedProducts
    });

  } catch (error) {
    console.error('❌ Get seller products error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve seller products: ' + error.message,
      success: false
    });
  }
};

// Create product
exports.createProduct = async (req, res, db) => {
  try {
    console.log('➕ Creating product:', req.body);
    console.log('👤 User:', req.user);
    
    const { title, description, price, category, type } = req.body;

    if (!title || !description || !price || !category) {
      return res.status(400).json({ 
        error: 'All fields are required',
        success: false
      });
    }

    if (!isValidCategory(category)) {
      return res.status(400).json({ 
        error: 'Invalid category',
        success: false
      });
    }

    if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      return res.status(400).json({ 
        error: 'Price must be a positive number',
        success: false
      });
    }

    const seller = req.userProfile;

    const product = {
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category,
      type: type || 'product',
      sellerId: new ObjectId(req.user.id),
      sellerName: seller.name,
      sellerCampus: seller.campus,
      rating: 0,
      reviews: [],
      images: [],
      status: 'active',
      views: 0,
      whatsappRedirects: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('products').insertOne(product);
    console.log('✅ Product insertion result:', result.insertedId);
    
    const createdProduct = await db.collection('products').aggregate([
      { $match: { _id: result.insertedId } },
      {
        $lookup: {
          from: 'users',
          localField: 'sellerId',
          foreignField: '_id',
          as: 'seller'
        }
      },
      { $unwind: '$seller' },
      {
        $addFields: {
          sellerVerified: { $ifNull: ['$seller.verified', false] },
          whatsappRedirects: { $ifNull: ['$whatsappRedirects', 0] }
        }
      },
      { $project: { seller: 0 } }
    ]).toArray();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      productId: result.insertedId,
      product: createdProduct[0] || { ...product, _id: result.insertedId }
    });

  } catch (error) {
    console.error('❌ Create product error:', error);
    res.status(500).json({ 
      error: 'Failed to create product: ' + error.message,
      success: false
    });
  }
};

// Seller contact details are intentionally kept out of public product payloads.
exports.getProductContact = async (req, res, db) => {
  try {
    const productId = new ObjectId(req.params.id);
    const product = await db.collection('products').findOne(
      { _id: productId, status: 'active' },
      { projection: { sellerId: 1, title: 1 } }
    );
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const seller = await db.collection('users').findOne(
      { _id: product.sellerId, accountStatus: { $ne: 'suspended' } },
      { projection: { name: 1, whatsapp: 1, subscribed: 1, subscriptionEndDate: 1 } }
    );
    const hasActiveSubscription = seller?.subscribed && (!seller.subscriptionEndDate || new Date() <= new Date(seller.subscriptionEndDate));
    if (!seller || !hasActiveSubscription) {
      return res.status(404).json({ success: false, error: 'Seller contact is not available' });
    }

    res.set('Cache-Control', 'no-store').json({
      success: true,
      contact: {
        sellerId: product.sellerId,
        sellerName: seller.name,
        whatsapp: seller.whatsapp || null
      }
    });
  } catch (error) {
    console.error('Get product contact error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve seller contact' });
  }
};

// Update product
exports.updateProduct = async (req, res, db) => {
  try {
    const productId = req.params.id;
    console.log('✏️ Updating product:', productId);
    
    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({ 
        error: 'Invalid product ID',
        success: false
      });
    }

    const existingProduct = await db.collection('products')
      .findOne({ _id: new ObjectId(productId) });

    if (!existingProduct) {
      return res.status(404).json({ 
        error: 'Product not found',
        success: false
      });
    }

    if (existingProduct.sellerId.toString() !== req.user.id) {
      return res.status(403).json({ 
        error: 'You can only update your own products',
        success: false
      });
    }

    const { title, description, price, category, type, status } = req.body;

    const updateData = { updatedAt: new Date() };
    
    if (title) updateData.title = title.trim();
    if (description) updateData.description = description.trim();
    if (price) updateData.price = parseFloat(price);
    if (category && isValidCategory(category)) updateData.category = category;
    if (type) updateData.type = type;
    if (status) updateData.status = status;

    await db.collection('products').updateOne(
      { _id: new ObjectId(productId) },
      { $set: updateData }
    );

    console.log('✅ Product updated');

    res.json({
      success: true,
      message: 'Product updated successfully'
    });

  } catch (error) {
    console.error('❌ Update product error:', error);
    res.status(500).json({ 
      error: 'Failed to update product: ' + error.message,
      success: false
    });
  }
};

// Delete product
exports.deleteProduct = async (req, res, db) => {
  try {
    const productId = req.params.id;
    console.log('🗑️ Deleting product:', productId);
    
    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({ 
        error: 'Invalid product ID',
        success: false
      });
    }

    const existingProduct = await db.collection('products')
      .findOne({ _id: new ObjectId(productId) });

    if (!existingProduct) {
      return res.status(404).json({ 
        error: 'Product not found',
        success: false
      });
    }

    if (existingProduct.sellerId.toString() !== req.user.id) {
      return res.status(403).json({ 
        error: 'You can only delete your own products',
        success: false
      });
    }

    await db.collection('products').deleteOne({ 
      _id: new ObjectId(productId) 
    });

    console.log('✅ Product deleted');

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete product error:', error);
    res.status(500).json({ 
      error: 'Failed to delete product: ' + error.message,
      success: false
    });
  }
};
