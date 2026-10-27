// controllers/verificationController.js
const { ObjectId } = require('mongodb');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const { sendVerificationDecisionEmail, sendVerificationSubmittedEmail } = require('../services/emailService');
const { notifyAdminsOfVerificationRequest } = require('../services/verificationNotificationService');

function isSupportedImage(buffer, mimetype) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const header = buffer.subarray(0, 12).toString('ascii');
  const isGif = header.startsWith('GIF87a') || header.startsWith('GIF89a');
  const isWebp = header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP';
  const matchesType = {
    'image/jpeg': isJpeg,
    'image/png': isPng,
    'image/gif': isGif,
    'image/webp': isWebp
  };
  return matchesType[mimetype] === true;
}

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

exports.submitVerificationRequest = async (req, res, db) => {
  try {
    const userId = req.params.userId;
    
    console.log('📸 Verification request from user:', userId);
    
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        error: 'Invalid user ID',
        success: false
      });
    }

    // Check if user is a seller
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found', success: false });
    }
    
    if (user.type !== 'seller') {
      return res.status(403).json({ 
        error: 'Only sellers can request verification',
        success: false
      });
    }

    // Check if already verified
    if (user.verified) {
      return res.status(409).json({ 
        error: 'User is already verified',
        success: false
      });
    }

    // Check for pending verification request
    const existingRequest = await db.collection('verificationRequests').findOne({
      userId: new ObjectId(userId),
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(409).json({ 
        error: 'A verification request is already pending',
        success: false
      });
    }

    // Get uploaded file
    if (!req.file) {
      return res.status(400).json({ 
        error: 'ID photo is required',
        success: false
      });
    }

    if (!isSupportedImage(req.file.buffer, req.file.mimetype)) {
      return res.status(400).json({
        error: 'The uploaded file is not a valid supported image',
        success: false
      });
    }

    // Store image in GridFS
   const bucket = new GridFSBucket(db, {
  bucketName: 'verification_images'
});

// 1️⃣ Upload image to GridFS
const fileId = await new Promise((resolve, reject) => {
  const uploadStream = bucket.openUploadStream(req.file.originalname, {
    contentType: req.file.mimetype,
    metadata: {
      userId: new ObjectId(userId),
      type: 'verification'
    }
  });

  uploadStream.on('finish', () => resolve(uploadStream.id));
  uploadStream.on('error', reject);

  uploadStream.end(req.file.buffer);
});

// 2️⃣ Store GridFS fileId in verification request
const verificationRequest = {
  userId: new ObjectId(userId),
  imageId: fileId,  // MUST be the GridFS id
  status: 'pending',
  requestedAt: new Date(),
  processedAt: null,
  adminId: null,
  adminNote: null
};

const result = await db.collection('verificationRequests').insertOne(verificationRequest);

console.log('✅ Verification request created with imageId:', fileId);

    try {
      await sendVerificationSubmittedEmail(user);
    } catch (emailError) {
      console.error('Verification submission email failed:', emailError.message);
    }

    try {
      await notifyAdminsOfVerificationRequest(db, user, result.insertedId);
    } catch (emailError) {
      console.error('Verification administrator notification failed:', emailError.message);
    }

    
    res.status(201).json({
      success: true,
      message: 'Verification request submitted successfully',
      requestId: result.insertedId
    });

  } catch (error) {
    console.error('❌ Submit verification error:', error);
    res.status(500).json({ 
      error: 'Failed to submit verification request',
      success: false
    });
  }
};

// Get verification status
exports.getVerificationStatus = async (req, res, db) => {
  try {
    const userId = req.params.userId;

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        error: 'Invalid user ID',
        success: false
      });
    }

    const user = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { verified: 1, verifiedAt: 1 } }
    );

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        success: false
      });
    }

    // Check for pending request
    const pendingRequest = await db.collection('verificationRequests').findOne({
      userId: new ObjectId(userId),
      status: 'pending'
    });

    res.json({
      success: true,
      verified: user.verified || false,
      verifiedAt: user.verifiedAt || null,
      hasPendingRequest: !!pendingRequest
    });

  } catch (error) {
    console.error('❌ Get verification status error:', error);
    res.status(500).json({ 
      error: 'Failed to get verification status',
      success: false
    });
  }
};

