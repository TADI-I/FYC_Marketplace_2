// controllers/productPageController.js
const { ObjectId } = require('mongodb');

exports.serveProductPage = async (req, res, db) => {
  try {
    const productId = req.params.id;
    
    console.log('📄 Product page request for:', productId);
    
    if (!ObjectId.isValid(productId)) {
      console.log('❌ Invalid product ID');
      return res.status(404).send('Product not found');
    }

    // Fetch product with seller info
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
      { $project: { seller: 0 } }
    ];

    const results = await db.collection('products').aggregate(pipeline).toArray();
    const product = results[0];

    if (!product) {
      console.log('❌ Product not found in database');
      return res.status(404).send('Product not found or seller subscription expired');
    }

    console.log('✅ Product found:', product.title);

    // Construct image URL - handle GridFS image structure
    let imageUrl;
    if (product.image && product.image.id) {
      imageUrl = `${req.protocol}://${req.get('host')}/api/images/${product.image.id}`;
    } else if (product.images && product.images.length > 0) {
      imageUrl = `${req.protocol}://${req.get('host')}/uploads/${product.images[0]}`;
    } else {
      imageUrl = `${req.protocol}://${req.get('host')}/api/placeholder.jpg`;
    }

    // Share URL stays on backend for Open Graph tags
    const shareUrl = `${req.protocol}://${req.get('host')}/p/${productId}`;
    
    // IMPORTANT: Redirect to FRONTEND (port 3000 in dev, your domain in prod)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/products/${productId}`;
    
   // console.log('🔗 Will redirect to:', redirectUrl);
    
    // HTML with Open Graph meta tags
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- IMMEDIATE REDIRECT to frontend -->
  <meta http-equiv="refresh" content="0; url=${redirectUrl}">
  
  <!-- Open Graph Meta Tags for Facebook/WhatsApp/LinkedIn -->
  <meta property="og:title" content="${escapeHtml(product.title)} - R${product.price}" />
  <meta property="og:description" content="${escapeHtml(product.description)}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:secure_url" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeHtml(product.title)}" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="FYC Marketplace" />
  <meta property="og:locale" content="en_ZA" />
  
  <!-- Product Open Graph tags -->
  <meta property="product:price:amount" content="${product.price}" />
  <meta property="product:price:currency" content="ZAR" />
  
  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(product.title)} - R${product.price}" />
  <meta name="twitter:description" content="${escapeHtml(product.description)}" />
  <meta name="twitter:image" content="${imageUrl}" />
  
  <title>${escapeHtml(product.title)} | FYC Marketplace</title>
  
  <script>
    console.log('🔄 Redirecting to frontend:', '${redirectUrl}');
    window.location.replace('${redirectUrl}');
  </script>
  
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      margin: 0;
      padding: 20px;
    }
    .loader {
      text-align: center;
      background: white;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
    }
    .spinner {
      border: 4px solid #f3f4f6;
      border-top: 4px solid #ea580c;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <h2>${escapeHtml(product.title)}</h2>
    <p style="font-size: 24px; color: #059669; font-weight: bold;">R${product.price}</p>
    <p style="color: #666; font-size: 14px;">Redirecting to marketplace...</p>
    <p style="font-size: 12px; color: #999; margin-top: 20px;">
      Not redirected? <a href="${redirectUrl}" style="color: #ea580c;">Click here</a>
    </p>
  </div>
</body>
</html>`;

    res.send(html);

  } catch (error) {
    console.error('❌ Product page error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - FYC Marketplace</title>
        <meta http-equiv="refresh" content="3; url=${frontendUrl}">
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #f3f4f6;
          }
          .error {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>😕 Oops!</h1>
          <p>Unable to load this product.</p>
          <p style="font-size: 14px; color: #666; margin-top: 10px;">Redirecting to marketplace...</p>
          <a href="${frontendUrl}" style="color: #ea580c; text-decoration: none;">← Back to Marketplace</a>
        </div>
      </body>
      </html>
    `);
  }
};

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
