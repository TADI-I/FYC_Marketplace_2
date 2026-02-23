// controllers/productController.js - Updated with whatsappRedirects support
const { ObjectId } = require('mongodb');

const isValidCategory = (category) => {
  const validCategories = [
    'books', 'electronics', 'services', 'clothing', 'food', 'transport', 'accommodation', 'other'
  ];
  return validCategories.includes(category);
};

// Get all products - no pagination, client handles lazy rendering
exports.getProducts = async (req, res, db) => {
  try {
    console.log('📦 Getting products with filters:', req.query);
    
    const { category, campus, search } = req.query;
    
    // Build filter query
    let filter = { status: 'active' };
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (campus && campus !== 'all') {
      filter.sellerCampus = campus;
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('🔍 Filter:', filter);

    const now = new Date();

    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'users',
          localField: 'sellerId',
          foreignField: '_id',
          as: 'seller'
        }
      },
      { $unwind: '$seller' },
      // Seller must be subscribed and subscription not expired
      {
        $match: {
          'seller.subscribed': true,
          $or: [
            { 'seller.subscriptionEndDate': { $exists: false } },
            { 'seller.subscriptionEndDate': { $gte: now } }
          ]
        }
      },
      // Add seller fields dynamically
      {
        $addFields: {
          sellerWhatsApp: '$seller.whatsapp',
          sellerVerified: { $ifNull: ['$seller.verified', false] },
          sellerName: '$seller.name',
          sellerCampus: '$seller.campus',
          whatsappRedirects: { $ifNull: ['$whatsappRedirects', 0] }
        }
      },
      { $project: { seller: 0 } },
      // Verified sellers first, then alphabetically
      { $sort: { sellerVerified: -1, title: 1 } }
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
          $or: [
            { 'seller.subscriptionEndDate': { $exists: false } },
            { 'seller.subscriptionEndDate': { $gte: new Date() } }
          ]
        }
      },
      {
        $addFields: {
          sellerWhatsApp: '$seller.whatsapp',
          sellerVerified: { $ifNull: ['$seller.verified', false] },
          sellerName: '$seller.name',
          sellerCampus: '$seller.campus',
          whatsappRedirects: { $ifNull: ['$whatsappRedirects', 0] }
        }
      },
      { $project: { seller: 0 } }
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
      { projection: { subscribed: 1, subscriptionEndDate: 1, verified: 1, whatsapp: 1, name: 1, campus: 1 } }
    );
    
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found', success: false });
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

    const enhancedProducts = products.map(product => ({
      ...product,
      sellerWhatsApp: seller.whatsapp || null,
      sellerVerified: seller.verified || false,
      sellerName: seller.name,
      sellerCampus: seller.campus,
      whatsappRedirects: product.whatsappRedirects || 0
    }));

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
          sellerWhatsApp: '$seller.whatsapp',
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