// Get verification requests (admin only)
exports.getVerificationRequests = async (req, res, db) => {
  try {
    const status = req.query.status || 'pending';
    const filter = status === 'all' ? {} : { status };

    console.log('🔍 Fetching verification requests with filter:', filter);

    const requests = await db.collection('verificationRequests')
      .find(filter)
      .sort({ requestedAt: -1 })
      .toArray();

    console.log(`📋 Found ${requests.length} verification requests`);

    // Fetch user details for each request
    const userIds = requests.map(r => r.userId);
    const users = await db.collection('users')
      .find({ _id: { $in: userIds } })
      .project({ password: 0 })
      .toArray();

    const usersMap = users.reduce((acc, u) => {
      acc[u._id.toString()] = u;
      return acc;
    }, {});

    // Fetch admin details for processed requests
    const adminIds = requests
      .map(r => r.adminId)
      .filter(id => id && ObjectId.isValid(id));
    
    let adminsMap = {};
    if (adminIds.length) {
      const admins = await db.collection('users')
        .find({ _id: { $in: adminIds } })
        .project({ name: 1, email: 1 })
        .toArray();
      adminsMap = admins.reduce((acc, a) => {
        acc[a._id.toString()] = a;
        return acc;
      }, {});
    }

    // Build the payload with FULL image URLs
    const payload = requests.map(r => {
      const imageUrl = `/api/verification/image/${r.imageId}`;
      
      return {
        ...r,
        user: usersMap[r.userId.toString()] || null,
        admin: r.adminId && adminsMap[r.adminId.toString()] ? adminsMap[r.adminId.toString()] : null,
        imageUrl: imageUrl  // This will be prefixed by API_BASE on the frontend
      };
    });

    const counts = payload.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {});

    console.log('✅ Returning verification requests:', payload.length);
    console.log('📊 Counts by status:', counts);

    res.json({ success: true, requests: payload, counts });
  } catch (error) {
    console.error('❌ Get verification requests error:', error);
    res.status(500).json({ 
      error: 'Failed to load verification requests',
      success: false
    });
  }
};

// Process verification request (approve/reject)
exports.processVerificationRequest = async (req, res, db) => {
  try {
    const requestId = req.params.requestId;
    const { action, adminNote = '' } = req.body;

    console.log('🔄 Processing verification request:', requestId, action);

    if (!ObjectId.isValid(requestId)) {
      return res.status(400).json({ 
        error: 'Invalid request ID',
        success: false
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ 
        error: 'Invalid action. Must be "approve" or "reject"',
        success: false
      });
    }

    const request = await db.collection('verificationRequests')
      .findOne({ _id: new ObjectId(requestId) });

    if (!request) {
      return res.status(404).json({ 
        error: 'Verification request not found',
        success: false
      });
    }

    if (request.status !== 'pending') {
      return res.status(409).json({ 
        error: 'Request has already been processed',
        success: false
      });
    }

    // Update verification request
    await db.collection('verificationRequests').updateOne(
      { _id: new ObjectId(requestId) },
      {
        $set: {
          status: action === 'approve' ? 'approved' : 'rejected',
          processedAt: new Date(),
          adminId: new ObjectId(req.user.id),
          adminNote: adminNote.trim()
        }
      }
    );

    // If approved, update user's verified status
    if (action === 'approve') {
      await db.collection('users').updateOne(
        { _id: request.userId },
        {
          $set: {
            verified: true,
            verifiedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );
      console.log('✅ User verified:', request.userId);
    }

    const user = await db.collection('users').findOne(
      { _id: request.userId },
      { projection: { name: 1, email: 1 } }
    );
    if (user) {
      try {
        await sendVerificationDecisionEmail(user, action, adminNote.trim());
      } catch (emailError) {
        console.error('Verification decision email failed:', emailError.message);
      }
    }

    res.json({
      success: true,
      message: `Verification request ${action}d successfully`
    });

  } catch (error) {
    console.error('❌ Process verification error:', error);
    res.status(500).json({ 
      error: 'Failed to process verification request',
      success: false
    });
  }
};

// Replace the getVerificationImage function in controllers/verificationController.js

exports.getVerificationImage = async (req, res, db) => {
  try {
    const imageId = req.params.imageId;
    
    // Validate ObjectId format
    if (!ObjectId.isValid(imageId)) {
      return res.status(400).json({ error: 'Invalid image ID format' });
    }

    const bucket = new GridFSBucket(db, { bucketName: 'verification_images' });

    // Check if file exists
    const files = await db
      .collection('verification_images.files')
      .find({ _id: new ObjectId(imageId) })
      .toArray();

    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const file = files[0];
    // Set response headers BEFORE piping
    res.setHeader('Content-Type', file.contentType || 'image/jpeg');
    res.setHeader('Content-Length', file.length);
    res.setHeader('Cache-Control', 'private, no-store');
    
    // Create download stream
    const downloadStream = bucket.openDownloadStream(new ObjectId(imageId));

    // Handle stream errors
    downloadStream.on('error', (error) => {
      console.error('❌ GridFS download stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream image' });
      }
    });

    // Pipe the stream to response
    downloadStream.pipe(res);

  } catch (error) {
    console.error('❌ Get verification image error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to retrieve image' });
    }
  }
};

exports.upload = upload;
exports.isSupportedImage = isSupportedImage;
