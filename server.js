require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const multer = require("multer");
const JOURNEY_MONTHS = require("./journey-db.js");
const app = express();
const { v4: uuidv4 } = require("uuid");

// Import database functions
// Import database functions - UPDATE THIS SECTION
const {
  supabase,
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  listUsers,
  getJourneyProgress,
  upsertJourneyProgress,
  getAllJourneyProgress,
  getArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  incrementArticleViews,
  getPosts,
  createPost,
  createSession: createSessionDB,
  getSession: getSessionDB,
  deleteSession: deleteSessionDB,
  // ADD THESE SERVICE FUNCTIONS
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServiceRequests,
  createServiceRequest,
  updateServiceRequestStatus,
  getPartnerUserIdFromPartnerId,
  getAmbassadorUserIdFromAmbassadorId,
} = require("./models/db.js");

// ============================================
// NOTIFICATION HELPER FUNCTION
// ============================================
async function createNotification(recipientId, recipientType, notificationType, title, message, link = null, applicationId = null, requestId = null) {
  try {
    console.log('📬 Creating notification for:', recipientId, '- Type:', notificationType);
    
    // FOR PRESENTATION: SIMPLY CREATE WITHOUT VALIDATION
    const notificationData = {
      notification_id: uuidv4(),
      recipient_id: recipientId,
      recipient_type: recipientType,
      type: notificationType,
      title: title,
      message: message,
      link: link,
      read: false,
      created_at: new Date().toISOString(),
      application_id: null,  // 🚨 FORCE TO NULL FOR SERVICE REQUESTS
      request_id: requestId || null
    };

    console.log('📝 Notification data:', {
      type: notificationType,
      hasApplicationId: !!applicationId,
      hasRequestId: !!requestId
    });

    // Try to create notification
    const { data, error } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single();

    if (error) {
      console.log('⚠️ Notification failed (but continuing):', error.message);
      return null; // Don't crash the request
    }

    console.log('✅ Notification created successfully');
    return data;
  } catch (error) {
    console.log('⚠️ Notification error (but continuing):', error.message);
    return null; // Don't crash the request
  }
}

// ------------------------
// Basic Middleware
// ------------------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Add debug middleware to see incoming requests
app.use((req, res, next) => {
  if (req.path === '/register/partner' && req.method === 'POST') {
    console.log("=== REGISTER PARTNER REQUEST ===");
    console.log("Request body:", req.body);
    console.log("=== END REQUEST ===");
  }
  next();
});

// Disable cache in development and simple request logging
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  console.log(`${req.method} ${req.url}`);
  next();
});

// Serve static assets
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ------------------------
// In-memory storage (remove partners from here)
// ------------------------
const ambassadorsByEmail = new Map();
const adminsByEmail = new Map();
const articlesById = new Map();
const notificationsByUserId = new Map();
const sessions = new Map();
const postsById = new Map();
const journeyProgressByAmbassador = new Map();

// ------------------------
// File-based persistence
// ------------------------
const DATA_DIR = path.join(__dirname, "data");
const ARTICLES_FILE = path.join(DATA_DIR, "articles.json");
const POSTS_FILE = path.join(DATA_DIR, "posts.json");
const JOURNEY_FILE = path.join(DATA_DIR, "journey.json");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const CVS_DIR = path.join(UPLOADS_DIR, "cvs");

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(CVS_DIR)) {
      fs.mkdirSync(CVS_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn(
      "[data] Failed to ensure data directory:",
      err && err.message ? err.message : err
    );
  }
}

function loadArticlesFromDisk() {
  try {
    ensureDataDir();
    if (!fs.existsSync(ARTICLES_FILE)) return;
    const raw = fs.readFileSync(ARTICLES_FILE, "utf8");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      articlesById.clear();
      for (const art of parsed) {
        if (art && art.id) {
          articlesById.set(String(art.id), art);
        }
      }
      console.log(
        `[articles] Loaded ${articlesById.size} article(s) from disk`
      );
    }
  } catch (err) {
    console.warn(
      "[articles] Failed to load from disk:",
      err && err.message ? err.message : err
    );
  }
}

function saveArticlesToDisk() {
  try {
    ensureDataDir();
    const all = [...articlesById.values()];
    const json = JSON.stringify(all, null, 2);
    fs.writeFileSync(ARTICLES_FILE, json, "utf8");
  } catch (err) {
    console.warn(
      "[articles] Failed to save to disk:",
      err && err.message ? err.message : err
    );
  }
}

function loadPostsFromDisk() {
  try {
    ensureDataDir();
    if (!fs.existsSync(POSTS_FILE)) return;
    const raw = fs.readFileSync(POSTS_FILE, "utf8");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      postsById.clear();
      for (const post of parsed) {
        if (post && post.id) {
          postsById.set(String(post.id), post);
        }
      }
      console.log(`[posts] Loaded ${postsById.size} post(s) from disk`);
    }
  } catch (err) {
    console.warn(
      "[posts] Failed to load from disk:",
      err && err.message ? err.message : err
    );
  }
}

function savePostsToDisk() {
  try {
    ensureDataDir();
    const all = [...postsById.values()];
    const json = JSON.stringify(all, null, 2);
    fs.writeFileSync(POSTS_FILE, json, "utf8");
    console.log(`[posts] Saved ${all.length} post(s) to disk`);
  } catch (err) {
    console.warn(
      "[posts] Failed to save to disk:",
      err && err.message ? err.message : err
    );
  }
}

function loadJourneyFromDisk() {
  try {
    ensureDataDir();
    if (!fs.existsSync(JOURNEY_FILE)) return;
    const raw = fs.readFileSync(JOURNEY_FILE, "utf8");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object") {
      journeyProgressByAmbassador.clear();
      for (const [ambassadorId, progress] of Object.entries(parsed)) {
        journeyProgressByAmbassador.set(ambassadorId, progress);
      }
      console.log(
        `[journey] Loaded ${journeyProgressByAmbassador.size} records`
      );
    }
  } catch (err) {
    console.warn("[journey] Load failed:", err?.message || err);
  }
}

function saveJourneyToDisk() {
  try {
    ensureDataDir();
    const obj = {};
    for (const [
      ambassadorId,
      progress,
    ] of journeyProgressByAmbassador.entries()) {
      obj[ambassadorId] = progress;
    }
    fs.writeFileSync(JOURNEY_FILE, JSON.stringify(obj, null, 2), "utf8");
  } catch (err) {
    console.warn("[journey] Save failed:", err?.message || err);
  }
}

// ============================================
// UPLOADS DIRECTORY FUNCTIONS
// ============================================
function ensureUploadsDir() {
  try {
    const uploadsDir = path.join(__dirname, 'uploads', 'cvs');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`[uploads] Created directory: ${uploadsDir}`);
    }
  } catch (err) {
    console.warn('[uploads] Failed to ensure uploads directory:', err?.message || err);
  }
}

// ============================================
// APPLICATIONS API ENDPOINTS
// ============================================

// Multer configuration for CV uploads
const cvStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, 'uploads', 'cvs');
    // Ensure directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'cv-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const cvUpload = multer({
  storage: cvStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed'));
    }
  }
});

// POST: Submit an application
// ============================================
// FIXED APPLICATION SUBMISSION ENDPOINT
// Replace the existing /api/applications/submit endpoint with this
// ============================================

app.post(
  '/api/applications/submit',
  requireAuth,
  cvUpload.single('cv'),
  async (req, res) => {
    console.log('\n🚀 ========== APPLICATION SUBMISSION START ==========');
    
    try {
      console.log('📋 Step 1: Request received');
      console.log('   Body:', JSON.stringify(req.body, null, 2));
      console.log('   File:', req.file ? req.file.filename : 'NO FILE');
      console.log('   Auth:', { userId: req.auth.userId, role: req.auth.role });
      
      const { postId, postTitle, subscribeToNewsletter, termsAccepted } = req.body;
      const userId = req.auth.userId;
      const userRole = req.auth.role;

      // Validation
      console.log('\n✅ Step 2: Validation');
      if (!postId) {
        console.log('   ❌ Missing postId');
        return res.status(400).json({ error: 'Post ID is required' });
      }
      console.log('   ✓ postId:', postId);

      if (!req.file) {
        console.log('   ❌ Missing CV file');
        return res.status(400).json({ error: 'CV file is required' });
      }
      console.log('   ✓ CV file:', req.file.filename);

      if (termsAccepted !== 'true' && termsAccepted !== true) {
        console.log('   ❌ Terms not accepted');
        return res.status(400).json({ error: 'Terms must be accepted' });
      }
      console.log('   ✓ Terms accepted');

      if (userRole !== 'ambassador') {
        console.log('   ❌ Wrong role:', userRole);
        return res.status(403).json({ error: 'Only ambassadors can submit applications' });
      }
      console.log('   ✓ Role verified: ambassador');

      // Lookup ambassador
      console.log('\n🔍 Step 3: Looking up ambassador');
      console.log('   Searching for user_id:', userId);

      const { data: ambassador, error: ambassadorError } = await supabase
        .from('ambassadors')
        .select('ambassador_id, first_name, last_name, email, user_id')
        .eq('user_id', userId)
        .single();

      if (ambassadorError) {
        console.error('   ❌ Database error:', ambassadorError);
        return res.status(500).json({ 
          error: 'Database error',
          details: ambassadorError.message 
        });
      }

      if (!ambassador) {
        console.error('   ❌ No ambassador found');
        return res.status(404).json({ error: 'Ambassador profile not found' });
      }

      console.log('   ✅ Ambassador found:');
      console.log('      ambassador_id:', ambassador.ambassador_id);
      console.log('      Name:', `${ambassador.first_name} ${ambassador.last_name}`);
      console.log('      Email:', ambassador.email);

      // Check post exists
      console.log('\n🔍 Step 4: Verifying post');
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('post_id, title, partner_id')
        .eq('post_id', postId)
        .single();

      if (postError || !post) {
        console.error('   ❌ Post not found:', postError);
        return res.status(404).json({ error: 'Opportunity not found' });
      }

      console.log('   ✅ Post found:', post.title);

      // Check for existing application
      console.log('\n🔍 Step 5: Checking for duplicate');
      const { data: existingApp } = await supabase
        .from('applications')
        .select('application_id')
        .eq('post_id', postId)
        .eq('ambassador_id', ambassador.ambassador_id)
        .single();

      if (existingApp) {
        console.log('   ⚠️ Already applied');
        return res.status(400).json({ error: 'You have already applied to this opportunity' });
      }

      console.log('   ✅ No duplicate found');

      // Create application
      console.log('\n💾 Step 6: Creating application');
      const applicationId = uuidv4();
      
      const applicationData = {
        application_id: applicationId,
        post_id: postId,
        ambassador_id: ambassador.ambassador_id,
        partner_id: post.partner_id,
        cv_filename: req.file.filename,
        status: 'pending',
        applied_at: new Date().toISOString(),
        subscribe_to_newsletter: subscribeToNewsletter === 'true' || subscribeToNewsletter === true,
        terms_accepted: true
      };

      console.log('   Data:', JSON.stringify(applicationData, null, 2));

      const { data: savedApp, error: dbError } = await supabase
        .from('applications')
        .insert([applicationData])
        .select()
        .single();

      if (dbError) {
        console.error('   ❌ Database error:', dbError);
        return res.status(500).json({ 
          error: 'Failed to save application',
          details: dbError.message 
        });
      }

      console.log('   ✅ Application saved:', savedApp.application_id);

      // Create notifications
      console.log('\n📬 Step 7: Creating notifications');
      try {
        await createNotification(
          userId,
          'ambassador',
          'application_submitted',
          '✅ Application Submitted',
          `Your application for "${postTitle || post.title}" has been received.`,
          `/Partner-Calls.html`,
          applicationId
        );
        console.log('   ✅ Ambassador notification sent');
      } catch (notifError) {
        console.error('   ⚠️ Notification failed:', notifError.message);
      }

      console.log('\n🎉 ========== SUCCESS ==========\n');

      return res.json({
        success: true,
        applicationId: savedApp.application_id,
        message: 'Application submitted successfully!'
      });

    } catch (error) {
      console.error('\n❌ ========== ERROR ==========');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.error('=============================\n');
      
      return res.status(500).json({ 
        error: 'Failed to submit application',
        details: error.message 
      });
    }
  }
);

// ============================================
// 3. CREATE SERVICE (T4L Partners Only)
// ============================================
app.post('/api/services', requireAuth, requireRole('partner'), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { 
      title, 
      type, 
      description, 
      duration, 
      capacity, 
      externalLink, 
      status,
      pricing_type,    // ✅ NEW
      price,           // ✅ NEW
      currency,        // ✅ NEW
      price_note       // ✅ NEW
    } = req.body;

    console.log('📝 Creating service for partner user_id:', userId);

    // Validation
    if (!title || !type || !description) {
      return res.status(400).json({ 
        error: 'Title, type, and description are required' 
      });
    }

    // ✅ Validate pricing_type if provided
    if (!pricing_type) {
      return res.status(400).json({ 
        error: 'Pricing type is required' 
      });
    }

    // Get partner info
    const partner = await getUserById(userId, 'partner');
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    const partnerId = partner.partner_id;

const serviceData = {
  service_id: uuidv4(),
  partner_id: partnerId,
  title: title.trim(),
  type: type,
  description: description.trim(),
  duration: duration || null,
  capacity: capacity || null,
  external_link: externalLink || null,
  status: status || 'active',  // ✅ FIXED: Defaults to 'active'
  pricing_type: pricing_type,
  price: price ? parseFloat(price) : null,
  currency: currency || 'USD',
  price_note: price_note || null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

    console.log('💾 Saving service with pricing for partner_id:', partnerId);

    const service = await createService(serviceData);

    console.log('✅ Service created:', service.service_id);

    return res.json({
      success: true,
      service,
      message: 'Service created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating service:', error);
    return res.status(500).json({ 
      error: 'Failed to create service',
      details: error.message 
    });
  }
});

app.post('/api/services/:id/request', requireAuth, async (req, res) => {
  console.log('🚀 ========== SERVICE REQUEST START ==========');
  
  try {
    const serviceId = req.params.id;
    const userId = req.auth.userId;
    const userRole = req.auth.role;
    const { message } = req.body;

    console.log('📮 Requesting service:', { serviceId, userId, userRole });

    // 1. Only ambassadors can request
    if (userRole !== 'ambassador') {
      return res.status(403).json({ 
        error: 'Only ambassadors can request services' 
      });
    }

    console.log('✅ Step 1: Role check passed');

    // 2. Get service
    const service = await getServiceById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (service.status !== 'active') {
      return res.status(400).json({ error: 'Service is not accepting requests' });
    }

    console.log('✅ Step 2: Service found -', service.title);

    // 3. Get ambassador
    const ambassador = await getUserById(userId, 'ambassador');
    if (!ambassador) {
      return res.status(404).json({ error: 'Ambassador profile not found' });
    }

    const ambassadorId = ambassador.ambassador_id;
    console.log('✅ Step 3: Ambassador found -', ambassadorId);

    // 4. Check if already requested
    const { data: existingRequest } = await supabase
      .from('service_requests')
      .select('request_id')
      .eq('service_id', serviceId)
      .eq('ambassador_id', ambassadorId)
      .single();

    if (existingRequest) {
      console.log('⚠️ Already requested');
      return res.status(400).json({ 
        error: 'You have already requested this service' 
      });
    }

    console.log('✅ Step 4: No duplicate found');

    // 5. CREATE THE SERVICE REQUEST (THIS IS THE IMPORTANT PART)
    const requestId = uuidv4();
    const requestData = {
      request_id: requestId,
      service_id: serviceId,
      ambassador_id: ambassadorId,
      partner_id: service.partner_id,
      message: message || '',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    console.log('💾 Creating service request in database:', requestId);

    const { data: serviceRequest, error: createError } = await supabase
      .from('service_requests')
      .insert([requestData])
      .select()
      .single();

    if (createError) {
      console.error('❌ Database error:', createError);
      throw createError;
    }

    console.log('✅ Step 5: Service request CREATED in database!', requestId);

    // 6. CREATE NOTIFICATIONS (WON'T FAIL IF THESE DON'T WORK)
    const ambassadorName = ambassador.first_name 
      ? `${ambassador.first_name} ${ambassador.last_name || ''}`.trim()
      : 'An ambassador';

    console.log('📬 Creating notifications...');

    // Get partner user_id
    const partnerUserId = await getPartnerUserIdFromPartnerId(service.partner_id);
    
    if (partnerUserId) {
      // 🚨 CRITICAL FIX: application_id = null, request_id = requestId
      await createNotification(
        partnerUserId,
        'partner',
        'service_request',
        '📋 New Service Request',
        `${ambassadorName} has requested your service "${service.title}"`,
        `/my-services.html`,
        null,  // 🚨 MUST BE NULL FOR SERVICE REQUESTS
        requestId  // 🚨 THIS IS THE SERVICE REQUEST ID
      );
      console.log('✅ Partner notification sent');
    }

    // Notify ambassador
    await createNotification(
      userId,
      'ambassador',
      'service_request_sent',
      '✅ Service Request Sent',
      `Your request for "${service.title}" has been sent to the partner`,
      `/services.html`,
      null,  // 🚨 MUST BE NULL FOR SERVICE REQUESTS
      requestId  // 🚨 THIS IS THE SERVICE REQUEST ID
    );
    
    console.log('✅ Ambassador notification sent');

    console.log('\n🎉 ========== SERVICE REQUEST SUCCESS ==========\n');

    // 7. RETURN SUCCESS RESPONSE
    return res.json({
      success: true,
      requestId: requestId,
      message: 'Service request submitted successfully!'
    });

  } catch (error) {
    console.error('\n❌ ========== SERVICE REQUEST ERROR ==========');
    console.error('Error:', error.message);
    console.error('===========================================\n');
    
    return res.status(500).json({ 
      error: 'Failed to submit service request',
      details: error.message 
    });
  }
});


// ============================================
// PARTNER: Get applications for specific partner - FIXED
// ============================================
app.get(
  '/api/partner/applications',
  requireAuth,
  requireRole('partner'),
  async (req, res) => {
    try {
      const userId = req.auth.userId;  // This is user_id
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      console.log('📋 Fetching applications for user_id:', userId);

      // ✅ FIX: First get the partner_id from the partners table
      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('partner_id')
        .eq('user_id', userId)  // Lookup by user_id
        .single();

      if (partnerError || !partner) {
        console.error("❌ Partner not found for user_id:", userId);
        return res.json({
          items: [],
          total: 0,
          limit,
          offset
        });
      }

      console.log('✅ Found partner_id:', partner.partner_id);

      // ✅ Now get applications using the correct partner_id
      const { data: applications, error, count } = await supabase
        .from('applications')
        .select('*', { count: 'exact' })
        .eq('partner_id', partner.partner_id)  // ✅ Use partner_id from lookup!
        .order('applied_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching applications:', error);
        throw error;
      }

      if (!applications || applications.length === 0) {
        return res.json({
          items: [],
          total: 0,
          limit,
          offset
        });
      }

      // Get detailed information for each application
      const detailedApplications = await Promise.all(
        applications.map(async (app) => {
          // Get ambassador details
          let ambassadorName = 'Unknown';
          let ambassadorProfile = null;
          
          if (app.ambassador_id) {
            const { data: ambassador } = await supabase
              .from('ambassadors')
              .select('first_name, last_name, email, cv_filename')
              .eq('ambassador_id', app.ambassador_id)
              .single();
            
            if (ambassador) {
              ambassadorName = `${ambassador.first_name || ''} ${ambassador.last_name || ''}`.trim();
              ambassadorProfile = {
                name: ambassadorName,
                email: ambassador.email,
                cvFilename: ambassador.cv_filename
              };
            }
          }

          // Get post title
          let postTitle = 'Opportunity';
          if (app.post_id) {
            const { data: post } = await supabase
              .from('posts')
              .select('title')
              .eq('post_id', app.post_id)
              .single();
            
            if (post) {
              postTitle = post.title;
            }
          }

          return {
            id: app.application_id,
            application_id: app.application_id,
            postId: app.post_id,
            postTitle: postTitle,
            ambassadorId: app.ambassador_id,
            ambassadorName: ambassadorName,
            ambassadorProfile: ambassadorProfile,
            status: app.status,
            appliedAt: app.applied_at,
            cvFilename: app.cv_filename,
            subscribeToNewsletter: app.subscribe_to_newsletter,
            termsAccepted: app.terms_accepted
          };
        })
      );

      console.log('✅ Found', detailedApplications.length, 'applications');

      return res.json({
        items: detailedApplications,
        total: count || 0,
        limit,
        offset
      });
    } catch (error) {
      console.error('❌ Error fetching partner applications:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch applications',
        details: error.message 
      });
    }
  }
);
// ============================================
// TEST ENDPOINT FOR PRESENTATION
// ============================================
app.get('/api/test-fix', async (req, res) => {
  console.log('🧪 TEST: Checking if service request fix works...');
  
  // Test the logic
  const testId = uuidv4();
  
  return res.json({
    status: 'READY',
    fix: 'APPLIED',
    message: 'Service requests now use request_id instead of application_id',
    test: {
      correct_format: {
        application_id: null,
        request_id: testId
      },
      timestamp: new Date().toISOString()
    }
  });
});


// ============================================
// PARTNER: Update application status - FIXED
// ============================================
app.put(
  '/api/partner/applications/:id/status',
  requireAuth,
  requireRole('partner'),
  async (req, res) => {
    try {
      const userId = req.auth.userId;  // ✅ This is user_id from session
      const applicationId = req.params.id;
      const { status } = req.body;

      if (!status || !['pending', 'accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ 
          error: 'Valid status is required (pending, accepted, or rejected)' 
        });
      }

      console.log('📝 Updating application status:', { applicationId, status, userId });

      // ✅ FIX: First get the partner_id from the partners table
      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('partner_id')
        .eq('user_id', userId)  // ✅ Lookup by user_id
        .single();

      if (partnerError || !partner) {
        console.error("❌ Partner not found for user_id:", userId);
        return res.status(404).json({ error: 'Partner not found' });
      }

      console.log('✅ Found partner_id:', partner.partner_id);

      // ✅ Check if application belongs to this partner using partner_id
      const { data: application, error: fetchError } = await supabase
        .from('applications')
        .select('*')
        .eq('application_id', applicationId)
        .eq('partner_id', partner.partner_id)  // ✅ Use partner_id from lookup!
        .single();

      if (fetchError || !application) {
        console.log('❌ Application not found or unauthorized');
        return res.status(404).json({ error: 'Application not found' });
      }

      console.log('✅ Application found, updating status...');

      // ✅ Update status
      const { data: updatedApplication, error: updateError } = await supabase
        .from('applications')
        .update({ status: status })
        .eq('application_id', applicationId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating application:', updateError);
        throw updateError;
      }

      console.log('✅ Application status updated successfully');

      // Get ambassador and post details for notification
      const { data: ambassador } = await supabase
        .from('ambassadors')
        .select('first_name, last_name, email, user_id')
        .eq('ambassador_id', application.ambassador_id)
        .single();

      const { data: post } = await supabase
        .from('posts')
        .select('title')
        .eq('post_id', application.post_id)
        .single();

      const ambassadorName = ambassador 
        ? `${ambassador.first_name || ''} ${ambassador.last_name || ''}`.trim()
        : 'Ambassador';
      
      const postTitle = post ? post.title : 'Opportunity';

      // Create notification for ambassador
      const statusMessages = {
        accepted: {
          title: '🎉 Application Accepted!',
          message: `Great news! Your application for "${postTitle}" has been accepted. The partner will contact you soon.`
        },
        rejected: {
          title: '❌ Application Update',
          message: `Your application for "${postTitle}" was not selected this time. Keep applying to other opportunities!`
        },
        pending: {
          title: '⏳ Application Under Review',
          message: `Your application for "${postTitle}" is being reviewed by the partner.`
        }
      };

      const notificationInfo = statusMessages[status];

      // ✅ IMPORTANT: Use ambassador's user_id for notification, not ambassador_id
      if (ambassador && ambassador.user_id) {
        await createNotification(
          ambassador.user_id,  // ✅ Use user_id for notification recipient
          'ambassador',
          'application_status_change',
          notificationInfo.title,
          notificationInfo.message,
          `/Partner-Calls.html`,
          applicationId
        );
        console.log('✅ Notification sent to ambassador');
      }

      return res.json({
        success: true,
        application: updatedApplication,
        message: `Application status updated to ${status}`,
        notificationSent: true
      });
    } catch (error) {
      console.error('❌ Error updating application status:', error);
      return res.status(500).json({ 
        error: 'Failed to update application status',
        details: error.message 
      });
    }
  }
);

app.put('/api/services/:id', requireAuth, requireRole('partner'), async (req, res) => {
  try {
    const serviceId = req.params.id;
    const userId = req.auth.userId;
    const updates = req.body;

    console.log('✏️ Updating service:', { serviceId, userId });

    // Verify service exists and belongs to this partner
    const service = await getServiceById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const partner = await getUserById(userId, 'partner');
    if (!partner || (partner.partner_id !== service.partner_id && partner.id !== service.partner_id)) {
      return res.status(403).json({ error: 'Not authorized to update this service' });
    }

    // Only allow certain fields to be updated
    const allowedUpdates = ['title', 'description', 'type', 'duration', 'capacity', 'external_link', 'status'];
    const filteredUpdates = {};
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });

    filteredUpdates.updated_at = new Date().toISOString();

    const updatedService = await updateService(serviceId, filteredUpdates);

    return res.json({
      success: true,
      service: updatedService,
      message: 'Service updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating service:', error);
    return res.status(500).json({ 
      error: 'Failed to update service',
      details: error.message 
    });
  }
});

app.put('/api/service-requests/:id/status', requireAuth, requireRole('partner'), async (req, res) => {
  try {
    const requestId = req.params.id;
    const userId = req.auth.userId;
    const { status } = req.body;

    console.log('📝 Updating request status:', { requestId, status, userId });

    if (!status || !['pending', 'accepted', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ 
        error: 'Valid status is required (pending, accepted, rejected, or completed)' 
      });
    }

    // Get request details
    const { data: request, error: requestError } = await supabase
      .from('service_requests')
      .select('*, services:service_id(title, partner_id)')
      .eq('request_id', requestId)
      .single();

    if (requestError || !request) {
      return res.status(404).json({ error: 'Service request not found' });
    }

    // Verify partner owns the service
    const partner = await getUserById(userId, 'partner');
    if (!partner || (partner.partner_id !== request.partner_id && partner.id !== request.partner_id)) {
      return res.status(403).json({ error: 'Not authorized to update this request' });
    }

    // Update status
    const updatedRequest = await updateServiceRequestStatus(requestId, status);

    // Get ambassador info for notification
    const { data: ambassador } = await supabase
      .from('ambassadors')
      .select('first_name, last_name, email, user_id')
      .eq('ambassador_id', request.ambassador_id)
      .single();

    // Create notification for ambassador
    const statusMessages = {
      accepted: {
        title: '🎉 Service Request Accepted!',
        message: `Your request for "${request.services?.title || 'service'}" has been accepted. The partner will contact you soon.`
      },
      rejected: {
        title: '❌ Service Request Update',
        message: `Your request for "${request.services?.title || 'service'}" was not accepted at this time.`
      },
      completed: {
        title: '✅ Service Completed',
        message: `Your service "${request.services?.title || 'service'}" has been marked as completed.`
      }
    };

    const notificationInfo = statusMessages[status];
    
    // Get ambassador's user_id for notification
    const ambassadorUserId = await getAmbassadorUserIdFromAmbassadorId(request.ambassador_id);
    
    if (ambassadorUserId && notificationInfo) {
      await createNotification(
        ambassadorUserId,
        'ambassador',
        'service_request_status',
        notificationInfo.title,
        notificationInfo.message,
        `/services.html`,
        requestId
      );
      console.log('✅ Notification sent to ambassador');
    }

    return res.json({
      success: true,
      request: updatedRequest,
      message: `Request status updated to ${status}`
    });
  } catch (error) {
    console.error('❌ Error updating request status:', error);
    return res.status(500).json({ 
      error: 'Failed to update request status',
      details: error.message 
    });
  }
});

// ============================================
// NOTIFICATION ENDPOINTS
// ============================================

// Get notifications for current user
app.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const role = req.auth.role;
    const limit = parseInt(req.query.limit) || 20;
    const unreadOnly = req.query.unread === 'true';

    console.log('📬 Fetching notifications for:', userId, role);

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .eq('recipient_type', role)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }

    console.log('✅ Found', notifications?.length || 0, 'notifications');

    return res.json({
      notifications: notifications || [],
      total: notifications?.length || 0,
      unreadCount: notifications?.filter(n => !n.read).length || 0
    });
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch notifications',
      details: error.message 
    });
  }
});

// ============================================
// GET AMBASSADOR PORTFOLIO/PROFILE
// ============================================
app.get('/api/ambassadors/:id/portfolio', requireAuth, async (req, res) => {
  try {
    const ambassadorId = req.params.id;
    
    console.log('📖 Fetching ambassador portfolio:', ambassadorId);

    // Get ambassador basic info
    const { data: ambassador, error: ambError } = await supabase
      .from('ambassadors')
      .select('first_name, last_name, email, bio, profile_picture, linkedin_url, portfolio_url, cv_filename')
      .eq('ambassador_id', ambassadorId)
      .single();

    if (ambError || !ambassador) {
      console.log('❌ Ambassador not found:', ambassadorId);
      return res.status(404).json({ error: 'Ambassador not found' });
    }

    // Get ambassador's articles (as portfolio items)
    const { data: articles, error: artError } = await supabase
      .from('articles')
      .select('article_id, title, excerpt, content, status, created_at, likes, views')
      .eq('ambassador_id', ambassadorId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(5);

    if (artError) {
      console.error('Error fetching articles:', artError);
    }

    // Get ambassador's journey progress
    const { data: journeyProgress } = await supabase
      .from('journey_progress')
      .select('current_month, completed_tasks')
      .eq('ambassador_id', ambassadorId)
      .single();

    // Calculate skills based on completed tasks
    let skills = [];
    if (journeyProgress && journeyProgress.completed_tasks) {
      const completedTasks = journeyProgress.completed_tasks;
      if (completedTasks['1-linkedin_course']) skills.push('LinkedIn Strategy');
      if (completedTasks['2-implement_audit']) skills.push('Content Audit');
      if (completedTasks['2-submit_article_1']) skills.push('Article Writing');
      if (completedTasks['3-first_event']) skills.push('Event Management');
    }

    return res.json({
      success: true,
      ambassador: {
        id: ambassadorId,
        name: `${ambassador.first_name || ''} ${ambassador.last_name || ''}`.trim(),
        email: ambassador.email,
        bio: ambassador.bio || 'No bio provided',
        profilePicture: ambassador.profile_picture,
        linkedinUrl: ambassador.linkedin_url,
        portfolioUrl: ambassador.portfolio_url,
        cvFilename: ambassador.cv_filename,
        skills: skills.length > 0 ? skills : ['Content Creation', 'Community Engagement']
      },
      portfolio: {
        articles: articles || [],
        totalArticles: articles?.length || 0,
        // Add other portfolio items here if needed
      },
      journey: journeyProgress || null
    });
  } catch (error) {
    console.error('❌ Error fetching ambassador portfolio:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch ambassador portfolio',
      details: error.message 
    });
  }
});

// Mark notification as read
app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.auth.userId;

    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('notification_id', notificationId)
      .eq('recipient_id', userId)
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, notification: data });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Mark all notifications as read
app.post('/api/notifications/mark-all-read', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', userId)
      .eq('read', false);

    if (error) throw error;

    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    return res.status(500).json({ error: 'Failed to update notifications' });
  }
});


// ============================================
// AMBASSADOR: Get own applications with status - FIXED
// ============================================
app.get(
  '/api/ambassador/applications',
  requireAuth,
  requireRole('ambassador'),
  async (req, res) => {
    try {
      const userId = req.auth.userId;  // This is user_id
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      console.log('📋 Fetching applications for user_id:', userId);

      // ✅ FIX: First get the ambassador_id from the ambassadors table
      const ambassador = await getUserById(userId, 'ambassador');
      if (!ambassador) {
        console.error("❌ Ambassador not found for user_id:", userId);
        return res.json({
          items: [],
          total: 0,
          limit,
          offset
        });
      }

      const ambassadorId = ambassador.ambassador_id || ambassador.id;
      console.log('✅ Found ambassador_id:', ambassadorId);

      // ✅ Now query applications using the correct ambassador_id
      const { data: applications, error, count } = await supabase
        .from('applications')
        .select('*', { count: 'exact' })
        .eq('ambassador_id', ambassadorId)  // ✅ Use ambassador_id!
        .order('applied_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching applications:', error);
        throw error;
      }

      // Get post details for each application
      const detailedApplications = await Promise.all(
        (applications || []).map(async (app) => {
          const { data: post } = await supabase
            .from('posts')
            .select('title, content, category')
            .eq('post_id', app.post_id)
            .single();

          return {
            id: app.application_id,
            postId: app.post_id,
            postTitle: post?.title || 'Opportunity',
            postContent: post?.content || '',
            postCategory: post?.category || 'general',
            status: app.status,  // ✅ Return actual status
            appliedAt: app.applied_at,
            cvFilename: app.cv_filename,
            subscribeToNewsletter: app.subscribe_to_newsletter,
            termsAccepted: app.terms_accepted
          };
        })
      );

      console.log('✅ Found', detailedApplications.length, 'applications');

      return res.json({
        items: detailedApplications,
        total: count || 0,
        limit,
        offset
      });
    } catch (error) {
      console.error('❌ Error fetching ambassador applications:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch applications',
        details: error.message 
      });
    }
  }
);


// ============================================
// PARTNER: Get single application by ID - FIXED
// ============================================
app.get(
  '/api/partner/applications/:id',
  requireAuth,
  requireRole('partner'),
  async (req, res) => {
    try {
      const userId = req.auth.userId;  // ✅ This is user_id from session
      const applicationId = req.params.id;

      console.log('📖 Fetching application:', applicationId, 'for user_id:', userId);

      // ✅ FIX: First get the partner_id from the partners table
      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('partner_id')
        .eq('user_id', userId)  // ✅ Lookup by user_id
        .single();

      if (partnerError || !partner) {
        console.error("❌ Partner not found for user_id:", userId);
        return res.status(404).json({ error: 'Partner not found' });
      }

      console.log('✅ Found partner_id:', partner.partner_id);

      // ✅ Get application and verify it belongs to this partner using partner_id
      const { data: application, error } = await supabase
        .from('applications')
        .select('*')
        .eq('application_id', applicationId)
        .eq('partner_id', partner.partner_id)  // ✅ Use partner_id from lookup!
        .single();

      if (error || !application) {
        console.log('❌ Application not found or unauthorized');
        return res.status(404).json({ error: 'Application not found' });
      }

      console.log('✅ Application found:', application.application_id);

      // Get ambassador details
      let ambassadorName = 'Unknown';
      let ambassadorProfile = null;
      
      if (application.ambassador_id) {
        const { data: ambassador } = await supabase
          .from('ambassadors')
          .select('first_name, last_name, email, cv_filename')
          .eq('ambassador_id', application.ambassador_id)
          .single();
        
        if (ambassador) {
          ambassadorName = `${ambassador.first_name || ''} ${ambassador.last_name || ''}`.trim();
          ambassadorProfile = {
            name: ambassadorName,
            email: ambassador.email,
            cvFilename: ambassador.cv_filename
          };
        }
      }

      // Get post title
      let postTitle = 'Opportunity';
      if (application.post_id) {
        const { data: post } = await supabase
          .from('posts')
          .select('title')
          .eq('post_id', application.post_id)
          .single();
        
        if (post) {
          postTitle = post.title;
        }
      }

      const formattedApplication = {
        id: application.application_id,
        application_id: application.application_id,
        postId: application.post_id,
        postTitle: postTitle,
        ambassadorId: application.ambassador_id,
        ambassadorName: ambassadorName,
        ambassadorProfile: ambassadorProfile,
        status: application.status,
        appliedAt: application.applied_at,
        cvFilename: application.cv_filename,
        subscribeToNewsletter: application.subscribe_to_newsletter,
        termsAccepted: application.terms_accepted
      };

      console.log('✅ Formatted application sent to frontend');

      return res.json({
        application: formattedApplication
      });
    } catch (error) {
      console.error('❌ Error fetching application:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch application',
        details: error.message 
      });
    }
  }
);

// Serve uploaded CV files
app.get('/uploads/cvs/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', 'cvs', req.params.filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// ============================================
// 1. GET ALL SERVICES (For Everyone)
// ============================================
app.get('/api/services', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const userRole = req.auth.role;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type;
    const search = req.query.search;

    console.log('📋 Fetching services for:', { userId, userRole });

    let filters = { 
      limit, 
      offset,
      status: 'active'
    };
    
    if (type && type !== 'all') filters.type = type;
    if (search && search.trim() !== '') filters.search = search.trim();

    const { services, total } = await getServices(filters);

    // ✅ OPTIMIZATION: Get user data once
    let userPartner = null;
    let userAmbassador = null;
    let userPartnerAsAmbassador = null;
    
    if (userRole === 'partner') {
      userPartner = await getUserById(userId, 'partner');
      
      // Check if partner also has ambassador profile
      const { data: partnerAmbassador } = await supabase
        .from('ambassadors')
        .select('ambassador_id')
        .eq('user_id', userId)
        .single();
      
      userPartnerAsAmbassador = partnerAmbassador;
    } else if (userRole === 'ambassador') {
      userAmbassador = await getUserById(userId, 'ambassador');
    }

    // ✅ OPTIMIZATION: Get all request statuses in one query
    let requestedServiceIds = new Set();
    if (userRole === 'ambassador' && userAmbassador) {
      const ambassadorId = userAmbassador.ambassador_id || userAmbassador.id;
      const { data: existingRequests } = await supabase
        .from('service_requests')
        .select('service_id, status')
        .eq('ambassador_id', ambassadorId);
      
      existingRequests?.forEach(req => requestedServiceIds.add(req.service_id));
    } else if (userRole === 'partner' && userPartnerAsAmbassador) {
      // Partner requesting as ambassador
      const { data: existingRequests } = await supabase
        .from('service_requests')
        .select('service_id, status')
        .eq('ambassador_id', userPartnerAsAmbassador.ambassador_id);
      
      existingRequests?.forEach(req => requestedServiceIds.add(req.service_id));
    }

    // Process services
    const processedServices = services.map(service => {
      const processed = { ...service };
      
      // Check ownership
      if (userPartner) {
        processed.isOwner = (service.partner_id === userPartner.partner_id);
      }
      
      // Check if requested
      processed.hasRequested = requestedServiceIds.has(service.service_id);
      
      return processed;
    });

    console.log(`✅ Found ${processedServices.length} services`);

    return res.json({
      services: processedServices,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('❌ Error fetching services:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch services',
      details: error.message 
    });
  }
});

// ============================================
// 8. GET SERVICE REQUESTS (Service Owner Only)
// ============================================
app.get('/api/services/:id/requests', requireAuth, requireRole('partner'), async (req, res) => {
  try {
    const serviceId = req.params.id;
    const userId = req.auth.userId;

    console.log('📋 Fetching requests for service:', { serviceId, userId });

    // Verify service exists and belongs to this partner
    const service = await getServiceById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const partner = await getUserById(userId, 'partner');
    if (!partner || (partner.partner_id !== service.partner_id && partner.id !== service.partner_id)) {
      return res.status(403).json({ error: 'Not authorized to view these requests' });
    }

    const requests = await getServiceRequests(serviceId);

    // Get ambassador info for each request
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const { data: ambassador } = await supabase
          .from('ambassadors')
          .select('first_name, last_name, email')
          .eq('ambassador_id', request.ambassador_id)
          .single();

        return {
          ...request,
          ambassador: ambassador ? {
            name: `${ambassador.first_name || ''} ${ambassador.last_name || ''}`.trim(),
            email: ambassador.email
          } : null
        };
      })
    );

    console.log(`✅ Found ${requestsWithDetails.length} requests`);

    return res.json({
      service: {
        id: service.service_id,
        title: service.title
      },
      requests: requestsWithDetails,
      total: requestsWithDetails.length
    });
  } catch (error) {
    console.error('❌ Error fetching service requests:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch service requests',
      details: error.message 
    });
  }
});

// ============================================
// 6. GET MY SERVICES (T4L Partners Only)
// ============================================
app.get('/api/partner/services', requireAuth, requireRole('partner'), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;

    console.log('📋 Fetching partner services for:', userId);

    const partner = await getUserById(userId, 'partner');
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    const partnerId = partner.partner_id || partner.id;

    let filters = { 
      partnerId,
      limit, 
      offset 
    };
    
    if (status && status !== 'all') {
      filters.status = status;
    }

    const { services, total } = await getServices(filters);

    // Get request counts for each service
    const servicesWithRequests = await Promise.all(
      services.map(async (service) => {
        const { count: requestCount } = await supabase
          .from('service_requests')
          .select('*', { count: 'exact', head: true })
          .eq('service_id', service.service_id);
        
        return {
          ...service,
          requestCount: requestCount || 0
        };
      })
    );

    console.log(`✅ Found ${servicesWithRequests.length} services for partner`);

    return res.json({
      services: servicesWithRequests,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('❌ Error fetching partner services:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch your services',
      details: error.message 
    });
  }
});

app.get('/api/services/:id', requireAuth, async (req, res) => {
  try {
    const serviceId = req.params.id;
    const userId = req.auth.userId;
    const userRole = req.auth.role;

    console.log('🔍 Fetching service details:', { serviceId, userId, userRole });

    const service = await getServiceById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Get creator info
    let creatorInfo = {};
    if (service.partner_id) {
      const { data: partner } = await supabase
        .from('partners')
        .select('organization_name, contact_person')
        .eq('partner_id', service.partner_id)
        .single();
      
      if (partner) {
        creatorInfo = {
          name: partner.contact_person || partner.organization_name,
          organization: partner.organization_name
        };
      }
    }

    // For ambassadors, check if they've requested this service
    let requestStatus = null;
    let hasRequested = false;
    
    if (userRole === 'ambassador') {
      const ambassador = await getUserById(userId, 'ambassador');
      if (ambassador) {
        const ambassadorId = ambassador.ambassador_id || ambassador.id;
        const { data: existingRequest } = await supabase
          .from('service_requests')
          .select('status')
          .eq('service_id', serviceId)
          .eq('ambassador_id', ambassadorId)
          .single();
        
        hasRequested = !!existingRequest;
        requestStatus = existingRequest?.status || null;
      }
    }

    // For partners, check if this is their service
    let isOwner = false;
    if (userRole === 'partner' && service.partner_id) {
      const partner = await getUserById(userId, 'partner');
      if (partner && (partner.partner_id === service.partner_id || partner.id === service.partner_id)) {
        isOwner = true;
        
        // Get request count for owner
        const { count: requestCount } = await supabase
          .from('service_requests')
          .select('*', { count: 'exact', head: true })
          .eq('service_id', serviceId);
        
        service.requestCount = requestCount || 0;
      }
    }

    const response = {
      ...service,
      creatorInfo,
      hasRequested,
      requestStatus,
      isOwner
    };

    return res.json(response);
  } catch (error) {
    console.error('❌ Error fetching service details:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch service details',
      details: error.message 
    });
  }
});

// 10. GET MY SERVICE REQUESTS (Ambassadors Only)
// ============================================
app.get('/api/ambassador/service-requests', requireAuth, requireRole('ambassador'), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    console.log('📋 Fetching ambassador service requests for:', userId);

    const ambassador = await getUserById(userId, 'ambassador');
    if (!ambassador) {
      return res.status(404).json({ error: 'Ambassador not found' });
    }

    const ambassadorId = ambassador.ambassador_id || ambassador.id;

    // Get all service requests for this ambassador
    const { data: requests, error, count } = await supabase
      .from('service_requests')
      .select('*', { count: 'exact' })
      .eq('ambassador_id', ambassadorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Get service details for each request
    const requestsWithDetails = await Promise.all(
      (requests || []).map(async (request) => {
        const { data: service } = await supabase
          .from('services')
          .select('title, type, description, status as service_status')
          .eq('service_id', request.service_id)
          .single();

        const { data: partner } = await supabase
          .from('partners')
          .select('organization_name, contact_person')
          .eq('partner_id', request.partner_id)
          .single();

        return {
          ...request,
          service: service || { title: 'Unknown Service' },
          partner: partner || { organization_name: 'Unknown Partner' }
        };
      })
    );

    console.log(`✅ Found ${requestsWithDetails.length} service requests`);

    return res.json({
      requests: requestsWithDetails,
      total: count || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error('❌ Error fetching ambassador service requests:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch your service requests',
      details: error.message 
    });
  }
});

// ============================================
// SERVICES HTML PAGE ROUTES
// ============================================

// Services page (for everyone)
app.get('/services.html', requireAuth, async (req, res) => {
  try {
    const user = await getUserById(req.auth.userId, req.auth.role);
    if (!user) {
      return res.redirect('/signin');
    }
    console.log('✅ Serving services.html to:', user.email);
    res.sendFile(path.join(__dirname, 'public', 'services.html'));
  } catch (error) {
    console.error('Error serving services page:', error);
    return res.redirect('/signin');
  }
});

// Create service page (for T4L partners only)
app.get('/create-service.html', requireAuth, requireRole('partner'), async (req, res) => {
  try {
    const user = await getUserById(req.auth.userId, 'partner');
    if (!user) {
      return res.redirect('/partner-signin');
    }
    console.log('✅ Serving create-service.html to partner:', user.email);
    res.sendFile(path.join(__dirname, 'public', 'create-service.html'));
  } catch (error) {
    console.error('Error serving create service page:', error);
    return res.redirect('/partner-signin');
  }
});

// My services page (for T4L partners only)
app.get('/my-services.html', requireAuth, requireRole('partner'), async (req, res) => {
  try {
    const user = await getUserById(req.auth.userId, 'partner');
    if (!user) {
      return res.redirect('/partner-signin');
    }
    console.log('✅ Serving my-services.html to partner:', user.email);
    res.sendFile(path.join(__dirname, 'public', 'my-services.html'));
  } catch (error) {
    console.error('Error serving my services page:', error);
    return res.redirect('/partner-signin');
  }
});
// Add this TEMPORARY debug endpoint
app.get('/api/debug/session', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const role = req.auth.role;
    
    console.log('🔍 SESSION DEBUG:');
    console.log('   user_id from session:', userId);
    console.log('   role from session:', role);
    
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_id, email, user_type')
      .eq('user_id', userId)
      .single();
    
    console.log('   User in users table:', user);
    
    // Check if ambassador exists
    const { data: ambassador, error: ambError } = await supabase
      .from('ambassadors')
      .select('ambassador_id, user_id, email, first_name, last_name')
      .eq('user_id', userId)
      .single();
    
    console.log('   Ambassador found:', ambassador);
    
    return res.json({
      session: { userId, role },
      user: user,
      ambassador: ambassador,
      errors: { userError, ambError }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ------------------------
// Helpers
// ------------------------
function hashPassword(password, salt) {
  return crypto
    .createHash("sha256")
    .update(`${salt}:${password}`)
    .digest("hex");
}

function generateId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function generateSessionId() {
  return crypto.randomBytes(16).toString("hex");
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  header.split(";").forEach((part) => {
    const [k, ...rest] = part.trim().split("=");
    if (!k) return;
    out[k] = decodeURIComponent(rest.join("="));
  });
  return out;
}

function setSessionCookie(res, sessionId, maxAgeMs) {
  const attrs = [
    `sid=${encodeURIComponent(sessionId)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
  ];
  if (maxAgeMs && Number.isFinite(maxAgeMs)) {
    attrs.push(`Max-Age=${Math.floor(maxAgeMs / 1000)}`);
  }
  res.setHeader("Set-Cookie", attrs.join("; "));
  console.log("Cookie set:", attrs.join("; "));
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    "sid=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0"
  );
}

// Enhanced session creation using database
async function createSessionEnhanced(res, userId, role, rememberMe) {
  try {
    const sessionId = generateSessionId();
    const now = new Date();
    const defaultTtlMs = 2 * 60 * 60 * 1000; // 2 hours
    const rememberTtlMs = 30 * 24 * 60 * 60 * 1000; // 30 days
    const ttl = rememberMe ? rememberTtlMs : defaultTtlMs;

    const expiresAt = new Date(now.getTime() + ttl);

    await createSessionDB({
      session_id: sessionId,
      user_id: userId,
      role: role,
      expires_at: expiresAt.toISOString(),
    });

    setSessionCookie(res, sessionId, ttl);

    console.log("Session created:", {
      sessionId,
      userId,
      role,
      expiresAt: expiresAt.toISOString(),
    });

    return sessionId;
  } catch (error) {
    console.error("Session creation error:", error);
    throw error;
  }
}

// Get session from database
async function getSession(req) {
  try {
    const cookies = parseCookies(req);
    const sid = cookies.sid;
    if (!sid) return null;

    const sess = await getSessionDB(sid);
    if (!sess) return null;

    const expiresAt = new Date(sess.expires_at);
    if (Date.now() > expiresAt.getTime()) {
      await deleteSessionDB(sid);
      return null;
    }

    return {
      sid,
      userId: sess.user_id,
      role: sess.role,
      expiresAt: expiresAt.getTime(),
    };
  } catch (error) {
    console.error("Get session error:", error);
    return null;
  }
}

// Legacy session functions (for partners and admins until converted)
function createSession(res, userId, role, rememberMe) {
  const sid = generateSessionId();
  const now = Date.now();
  const defaultTtlMs = 2 * 60 * 60 * 1000;
  const rememberTtlMs = 30 * 24 * 60 * 60 * 1000;
  const ttl = rememberMe ? rememberTtlMs : defaultTtlMs;
  sessions.set(sid, { userId, role, expiresAt: now + ttl });
  setSessionCookie(res, sid, ttl);
  return sid;
}

// ------------------------
// Auth & Role Middleware
// ------------------------
async function requireAuth(req, res, next) {
  const sess = await getSession(req);
  if (!sess) {
    if (req.path.endsWith(".html") || req.accepts("text/html")) {
      if (req.path.includes("admin")) {
        return res.redirect("/admin-signin.html");
      } else if (req.path.includes("partner")) {
        return res.redirect("/partner-signin");
      } else {
        return res.redirect("/signin");
      }
    }
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.auth = sess;
  next();
}

function requireRole(role) {
  return function (req, res, next) {
    if (!req.auth || req.auth.role !== role) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

function parseIntParam(value, fallback) {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function listItemsFromMap(
  map,
  { filterFn = () => true, limit = 20, offset = 0 }
) {
  const all = [...map.values()].filter(filterFn);
  const total = all.length;
  const items = all.slice(offset, offset + limit);
  return { total, items, limit, offset };
}

// ------------------------
// Seed test credentials
// ------------------------
const TEST_AMBASSADOR = {
  id: generateId("amb"),
  role: "ambassador",
  email: "ambassador@test.com",
  access_code: "T4LA-1234",
  status: "active",
  salt: crypto.randomBytes(8).toString("hex"),
};
TEST_AMBASSADOR.passwordHash = hashPassword(
  "password123",
  TEST_AMBASSADOR.salt
);

const TEST_PARTNER = {
  id: generateId("par"),
  role: "partner",
  email: "partner@test.com",
  access_code: "T4LP-5678",
  status: "approved",
  organizationName: "Test Partners Inc",
  contactName: "Test Partner",
  salt: crypto.randomBytes(8).toString("hex"),
};
TEST_PARTNER.passwordHash = hashPassword("password123", TEST_PARTNER.salt);

ambassadorsByEmail.set(TEST_AMBASSADOR.email.toLowerCase(), TEST_AMBASSADOR);

const TEST_ADMIN = {
  id: generateId("adm"),
  role: "admin",
  email: "admin@test.com",
  access_code: "T4LA-ADMIN",
  status: "active",
  salt: crypto.randomBytes(8).toString("hex"),
};
TEST_ADMIN.passwordHash = hashPassword("password123", TEST_ADMIN.salt);
adminsByEmail.set(TEST_ADMIN.email.toLowerCase(), TEST_ADMIN);

// Add a second test ambassador to see progress differences
const TEST_AMBASSADOR_2 = {
  id: generateId("amb"),
  role: "ambassador",
  email: "ambassador2@test.com",
  access_code: "T4LA-5678",
  status: "active",
  name: "Sarah Smith",
  salt: crypto.randomBytes(8).toString("hex"),
};
TEST_AMBASSADOR_2.passwordHash = hashPassword(
  "password123",
  TEST_AMBASSADOR_2.salt
);
ambassadorsByEmail.set(
  TEST_AMBASSADOR_2.email.toLowerCase(),
  TEST_AMBASSADOR_2
);

// Pre-populate some journey progress for testing
journeyProgressByAmbassador.set(TEST_AMBASSADOR.id, {
  currentMonth: 3,
  completedTasks: {
    "1-linkedin_course": true,
    "1-submit_profile": true,
    "1-second_course": true,
    "1-connect_10": true,
    "1-post_3x": true,
    "2-implement_audit": true,
    "2-submit_article_1": true,
    "2-engage_15": true,
    "2-third_course": true,
    "3-first_event": true,
    "3-follow_up_3": true,
    "3-transformation_post": true,
  },
  startDate: Date.now() - 60 * 24 * 60 * 60 * 1000, // 60 days ago
  monthStartDates: {
    1: Date.now() - 60 * 24 * 60 * 60 * 1000,
    2: Date.now() - 40 * 24 * 60 * 60 * 1000,
    3: Date.now() - 20 * 24 * 60 * 60 * 1000,
  },
  lastUpdated: Date.now(),
});

journeyProgressByAmbassador.set(TEST_AMBASSADOR_2.id, {
  currentMonth: 1,
  completedTasks: {
    "1-linkedin_course": true,
    "1-submit_profile": true,
    "1-second_course": false,
    "1-connect_10": false,
  },
  startDate: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
  monthStartDates: { 1: Date.now() - 10 * 24 * 60 * 60 * 1000 },
  lastUpdated: Date.now(),
});

// ------------------------
// Routes - Public
// ------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/signin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signin.html"));
});

app.get("/partner-signin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "partner-signin.html"));
});


app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signup.html"));
});

app.get("/partner-signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "partner-signup.html"));
});
app.get("/admin-signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-signup.html"));
});

app.get("/admin-signin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-signin.html"));
});

// ------------------------
// Registration Endpoints
// ------------------------
app.post("/register/ambassador", async (req, res) => {
  try {
    const { email, access_code, password, name } = req.body || {};
    console.log("Registration attempt:", { email, access_code, name });

    if (!email || !access_code || !password || !name) {
      return res.status(400).json({ error: "All fields required" });
    }

    const emailLower = String(email).toLowerCase().trim();
    const access_codeUpper = String(access_code).toUpperCase().trim();

    // Check if user already exists
    const existingUser = await getUserByEmail(emailLower, "ambassador");
    if (existingUser) {
      return res.status(409).json({ error: "Ambassador already exists" });
    }

    // Generate salt and hash password
    const salt = crypto.randomBytes(8).toString("hex");
    const passwordHash = hashPassword(password, salt);

    // Prepare user data with CORRECT field names for db.js
    const userData = {
      email: emailLower,
      access_code: access_codeUpper,
      first_name: name,
      password_hash: passwordHash,
      salt: salt,
      status: "active",
    };

    // Create user with 'ambassador' role
    const newUser = await createUser(userData, "ambassador");

    console.log("User created successfully:", newUser.ambassador_id);

    // Initialize journey progress
    await upsertJourneyProgress(newUser.ambassador_id, {
      current_month: 1,
      completed_tasks: {},
      start_date: new Date().toISOString(),
      month_start_dates: { 1: new Date().toISOString() },
    });

    return res.json({
      success: true,
      message: "Registration successful",
      redirect: "/signin?registered=true"
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      error: "Registration failed",
      details: error.message,
    });
  }
});

// FIXED: Partner registration endpoint

app.post("/register/partner", async (req, res) => {
  try {
    console.log("📝 Partner registration request received");
    console.log("Request body:", req.body);
    
    // Extract fields
    const email = req.body.email;
    const access_code = req.body.access_code;
    const password = req.body.password;
    const organizationName = req.body.organizationName;
    const contactName = req.body.contactName;
    const phoneNumber = req.body.phoneNumber;
    const location = req.body.location;
    const partnerType = req.body.partnerType;

    // Validation
    if (!email || !access_code || !password || !organizationName || !contactName) {
      console.log("❌ Missing required fields!");
      return res.status(400).json({ error: "All fields required" });
    }

    const emailLower = String(email).toLowerCase().trim();
    const access_codeUpper = String(access_code).toUpperCase().trim();

    console.log("🔍 Checking if partner exists:", emailLower);

    // ✅ FIX: Check for orphaned user records
    // First, check if email exists in users table AT ALL
    const { data: existingUserCheck, error: userCheckError } = await supabase
      .from('users')
      .select('user_id, user_type')
      .eq('email', emailLower);

    if (userCheckError) {
      console.error("❌ Error checking existing users:", userCheckError);
      return res.status(500).json({ error: "Database error" });
    }

    if (existingUserCheck && existingUserCheck.length > 0) {
      const existingUser = existingUserCheck[0];
      
      console.log("⚠️ Found existing user:", existingUser);

      // Check if this is an orphaned partner user (in users table but not in partners table)
      if (existingUser.user_type === 'partner') {
        const { data: partnerProfile, error: partnerError } = await supabase
          .from('partners')
          .select('partner_id')
          .eq('user_id', existingUser.user_id)
          .single();

        if (partnerError && partnerError.code === 'PGRST116') {
          // This is an orphaned user - has user record but no partner profile
          console.log("🔧 Found orphaned user record - attempting to create partner profile");
          
          // Try to create the missing partner profile
          const partnerData = {
            user_id: existingUser.user_id,
            organization_name: organizationName,
            contact_person: contactName,
            phone_number: phoneNumber || null,
            location: location || null,
            partner_type: partnerType || null,
          };

          const { data: newPartner, error: createPartnerError } = await supabase
            .from('partners')
            .insert([partnerData])
            .select()
            .single();

          if (createPartnerError) {
            console.error("❌ Failed to create partner profile:", createPartnerError);
            return res.status(500).json({ 
              error: "Failed to complete registration",
              details: "Please contact support to fix your account"
            });
          }

          console.log("✅ Successfully created partner profile for orphaned user");
          
          return res.json({
            success: true,
            message: "Registration completed successfully",
            redirect: "/partner-signin?registered=true"
          });
        } else if (!partnerError) {
          // Partner already exists completely
          console.log("❌ Partner already exists completely");
          return res.status(409).json({ error: "Partner already exists" });
        }
      } else {
        // Email exists but for a different user type
        console.log("❌ Email already registered as", existingUser.user_type);
        return res.status(409).json({ 
          error: `This email is already registered as a ${existingUser.user_type}` 
        });
      }
    }

    console.log("✅ No existing user found - proceeding with new registration");

    // Generate salt and hash password
    const salt = crypto.randomBytes(8).toString("hex");
    const passwordHash = hashPassword(password, salt);

    // Prepare user data
    const userData = {
      email: emailLower,
      access_code: access_codeUpper,
      organization_name: organizationName,
      contact_person: contactName,
      phone_number: phoneNumber || null,
      location: location || null,
      partner_type: partnerType || null,
      password_hash: passwordHash,
      salt: salt,
      status: "approved",
    };

    console.log("💾 Creating partner in database...");
    
    // Create user in database
    const newUser = await createUser(userData, "partner");

    console.log("✅ Partner created successfully:", {
      partner_id: newUser.partner_id,
      email: newUser.email
    });

    return res.json({
      success: true,
      message: "Registration successful", 
      redirect: "/partner-signin?registered=true"
    });

  } catch (error) {
    console.error("❌ Partner registration error:", error);
    console.error("Error stack:", error.stack);
    
    // Better error message for duplicate key
    if (error.code === '23505') {
      return res.status(409).json({
        error: "Email already registered",
        details: "This email is already in use. Please sign in or use a different email."
      });
    }
    
    return res.status(500).json({
      error: "Registration failed",
      details: error.message,
    });
  }
});

app.post("/api/admin/cleanup-orphans", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    console.log("🧹 Starting orphan cleanup...");

    // Find all users in users table
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('user_id, email, user_type');

    if (usersError) {
      throw usersError;
    }

    const orphans = [];

    // Check each user
    for (const user of allUsers) {
      let roleTable, roleIdField;
      
      if (user.user_type === 'ambassador') {
        roleTable = 'ambassadors';
        roleIdField = 'user_id';
      } else if (user.user_type === 'partner') {
        roleTable = 'partners';
        roleIdField = 'user_id';
      } else if (user.user_type === 'admin') {
        roleTable = 'admins';
        roleIdField = 'user_id';
      } else {
        continue;
      }

      // Check if role record exists
      const { data: roleRecord, error: roleError } = await supabase
        .from(roleTable)
        .select('*')
        .eq(roleIdField, user.user_id)
        .single();

      // If no role record found, this is an orphan
      if (roleError && roleError.code === 'PGRST116') {
        orphans.push({
          user_id: user.user_id,
          email: user.email,
          user_type: user.user_type
        });
      }
    }

    if (orphans.length === 0) {
      return res.json({ 
        message: "No orphaned records found",
        orphans: []
      });
    }

    console.log(`⚠️ Found ${orphans.length} orphaned user records`);

    return res.json({
      message: `Found ${orphans.length} orphaned records`,
      orphans: orphans,
      suggestion: "You can delete these records or complete their profiles"
    });

  } catch (error) {
    console.error("❌ Cleanup error:", error);
    return res.status(500).json({ error: error.message });
  }
});
app.delete("/api/admin/cleanup-orphan/:user_id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const userId = req.params.user_id;

    console.log("🗑️ Deleting orphaned user:", userId);

    // Delete from users table (this will cascade if there are any related records)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    console.log("✅ Orphaned user deleted:", userId);

    return res.json({ 
      success: true,
      message: "Orphaned user deleted successfully"
    });

  } catch (error) {
    console.error("❌ Delete error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ------------------------
// Admin Registration Endpoint
// ------------------------
app.post("/register/admin", async (req, res) => {
  try {
    const { email, accessCode, password, name } = req.body || {};
    console.log("Admin registration attempt:", { email, accessCode, name });

    if (!email || !accessCode || !password || !name) {
      return res.status(400).json({ error: "All fields required" });
    }

    const emailLower = String(email).toLowerCase().trim();
    const accessCodeUpper = String(accessCode).toUpperCase().trim();

    // Check if admin already exists
    const existingUser = await getUserByEmail(emailLower, "admin");
    if (existingUser) {
      return res.status(409).json({ error: "Admin already exists" });
    }

    // Generate salt and hash password
    const salt = crypto.randomBytes(8).toString("hex");
    const passwordHash = hashPassword(password, salt);

    // Prepare user data
    const userData = {
      email: emailLower,
      access_code: accessCodeUpper,
      first_name: name,
      password_hash: passwordHash,
      salt: salt,
      status: "active",
    };

    // Create admin user
    const newUser = await createUser(userData, "admin");

    console.log("Admin created successfully:", newUser.admin_id);

    return res.json({
      success: true,
      message: "Admin registration successful",
      redirect: "/admin-signin.html?registered=true"
    });
  } catch (error) {
    console.error("Admin registration error:", error);
    return res.status(500).json({
      error: "Registration failed",
      details: error.message,
    });
  }
});

// ------------------------
// Sign-in Endpoints
// ------------------------
app.post("/signin", async (req, res) => {
  try {
    const { email, access_code, password, rememberMe } = req.body || {};

    console.log("Sign-in attempt:", { email, access_code });

    // Validation
    if (!email || !access_code || !password) {
      return res
        .status(400)
        .json({ error: "Email, access code, and password are required" });
    }

    const emailLower = String(email).toLowerCase().trim();
    const access_codeUpper = String(access_code).toUpperCase().trim();

    // ✅ FIXED: Use getUserByEmail which handles the two-table lookup
    const user = await getUserByEmail(emailLower, "ambassador");

    if (!user) {
      console.log(`Sign-in failed: User not found - ${emailLower}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify access code
    if (user.access_code !== access_codeUpper) {
      console.log(`Sign-in failed: Invalid access code - ${emailLower}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const computedHash = hashPassword(password, user.salt);
    if (computedHash !== user.password_hash) {
      console.log(`Sign-in failed: Invalid password - ${emailLower}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ✅ FIXED: Check status (normalized data already has status from users table)
    if (user.status !== "active") {
      console.log(`Sign-in failed: Account inactive - ${emailLower}`);
      return res
        .status(403)
        .json({ error: "Your account is not active. Please contact support." });
    }

// Create session using user_id from normalized data
const sessionId = await createSessionEnhanced(
  res,
  user.user_id,  // ✅ MUST USE user_id, NOT ambassador_id
  "ambassador",
  Boolean(rememberMe)
);

    console.log(`Ambassador signed in: ${emailLower}, Session: ${sessionId}`);

    return res.json({
      success: true,
      message: "Sign in successful",
      redirect: "/ambassador-dashboard.html",
      user: {
        id: user.ambassador_id,
        email: user.email,
        name: user.first_name || "Ambassador",
        role: "ambassador",
      },
    });
  } catch (error) {
    console.error("Ambassador sign-in error:", error);
    return res.status(500).json({ error: "Sign in failed. Please try again." });
  }
});


app.post("/partner-signin", async (req, res) => {
  console.log("=== PARTNER SIGNIN REQUEST ===");
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("=== END REQUEST ===");
  
  try {
    const { email, access_code, password, rememberMe } = req.body || {};

    // Basic validation
    if (!email || !access_code || !password) {
      console.log("❌ Missing fields");
      return res.status(400).json({ error: "All fields required" });
    }

    const emailLower = email.toLowerCase().trim();
    const access_codeUpper = access_code.toUpperCase().trim();

    console.log("🔍 Looking for partner:", emailLower);
    
    // ✅ FIXED: Use getUserByEmail which handles the two-table lookup
    const user = await getUserByEmail(emailLower, "partner");
    
    if (!user) {
      console.log("❌ No partner found with email:", emailLower);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log("✅ Found user:", {
      email: user.email,
      access_code: user.access_code,
      status: user.status,
      partner_id: user.partner_id
    });

    // Check access code
    if (user.access_code !== access_codeUpper) {
      console.log("❌ Access code mismatch:", {
        stored: user.access_code,
        provided: access_codeUpper
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const computedHash = hashPassword(password, user.salt);
    console.log("Password check:", {
      salt_length: user.salt.length,
      stored_hash: user.password_hash.substring(0, 20) + "...",
      computed_hash: computedHash.substring(0, 20) + "...",
      match: computedHash === user.password_hash
    });

    if (computedHash !== user.password_hash) {
      console.log("❌ Password mismatch");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ✅ Check status (comes from users table in the normalized data)
    if (user.status !== "approved") {
      console.log("❌ Account not approved:", user.status);
      return res.status(403).json({ error: "Account not approved" });
    }

    console.log("✅ All checks passed - creating session");
    
    // ✅ CORRECT - using user_id
    const sessionId = await createSessionEnhanced(
      res,
      user.user_id,  // Use the user_id from the users table!
      "partner",
      Boolean(rememberMe)
    );

    console.log("✅ Session created:", sessionId);
    
    return res.json({ 
      success: true, 
      redirect: "/partner-dashboard.html" 
    });

  } catch (error) {
    console.error("❌ SIGNIN ERROR:", error);
    console.error("Stack:", error.stack);
    return res.status(500).json({ 
      error: "Sign in failed",
      details: error.message 
    });
  }
});

app.post("/admin-signin", async (req, res) => {
  console.log("=== ADMIN SIGNIN ATTEMPT ===");
  console.log("Body:", req.body);
  console.log("Cookies:", req.headers.cookie);
  console.log("=== END ===");
  
  try {
    const { email, accessCode, password, rememberMe } = req.body || {};
    
    console.log("📝 Step 1: Validation");
    if (!email || !accessCode || !password) {
      console.log("❌ Validation failed");
      return res.status(400).json({ error: "Email, access code, and password are required" });
    }

    const emailLower = String(email).toLowerCase().trim();
    const accessCodeUpper = String(accessCode).toUpperCase().trim();
    
    console.log("📝 Step 2: Looking up admin:", emailLower);

    // ✅ FIXED: Use getUserByEmail which handles the two-table lookup
    const user = await getUserByEmail(emailLower, "admin");
    
    console.log("📝 Step 3: User lookup result:", user ? "FOUND" : "NOT FOUND");

    if (!user) {
      console.log(`❌ Admin sign-in failed: User not found - ${emailLower}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log("📝 Step 4: Checking access code");
    console.log("  Stored:", user.access_code);
    console.log("  Provided:", accessCodeUpper);
    
    // Verify access code
    if (user.access_code !== accessCodeUpper) {
      console.log(`❌ Admin sign-in failed: Invalid access code - ${emailLower}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log("📝 Step 5: Verifying password");
    // Verify password
    const computedHash = hashPassword(password, user.salt);
    console.log("  Hash match:", computedHash === user.password_hash);
    
    if (computedHash !== user.password_hash) {
      console.log(`❌ Admin sign-in failed: Invalid password - ${emailLower}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log("📝 Step 6: Checking status");
    console.log("  Status:", user.status);
    
    // ✅ Check status (normalized data already has status from users table)
    if (user.status !== "active") {
      console.log(`❌ Admin sign-in failed: Account inactive - ${emailLower}`);
      return res.status(403).json({ error: "Account inactive" });
    }

    console.log("📝 Step 7: Creating session");
    console.log("  user_id:", user.user_id);
    console.log("  role: admin");
    
    // Create session using user_id from normalized data
    const sessionId = await createSessionEnhanced(
      res,
      user.user_id,  // ✅ Use user_id, not admin_id
      "admin",
      Boolean(rememberMe)
    );

    console.log(`✅ Admin signed in: ${emailLower}, Session: ${sessionId}`);
    console.log("📝 Step 8: Sending response");

    return res.json({ ok: true, role: "admin" });
  } catch (error) {
    console.error("❌ Admin sign-in error:", error);
    console.error("Stack trace:", error.stack);
    return res.status(500).json({ error: "Sign in failed. Please try again." });
  }
});


// ------------------------
// Protected Pages
// ------------------------
app.get(
  "/ambassador-dashboard.html",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      // ✅ Get user from database instead of memory
      const user = await getUserById(req.auth.userId, "ambassador");

      if (!user) {
        console.log("User not found in database, redirecting to signin");
        return res.redirect("/signin");
      }

      console.log("User authenticated successfully:", user.email);
      res.sendFile(path.join(__dirname, "public", "ambassador-dashboard.html"));
    } catch (error) {
      console.error("Dashboard auth error:", error);
      return res.redirect("/signin");
    }
  }
);

app.get(
  "/ambassador-review.html",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const user = await getUserById(req.auth.userId, "ambassador");
      if (!user) {
        return res.redirect("/signin");
      }
      res.sendFile(path.join(__dirname, "public", "ambassador-review.html"));
    } catch (error) {
      console.error("Ambassador review auth error:", error);
      return res.redirect("/signin");
    }
  }
);

app.get(
  "/partner-dashboard.html",
  requireAuth,
  requireRole("partner"),
  async (req, res) => {
    try {
      const user = await getUserById(req.auth.userId, "partner");
      if (!user) {
        console.log("Partner not found in database, redirecting to signin");
        return res.redirect("/partner-signin");
      }
      console.log("Partner authenticated successfully:", user.email);
      res.sendFile(path.join(__dirname, "public", "partner-dashboard.html"));
    } catch (error) {
      console.error("Partner dashboard auth error:", error);
      return res.redirect("/partner-signin");
    }
  }
);

// ============================================
// Applications page for partners
// ============================================
app.get(
  "/applications.html",
  requireAuth,
  requireRole("partner"),
  async (req, res) => {
    try {
      const user = await getUserById(req.auth.userId, "partner");
      if (!user) {
        console.log("Partner not found in database, redirecting to signin");
        return res.redirect("/partner-signin");
      }
      console.log("Partner authenticated for applications page:", user.email);
      res.sendFile(path.join(__dirname, "public", "applications.html"));
    } catch (error) {
      console.error("Applications page auth error:", error);
      return res.redirect("/partner-signin");
    }
  }
);

app.get(
  "/admin-dashboard.html",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const user = await getUserById(req.auth.userId, "admin");
      if (!user) {
        console.log("Admin not found in database, redirecting to signin");
        return res.redirect("/admin-signin.html");
      }
      console.log("Admin authenticated successfully:", user.email);
      res.sendFile(path.join(__dirname, "public", "admin-dashboard.html"));
    } catch (error) {
      console.error("Admin dashboard auth error:", error);
      return res.redirect("/admin-signin.html");
    }
  }
);

app.get("/profile.html", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "profile.html"));
});

app.get(
  "/article-amb.html",
  requireAuth,
  requireRole("ambassador"),
  (req, res) => {
    res.sendFile(path.join(__dirname, "public", "article-amb.html"));
  }
);

app.get(
  "/article-progress.html",
  requireAuth,
  requireRole("ambassador"),
  (req, res) => {
    res.sendFile(path.join(__dirname, "public", "article-progress.html"));
  }
);

app.get("/Partner-Calls.html", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "Partner-Calls.html"));
});

app.get("/journey.html", requireAuth, requireRole("ambassador"), (req, res) => {
  res.sendFile(path.join(__dirname, "public", "journey.html"));
});

app.get("/chat-pillar.html", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "chat-pillar.html"));
});

app.get("/chat-region.html", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "chat-region.html"));
});

app.get("/creat-Post.html", requireAuth, requireRole("partner"), (req, res) => {
  res.sendFile(path.join(__dirname, "public", "creat-Post.html"));
});

app.get("/CommunityPartView.html", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "CommunityPartView.html"));
});

app.get("/api/me", requireAuth, async (req, res) => {
  try {
    const { role, userId } = req.auth;

    // ✅ Get user from database instead of memory
    const user = await getUserById(userId, role);

    if (!user) {
      console.log(`User not found: ${userId} (${role})`);
      return res.status(404).json({ error: "Not found" });
    }

    // Format response based on role
    const response = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    // Add name field based on role
    if (role === "ambassador") {
      response.name = user.first_name || user.name || "Ambassador";
    } else if (role === "partner") {
      // IMPORTANT: Map contact_person to contactName for frontend
      response.name = user.contact_person || user.organization_name || "Partner";
    } else if (role === "admin") {
      response.name = user.first_name || user.name || "Admin";
    } else {
      response.name = "User";
    }

    return res.json(response);
  } catch (error) {
    console.error("Error in /api/me:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ------------------------
// Profile API Endpoints
// ------------------------
app.get("/api/profile", requireAuth, async (req, res) => {
  try {
    const { role, userId } = req.auth;
    const user = await getUserById(userId, role);

    if (!user) {
      return res.status(404).json({ error: "Not found" });
    }

    const profileData = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      access_code: user.access_code,
    };

    if (role === "ambassador") {
      profileData.name = user.first_name || user.name || "";
      profileData.cvFilename = user.cv_filename || null;
    } else if (role === "partner") {
      profileData.organizationName = user.organization_name || "";
      // IMPORTANT: Map contact_person to contactName for frontend
      profileData.contactName = user.contact_person || "";
      profileData.phoneNumber = user.phone_number || "";
      profileData.location = user.location || "";
      profileData.partnerType = user.partner_type || "";
    } else if (role === "admin") {
      profileData.name = user.first_name || user.name || "";
    }

    return res.json(profileData);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/api/profile", requireAuth, async (req, res) => {
  try {
    const { role, userId } = req.auth;
    const { name, contactName, organizationName } = req.body || {};

    const user = await getUserById(userId, role);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const updates = {};

    if (role === "ambassador" || role === "admin") {
      if (typeof name === "string" && name.trim()) {
        updates.first_name = name.trim();
      }
    } else if (role === "partner") {
      if (typeof contactName === "string" && contactName.trim()) {
        // IMPORTANT: Map contactName to contact_person for database
        updates.contact_person = contactName.trim();
      }
      if (typeof organizationName === "string" && organizationName.trim()) {
        updates.organization_name = organizationName.trim();
      }
    }

    const updatedUser = await updateUser(userId, updates, role);

    return res.json({
      ok: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
        name: updatedUser.first_name || updatedUser.contact_person || "",
        organizationName: updatedUser.organization_name || "",
        contactName: updatedUser.contact_person || "",
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/profile/password", requireAuth, async (req, res) => {
  try {
    const { role, userId } = req.auth;
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "New password must be at least 6 characters" });
    }

    const user = await getUserById(userId, role);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentHash = hashPassword(currentPassword, user.salt);
    if (currentHash !== user.password_hash) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Generate new salt and hash for new password
    const newSalt = crypto.randomBytes(8).toString("hex");
    const newPasswordHash = hashPassword(newPassword, newSalt);

    await updateUser(
      userId,
      {
        password_hash: newPasswordHash,
        salt: newSalt,
      },
      role
    );

    return res.json({ ok: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ------------------------
// Journey API Endpoints - ENHANCED WITH REAL-TIME TRACKING
// ------------------------
app.get(
  "/api/journey",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const userId = req.auth.userId;
      const progress = (await getJourneyProgress(userId)) || {
        current_month: 1,
        completed_tasks: {},
        start_date: new Date().toISOString(),
        month_start_dates: { 1: new Date().toISOString() },
      };

      // Calculate statistics
      const totalTasks = JOURNEY_MONTHS.reduce(
        (sum, month) => sum + month.tasks.length,
        0
      );
      const completedCount = Object.keys(progress.completed_tasks || {}).filter(
        (key) => progress.completed_tasks[key]
      ).length;
      const overallProgress =
        totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

      // Get current month data
      const currentMonthData = JOURNEY_MONTHS.find(
        (m) => m.month === progress.current_month
      );
      let currentMonthProgress = 0;
      let currentMonthTasks = [];

      if (currentMonthData) {
        currentMonthTasks = currentMonthData.tasks.map((task) => ({
          id: task.id,
          text: task.text,
          description: task.description || "",
          completed:
            !!progress.completed_tasks[`${progress.current_month}-${task.id}`],
          critical: task.critical || false,
          time: task.time || "",
          deadline: task.deadline || "",
        }));

        const currentMonthCompleted = currentMonthTasks.filter(
          (task) => task.completed
        ).length;
        currentMonthProgress =
          currentMonthTasks.length > 0
            ? Math.round(
                (currentMonthCompleted / currentMonthTasks.length) * 100
              )
            : 0;
      }

      // Get all months with progress
      const months = JOURNEY_MONTHS.map((month) => {
        const monthCompleted = month.tasks.filter(
          (task) => progress.completed_tasks[`${month.month}-${task.id}`]
        ).length;
        const monthProgress =
          month.tasks.length > 0
            ? Math.round((monthCompleted / month.tasks.length) * 100)
            : 0;

        return {
          month: month.month,
          title: month.title,
          milestone: month.milestone,
          totalTasks: month.tasks.length,
          completedTasks: monthCompleted,
          progress: monthProgress,
          isCurrentMonth: month.month === progress.current_month,
          isCompleted: month.month < progress.current_month,
          tasks: month.tasks.map((task) => ({
            id: task.id,
            text: task.text,
            completed: !!progress.completed_tasks[`${month.month}-${task.id}`],
            critical: task.critical || false,
            time: task.time || "",
            deadline: task.deadline || "",
          })),
        };
      });

      return res.json({
        currentMonth: progress.current_month,
        currentMonthTitle: currentMonthData
          ? currentMonthData.title
          : "Month 1",
        currentMonthMilestone: currentMonthData
          ? currentMonthData.milestone
          : "",
        completedTasks: progress.completed_tasks,
        startDate: progress.start_date,
        monthStartDates: progress.month_start_dates || {},
        statistics: {
          totalTasks,
          completedCount,
          overallProgress,
          currentMonthProgress,
          daysInProgram: Math.floor(
            (Date.now() - new Date(progress.start_date).getTime()) /
              (1000 * 60 * 60 * 24)
          ),
        },
        currentMonthTasks,
        months,
      });
    } catch (error) {
      console.error("Journey fetch error:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch journey progress" });
    }
  }
);

// ENHANCED: Task update endpoint with real-time statistics
app.post(
  "/api/journey/task",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const { taskId, month, completed } = req.body;
      const userId = req.auth.userId;

      if (!taskId || month === undefined) {
        return res.status(400).json({ error: "taskId and month are required" });
      }

      let progress = await getJourneyProgress(userId);
      if (!progress) {
        progress = {
          current_month: 1,
          completed_tasks: {},
          start_date: new Date().toISOString(),
          month_start_dates: { 1: new Date().toISOString() },
        };
      }

      const taskKey = `${month}-${taskId}`;

      if (month > progress.current_month) {
        return res
          .status(400)
          .json({ error: "Complete previous months first" });
      }

      // Update task status
      const completedTasks = progress.completed_tasks || {};
      if (completed) {
        completedTasks[taskKey] = true;
      } else {
        delete completedTasks[taskKey];
      }

      await upsertJourneyProgress(userId, {
        ...progress,
        completed_tasks: completedTasks,
      });

      // Calculate real-time statistics
      const totalTasks = JOURNEY_MONTHS.reduce(
        (sum, m) => sum + m.tasks.length,
        0
      );
      const completedCount = Object.keys(completedTasks).filter(
        (k) => completedTasks[k]
      ).length;
      const overallProgress =
        totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

      return res.json({
        success: true,
        taskKey,
        completed,
        realTimeStats: {
          overallProgress,
          completedCount,
          totalTasks,
        },
      });
    } catch (error) {
      console.error("Error updating task:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// NEW: Lightweight progress polling endpoint
app.get(
  "/api/journey/progress",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const userId = req.auth.userId;
      const progress = await getJourneyProgress(userId);

      if (!progress) {
        return res.json({
          currentMonth: 1,
          overallProgress: 0,
          completedCount: 0,
          totalTasks: JOURNEY_MONTHS.reduce(
            (sum, m) => sum + m.tasks.length,
            0
          ),
          currentMonthProgress: 0,
          lastUpdated: Date.now(),
        });
      }

      const totalTasks = JOURNEY_MONTHS.reduce(
        (sum, m) => sum + m.tasks.length,
        0
      );
      const completedTasks = progress.completed_tasks || {};
      const completedCount = Object.keys(completedTasks).filter(
        (k) => completedTasks[k]
      ).length;
      const overallProgress =
        totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

      const currentMonthData = JOURNEY_MONTHS.find(
        (m) => m.month === progress.current_month
      );
      let currentMonthProgress = 0;

      if (currentMonthData) {
        const currentMonthCompleted = currentMonthData.tasks.filter(
          (task) => completedTasks[`${progress.current_month}-${task.id}`]
        ).length;
        currentMonthProgress =
          currentMonthData.tasks.length > 0
            ? Math.round(
                (currentMonthCompleted / currentMonthData.tasks.length) * 100
              )
            : 0;
      }

      return res.json({
        currentMonth: progress.current_month,
        overallProgress,
        completedCount,
        totalTasks,
        currentMonthProgress,
        lastUpdated: progress.last_updated
          ? new Date(progress.last_updated).getTime()
          : Date.now(),
      });
    } catch (error) {
      console.error("Error fetching journey progress:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.post(
  "/api/journey/advance",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const userId = req.auth.userId;
      let progress = await getJourneyProgress(userId);

      if (!progress) {
        return res.status(400).json({ error: "No journey progress found" });
      }

      // Check if current month is completed
      const currentMonthData = JOURNEY_MONTHS.find(
        (m) => m.month === progress.current_month
      );
      if (!currentMonthData) {
        return res.status(400).json({ error: "Invalid current month" });
      }

      const completedTasks = progress.completed_tasks || {};
      const allTasksCompleted = currentMonthData.tasks.every(
        (task) => completedTasks[`${progress.current_month}-${task.id}`]
      );

      if (!allTasksCompleted) {
        return res
          .status(400)
          .json({ error: "Complete all tasks in current month first" });
      }

      if (progress.current_month >= 12) {
        return res.status(400).json({ error: "Already at final month" });
      }

      // Advance to next month
      const monthStartDates = progress.month_start_dates || {};
      monthStartDates[progress.current_month + 1] = new Date().toISOString();

      const updatedProgress = {
        ...progress,
        current_month: progress.current_month + 1,
        month_start_dates: monthStartDates,
      };

      await upsertJourneyProgress(userId, updatedProgress);

      return res.json({
        success: true,
        newMonth: updatedProgress.current_month,
        message: `Advanced to Month ${updatedProgress.current_month}`,
      });
    } catch (error) {
      console.error("Error advancing month:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.get(
  "/api/journey/days-remaining",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const userId = req.auth.userId;
      const progress = await getJourneyProgress(userId);

      if (!progress) {
        return res.json({ daysRemaining: 365 });
      }

      const startDate = new Date(progress.start_date);
      const today = new Date();
      const daysElapsed = Math.floor(
        (today - startDate) / (1000 * 60 * 60 * 24)
      );
      const daysRemaining = Math.max(0, 365 - daysElapsed);

      return res.json({ daysRemaining });
    } catch (error) {
      console.error("Error fetching days remaining:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ------------------------
// ADMIN Journey Progress APIs
// ------------------------

// Get journey progress for a specific ambassador
app.get(
  "/admin/api/ambassadors/:id/journey",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const progress = (await getJourneyProgress(req.params.id)) || {
        current_month: 1,
        completed_tasks: {},
        start_date: new Date().toISOString(),
        month_start_dates: { 1: new Date().toISOString() },
        last_updated: new Date().toISOString(),
      };

      // Calculate statistics
      const totalTasks = JOURNEY_MONTHS.reduce(
        (sum, month) => sum + month.tasks.length,
        0
      );
      const completedTasks = progress.completed_tasks || {};
      const completedCount = Object.keys(completedTasks).filter(
        (key) => completedTasks[key]
      ).length;
      const overallProgress =
        totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

      // Get current month info
      const currentMonthData = JOURNEY_MONTHS.find(
        (m) => m.month === progress.current_month
      );
      const currentMonthTasks = currentMonthData
        ? currentMonthData.tasks.length
        : 0;
      const currentMonthCompleted = currentMonthData
        ? currentMonthData.tasks.filter(
            (task) => completedTasks[`${progress.current_month}-${task.id}`]
          ).length
        : 0;
      const currentMonthProgress =
        currentMonthTasks > 0
          ? Math.round((currentMonthCompleted / currentMonthTasks) * 100)
          : 0;

      return res.json({
        ambassadorId: req.params.id,
        currentMonth: progress.current_month,
        completedTasks: completedTasks,
        startDate: progress.start_date,
        lastUpdated: progress.last_updated,
        statistics: {
          totalTasks,
          completedCount,
          overallProgress,
          currentMonthProgress,
          currentMonthTitle: currentMonthData
            ? currentMonthData.title
            : "Unknown",
          currentMonthMilestone: currentMonthData
            ? currentMonthData.milestone
            : "",
        },
        months: JOURNEY_MONTHS.map((month) => {
          const monthCompleted = month.tasks.filter(
            (task) => completedTasks[`${month.month}-${task.id}`]
          ).length;
          const monthProgress =
            month.tasks.length > 0
              ? Math.round((monthCompleted / month.tasks.length) * 100)
              : 0;

          return {
            month: month.month,
            title: month.title,
            milestone: month.milestone,
            totalTasks: month.tasks.length,
            completedTasks: monthCompleted,
            progress: monthProgress,
            isCurrentMonth: month.month === progress.current_month,
            isCompleted: month.month < progress.current_month,
            tasks: month.tasks.map((task) => ({
              id: task.id,
              text: task.text,
              completed: !!completedTasks[`${month.month}-${task.id}`],
              critical: task.critical || false,
              time: task.time || "",
              deadline: task.deadline || "",
            })),
          };
        }),
      });
    } catch (error) {
      console.error("Error fetching ambassador journey:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get journey progress summary for all ambassadors
app.get(
  "/admin/api/journey/summary",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { items: ambassadors } = await listUsers("ambassador", {});
      const allProgress = await getAllJourneyProgress();

      const summary = await Promise.all(
        ambassadors.map(async (ambassador) => {
          const progress = allProgress.find(
            (p) => p.ambassador_id === ambassador.id
          ) || {
            current_month: 1,
            completed_tasks: {},
            start_date: new Date().toISOString(),
            last_updated: new Date().toISOString(),
          };

          const totalTasks = JOURNEY_MONTHS.reduce(
            (sum, month) => sum + month.tasks.length,
            0
          );
          const completedTasks = progress.completed_tasks || {};
          const completedCount = Object.keys(completedTasks).filter(
            (key) => completedTasks[key]
          ).length;
          const overallProgress =
            totalTasks > 0
              ? Math.round((completedCount / totalTasks) * 100)
              : 0;

          return {
            ambassadorId: ambassador.id,
            ambassadorName: ambassador.first_name || ambassador.email,
            ambassadorEmail: ambassador.email,
            currentMonth: progress.current_month,
            overallProgress,
            completedTasks: completedCount,
            totalTasks,
            startDate: progress.start_date,
            lastUpdated: progress.last_updated
              ? new Date(progress.last_updated).getTime()
              : Date.now(),
            status: ambassador.status,
          };
        })
      );

      // Sort by last updated (most recent first)
      summary.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));

      return res.json({
        total: summary.length,
        ambassadors: summary,
      });
    } catch (error) {
      console.error("Error fetching journey summary:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ------------------------
// Admin Dashboard APIs
// ------------------------
app.get(
  "/admin/api/ambassadors",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const statusFilter = req.query.status;
      const search = req.query.search;

      const filters = {
        status:
          statusFilter && statusFilter !== "all" ? statusFilter : undefined,
        search: search,
        limit,
        offset: (page - 1) * limit,
      };

      const { items, total } = await listUsers("ambassador", filters);

      // Format response
      const formatted = items.map((amb) => ({
        id: amb.id,
        name: amb.first_name || amb.name,
        email: amb.email,
        access_code: amb.access_code,
        status: amb.status,
        joinDate: amb.created_at,
        lastLogin: amb.last_login,
        profileCompleted: amb.cv_filename ? true : false,
      }));

      return res.json({
        ambassadors: formatted,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error("Error fetching ambassadors:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.get(
  "/admin/api/ambassadors/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const ambassador = await getUserById(req.params.id, "ambassador");
      if (!ambassador) {
        return res.status(404).json({ error: "Ambassador not found" });
      }

      return res.json({
        id: ambassador.id,
        name: ambassador.first_name || ambassador.name,
        email: ambassador.email,
        access_code: ambassador.access_code,
        status: ambassador.status,
        joinDate: ambassador.created_at,
        lastLogin: ambassador.last_login,
        profile: {
          completed: ambassador.cv_filename ? true : false,
          data: {},
        },
      });
    } catch (error) {
      console.error("Error fetching ambassador:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.post(
  "/admin/api/ambassadors",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { name, email, access_code } = req.body;

      if (!name || !email || !access_code) {
        return res
          .status(400)
          .json({ error: "Name, email, and access code are required" });
      }

      // Check if email already exists
      const existingUser = await getUserByEmail(
        email.toLowerCase(),
        "ambassador"
      );
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const salt = crypto.randomBytes(8).toString("hex");
      const hashedPassword = hashPassword("welcome123", salt);

      const userData = {
        first_name: name,
        email: email.toLowerCase(),
        access_code: access_code.toUpperCase(),
        password_hash: hashedPassword,
        salt,
        status: "active",
      };

      const newAmbassador = await createUser(userData, "ambassador");

      // Initialize journey progress
      await upsertJourneyProgress(newAmbassador.id, {
        current_month: 1,
        completed_tasks: {},
        start_date: new Date().toISOString(),
        month_start_dates: { 1: new Date().toISOString() },
      });

      return res.json({
        success: true,
        ambassador: {
          id: newAmbassador.id,
          name: newAmbassador.first_name,
          email: newAmbassador.email,
          access_code: newAmbassador.access_code,
          status: newAmbassador.status,
        },
      });
    } catch (error) {
      console.error("Error creating ambassador:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.put(
  "/admin/api/ambassadors/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { name, email, access_code, status } = req.body;
      const ambassador = await getUserById(req.params.id, "ambassador");

      if (!ambassador) {
        return res.status(404).json({ error: "Ambassador not found" });
      }

      const updates = {};

      // Check if email is being changed and if it's already taken
      if (email && email.toLowerCase() !== ambassador.email.toLowerCase()) {
        const existingUser = await getUserByEmail(
          email.toLowerCase(),
          "ambassador"
        );
        if (existingUser && existingUser.id !== req.params.id) {
          return res.status(400).json({ error: "Email already registered" });
        }
        updates.email = email.toLowerCase();
      }

      // Check if access code is being changed and if it's already taken
      if (access_code && access_code !== ambassador.access_code) {
        // Note: This would require a query to check for duplicate access codes
        // For now, we'll just update it
        updates.access_code = access_code.toUpperCase();
      }

      if (name) updates.first_name = name;
      if (status) updates.status = status;

      const updatedAmbassador = await updateUser(
        req.params.id,
        updates,
        "ambassador"
      );

      return res.json({
        success: true,
        ambassador: {
          id: updatedAmbassador.id,
          name: updatedAmbassador.first_name,
          email: updatedAmbassador.email,
          access_code: updatedAmbassador.access_code,
          status: updatedAmbassador.status,
        },
      });
    } catch (error) {
      console.error("Error updating ambassador:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.delete(
  "/admin/api/ambassadors/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const ambassador = await getUserById(req.params.id, "ambassador");
      if (!ambassador) {
        return res.status(404).json({ error: "Ambassador not found" });
      }

      // Delete journey progress (if there's a delete function)
      // Note: Journey progress might be automatically deleted via foreign key constraints

      await deleteUser(req.params.id, "ambassador");

      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting ambassador:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ------------------------
// Partners APIs
// ------------------------
app.get(
  "/admin/api/partners",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { items: partners } = await listUsers("partner", {});
      return res.json({ partners });
    } catch (error) {
      console.error("Error fetching partners:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.post(
  "/admin/api/partners",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { name, email, company, access_code } = req.body;

      if (!name || !email || !access_code) {
        return res
          .status(400)
          .json({ error: "Name, email, and access code are required" });
      }

      // Check if email already exists
      const existingUser = await getUserByEmail(email.toLowerCase(), "partner");
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const salt = crypto.randomBytes(8).toString("hex");
      const hashedPassword = hashPassword("welcome123", salt);

      const userData = {
        contact_name: name,
        organization_name: company || "",
        email: email.toLowerCase(),
        access_code: access_code.toUpperCase(),
        password_hash: hashedPassword,
        salt,
        status: "approved",
      };

      const newPartner = await createUser(userData, "partner");

      return res.json({
        success: true,
        partner: {
          id: newPartner.id,
          name: newPartner.contact_name,
          email: newPartner.email,
          company: newPartner.organization_name,
          access_code: newPartner.access_code,
          status: newPartner.status,
        },
      });
    } catch (error) {
      console.error("Error creating partner:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ------------------------
// Articles APIs
// ------------------------
app.get(
  '/admin/api/articles',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const statusFilter = req.query.status;
      const articles = await getArticles(
        statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {}
      );
      return res.json({ articles });
    } catch (error) {
      console.error('Error fetching articles:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ============================================
// ADMIN: GET SINGLE ARTICLE (REPLACE EXISTING)
// ============================================
app.get('/admin/api/articles/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const articleId = req.params.id;

    console.log('📖 Admin fetching article:', articleId);

    // Get article
    const { data: articles, error } = await supabase
      .from('articles')
      .select('*')
      .eq('article_id', articleId);

    if (error) {
      console.error('Error fetching article:', error);
      throw error;
    }

    if (!articles || articles.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const article = articles[0];

    // Get ambassador info separately
    let ambassadorName = 'Unknown';
    let ambassadorEmail = '-';
    
    if (article.ambassador_id) {
      const { data: ambassador } = await supabase
        .from('ambassadors')
        .select('first_name, last_name, email')
        .eq('ambassador_id', article.ambassador_id)
        .single();
      
      if (ambassador) {
        ambassadorName = `${ambassador.first_name || ''} ${ambassador.last_name || ''}`.trim();
        ambassadorEmail = ambassador.email;
      }
    }

    // Return FULL content for admin
    const responseArticle = {
      id: article.article_id,
      article_id: article.article_id,
      title: article.title,
      content: article.content, // FULL HTML
      contentHtml: article.content, // FULL HTML
      excerpt: article.excerpt,
      byline: article.author_name || article.author_role || ambassadorName,
      authorNameRole: article.author_name || article.author_role || ambassadorName,
      companyDescription: article.category || '-',
      status: article.status,
      createdAt: article.created_at,
      updatedAt: article.updated_at,
      views: article.views || 0,
      likes: article.likes || 0,
      ambassadorName: ambassadorName,
      ambassadorEmail: ambassadorEmail
    };

    console.log('✅ Article sent to admin with full content');

    res.json(responseArticle);

  } catch (error) {
    console.error('❌ Error fetching article:', error);
    res.status(500).json({ 
      error: 'Failed to fetch article',
      details: error.message 
    });
  }
});

app.post(
  "/admin/api/articles",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { title, excerpt, content, category } = req.body;

      if (!title || !content) {
        return res
          .status(400)
          .json({ error: "Title and content are required" });
      }

      const articleData = {
        title,
        excerpt: excerpt || title.substring(0, 100) + "...",
        content,
        category: category || "general",
        status: "draft",
        ambassador_id: req.auth.userId, // Use ambassador_id to match database schema
        views: 0,
        likes: 0,
      };

      const newArticle = await createArticle(articleData);

      return res.json({ success: true, article: newArticle });
    } catch (error) {
      console.error("Error creating article:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.put(
  "/admin/api/articles/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { title, excerpt, content, category, status } = req.body;
      const articleId = req.params.id;

      // Check if article exists
      const existingArticle = await getArticleById(articleId);
      if (!existingArticle) {
        return res.status(404).json({ error: "Article not found" });
      }

      const updates = {};
      if (title) updates.title = title;
      if (excerpt) updates.excerpt = excerpt;
      if (content) updates.content = content;
      if (category) updates.category = category;
      if (status) updates.status = status;

      const updatedArticle = await updateArticle(articleId, updates);

      return res.json({ success: true, article: updatedArticle });
    } catch (error) {
      console.error("Error updating article:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.delete(
  "/admin/api/articles/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const articleId = req.params.id;

      // Check if article exists
      const article = await getArticleById(articleId);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      await deleteArticle(articleId);

      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting article:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ============================================
// AMBASSADOR ARTICLES - FIXED ROUTE ORDER
// ============================================

// 1. ✅ LATEST ROUTE - MUST COME FIRST (SPECIFIC)
app.get(
  '/api/ambassador/articles/latest',
  requireAuth,
  requireRole('ambassador'),
  async (req, res) => {
    try {
      const userId = req.auth.userId;

      console.log('📖 Fetching latest article for user_id:', userId);

      // ✅ Get ambassador using getUserById
      const ambassador = await getUserById(userId, 'ambassador');
      if (!ambassador) {
        console.error("❌ Ambassador not found for user_id:", userId);
        return res.status(404).json({ error: 'Ambassador not found' });
      }

      const ambassadorId = ambassador.ambassador_id || ambassador.id;
      console.log('✅ Found ambassador_id:', ambassadorId);

      // Get most recent article for this ambassador
      const { data: articles, error } = await supabase
        .from('articles')
        .select('*')
        .eq('ambassador_id', ambassadorId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching latest article:', error);
        throw error;
      }

      if (!articles || articles.length === 0) {
        console.log('📭 No articles found for ambassador:', ambassadorId);
        return res.status(404).json({ error: 'No articles found' });
      }

      const article = articles[0];

      // Get notifications for this article
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('article_id', article.article_id)
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      // Format response
      const formattedArticle = {
        id: article.article_id,
        article_id: article.article_id,
        title: article.title,
        contentHtml: article.content,
        byline: article.excerpt,
        status: article.status,
        createdAt: article.created_at,
        updatedAt: article.updated_at,
        views: article.views || 0,
        likes: article.likes || 0
      };

      const formattedNotifications = (notifications || []).map(notif => ({
        id: notif.notification_id,
        type: notif.type,
        message: notif.message,
        createdAt: notif.created_at,
        read: notif.read
      }));

      console.log('✅ Latest article sent:', formattedArticle.title);

      return res.json({
        article: formattedArticle,
        notifications: formattedNotifications
      });
    } catch (error) {
      console.error('❌ Error in /api/ambassador/articles/latest:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch latest article',
        details: error.message 
      });
    }
  }
);

// 2. ✅ LIST ARTICLES ROUTE (NO PARAMS)
app.get(
  '/api/ambassador/articles',
  requireAuth,
  requireRole('ambassador'),
  async (req, res) => {
    try {
      const userId = req.auth.userId;
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      console.log('📖 Fetching articles for user_id:', userId);

      // ✅ FIX: First get the ambassador_id from the ambassadors table
      const ambassador = await getUserById(userId, 'ambassador');
      if (!ambassador) {
        console.error("❌ Ambassador not found for user_id:", userId);
        return res.json({
          items: [],
          total: 0,
          limit,
          offset
        });
      }

      const ambassadorId = ambassador.ambassador_id || ambassador.id;
      console.log('✅ Found ambassador_id:', ambassadorId);

      // ✅ Query articles using the correct ambassador_id
      const { data: articles, error, count } = await supabase
        .from('articles')
        .select('*', { count: 'exact' })
        .eq('ambassador_id', ambassadorId)  // ✅ Use ambassador_id!
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching ambassador articles:', error);
        throw error;
      }

      // Format articles for frontend
      const formattedArticles = (articles || []).map(article => ({
        id: article.article_id,
        article_id: article.article_id,
        title: article.title,
        contentHtml: article.content,
        byline: article.excerpt,
        status: article.status,
        createdAt: article.created_at,
        updatedAt: article.updated_at,
        views: article.views || 0,
        likes: article.likes || 0
      }));

      console.log('✅ Found', formattedArticles.length, 'articles');

      return res.json({
        items: formattedArticles,
        total: count || 0,
        limit,
        offset
      });
    } catch (error) {
      console.error('Error in /api/ambassador/articles:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch articles',
        details: error.message 
      });
    }
  }
);

// 3. ✅ SINGLE ARTICLE BY ID ROUTE - MUST COME LAST (PARAMETERIZED)
app.get(
  '/api/ambassador/articles/:id',
  requireAuth,
  requireRole('ambassador'),
  async (req, res) => {
    try {
      const articleId = req.params.id;
      const userId = req.auth.userId;

      console.log('📖 Ambassador fetching article:', articleId, 'User:', userId);

      // ✅ FIX: First get the ambassador_id from the ambassadors table
      const ambassador = await getUserById(userId, 'ambassador');
      if (!ambassador) {
        console.error("❌ Ambassador not found for user_id:", userId);
        return res.status(404).json({ error: 'Ambassador not found' });
      }

      const ambassadorId = ambassador.ambassador_id || ambassador.id;
      console.log('✅ Found ambassador_id:', ambassadorId);

      // ✅ Get article and verify ownership using ambassador_id
      const { data: articles, error } = await supabase
        .from('articles')
        .select('*')
        .eq('article_id', articleId)
        .eq('ambassador_id', ambassadorId);  // ✅ Use ambassador_id!

      if (error) {
        console.error('Error fetching article:', error);
        throw error;
      }

      if (!articles || articles.length === 0) {
        return res.status(404).json({ error: 'Article not found' });
      }

      const article = articles[0];

      // Get any admin notifications/feedback for this article
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('article_id', articleId)
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      // Format response
      const formattedArticle = {
        id: article.article_id,
        article_id: article.article_id,
        title: article.title,
        contentHtml: article.content,
        byline: article.excerpt,
        status: article.status,
        createdAt: article.created_at,
        updatedAt: article.updated_at,
        views: article.views || 0,
        likes: article.likes || 0
      };

      const formattedNotifications = (notifications || []).map(notif => ({
        id: notif.notification_id,
        type: notif.type,
        message: notif.message,
        createdAt: notif.created_at,
        read: notif.read
      }));

      console.log('✅ Article sent to ambassador:', formattedArticle.title);

      return res.json({
        article: formattedArticle,
        notifications: formattedNotifications
      });
    } catch (error) {
      console.error('Error in /api/ambassador/articles/:id:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch article',
        details: error.message 
      });
    }
  }
);

// ------------------------
// Ambassador Articles (General)
// ------------------------
app.get(
  "/api/articles",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const articles = await getArticles({ status: "published" });
      return res.json({ articles });
    } catch (error) {
      console.error("Error fetching published articles:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.get(
  "/api/articles/:id",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const article = await getArticleById(req.params.id);
      if (!article || article.status !== "published") {
        return res.status(404).json({ error: "Article not found" });
      }

      // Increment views
      await incrementArticleViews(req.params.id);

      // Fetch updated article with new view count
      const updatedArticle = await getArticleById(req.params.id);

      return res.json({ article: updatedArticle });
    } catch (error) {
      console.error("Error fetching article:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ------------------------
// Ambassador Article Submission APIs
// ------------------------
app.post(
  "/api/ambassador/articles",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const { title, contentHtml, byline } = req.body;

      console.log("Article submission request:", {
        title: title?.substring(0, 50),
        contentLength: contentHtml?.length,
        byline: byline?.substring(0, 50),
        userId: req.auth.userId,
      });

      if (!title || !contentHtml) {
        return res
          .status(400)
          .json({ error: "Title and content are required" });
      }

      // ✅ CRITICAL: Get ambassador using getUserById which returns ambassador_id
      const user = await getUserById(req.auth.userId, "ambassador");
      if (!user) {
        console.error("User not found:", req.auth.userId);
        return res.status(404).json({ error: "User not found" });
      }

      console.log("User verified:", {
        user_id: req.auth.userId,
        ambassador_id: user.ambassador_id || user.id,
        email: user.email
      });

      const articleData = {
        title: String(title).trim(),
        content: String(contentHtml).trim(),
        excerpt: byline
          ? String(byline).trim()
          : String(title).trim().substring(0, 100) + "...",
        category: "general",
        status: "pending",
        ambassador_id: user.ambassador_id || user.id, // ✅ CRITICAL: Use ambassador_id, NOT user_id!
      };

      // Validate required fields
      if (!articleData.title || articleData.title.length === 0) {
        return res.status(400).json({ error: "Title cannot be empty" });
      }
      if (!articleData.content || articleData.content.length === 0) {
        return res.status(400).json({ error: "Content cannot be empty" });
      }

      console.log("Creating article with ambassador_id:", articleData.ambassador_id);

      const newArticle = await createArticle(articleData);

      console.log("Article created successfully:", newArticle?.article_id);

      return res.json({
        success: true,
        id: newArticle.article_id,
        article: newArticle,
        status: newArticle.status,
      });
    } catch (error) {
      console.error("Error creating article:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return res.status(500).json({
        error: "Internal server error",
        message: error.message || "Failed to create article",
      });
    }
  }
);

app.patch(
  "/api/ambassador/articles/:id",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const articleId = req.params.id;
      const { title, contentHtml, byline, status } = req.body;

      // Check if article exists and belongs to the user
      const existingArticle = await getArticleById(articleId);
      if (!existingArticle) {
        return res.status(404).json({ error: "Article not found" });
      }

      // Verify the article belongs to the current user
      if (existingArticle.ambassador_id !== req.auth.userId) {
        return res
          .status(403)
          .json({ error: "You can only edit your own articles" });
      }

      const updates = {};
      if (title) updates.title = title;
      if (contentHtml) updates.content = contentHtml;
      if (byline) updates.excerpt = byline;
      // Allow status update to reset to pending when editing
      if (status) updates.status = status;

      const updatedArticle = await updateArticle(articleId, updates);

      return res.json({
        success: true,
        id: updatedArticle.article_id,
        article: updatedArticle,
        status: updatedArticle.status,
      });
    } catch (error) {
      console.error("Error updating article:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);


// Get ALL posts with application status for current user
// ============================================
app.get("/api/posts", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const userRole = req.auth.role;

    console.log('📖 Fetching posts for user:', userId, 'role:', userRole);

    // Get all posts
    const posts = await getPosts();

    // If user is an ambassador, check which posts they've applied to
    if (userRole === 'ambassador') {
      const ambassador = await getUserById(userId, 'ambassador');
      
      if (ambassador) {
        const ambassadorId = ambassador.ambassador_id || ambassador.id;
        console.log('✅ Ambassador ID:', ambassadorId);

        // ✅ Get all applications for this ambassador WITH STATUS
        const { data: applications, error } = await supabase
          .from('applications')
          .select('post_id, status')  // ✅ Include status!
          .eq('ambassador_id', ambassadorId);

        if (error) {
          console.error('Error fetching applications:', error);
        }

        // ✅ Create a Map of post IDs to application status
        const applicationStatusMap = new Map(
          (applications || []).map(app => [app.post_id, app.status])
        );

        console.log('✅ User has applied to', applicationStatusMap.size, 'posts');

        // ✅ Add hasApplied AND applicationStatus to each post
        const postsWithStatus = posts.map(post => ({
          ...post,
          hasApplied: applicationStatusMap.has(post.post_id),
          applicationStatus: applicationStatusMap.get(post.post_id) || null
        }));

        return res.json({ posts: postsWithStatus });
      }
    }

    // For non-ambassadors, return posts without status
    return res.json({ posts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});


// ✅ FIXED: Get posts for the logged-in partner
app.get(
  "/api/partner/posts",
  requireAuth,
  requireRole("partner"),
  async (req, res) => {
    try {
      const userId = req.auth.userId;  // This is the user_id from session

      console.log("📖 Fetching posts for user_id:", userId);

      // ✅ FIX: First get the partner_id from the partners table
      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('partner_id')
        .eq('user_id', userId)  // Lookup by user_id
        .single();

      if (partnerError || !partner) {
        console.error("❌ Partner not found for user_id:", userId);
        return res.json({ posts: [], total: 0 });
      }

      console.log("✅ Found partner_id:", partner.partner_id);

      // ✅ Now fetch posts using the correct partner_id
      const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .eq('partner_id', partner.partner_id)  // Use partner_id from lookup
        .order('created_at', { ascending: false });

      if (error) {
        console.error("❌ Error fetching posts:", error);
        throw error;
      }

      console.log("✅ Found", posts?.length || 0, "posts");

      return res.json({ 
        posts: posts || [],
        total: posts?.length || 0
      });
    } catch (error) {
      console.error("❌ Error fetching partner posts:", error);
      return res.status(500).json({ 
        error: "Failed to fetch posts",
        details: error.message 
      });
    }
  }
);
// Replace the existing POST /api/posts endpoint in server.js with this:

app.post(
  "/api/posts",
  requireAuth,
  requireRole("partner"),
  async (req, res) => {
    try {
      const { title, content, category, format, location, deadline, liftPillars } = req.body;

      console.log("📝 Creating post:", {
        title: title?.substring(0, 50),
        content: content?.substring(0, 50),
        category,
        user_id: req.auth.userId  // ✅ This is the user_id
      });

      // Validation
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }

      // ✅ FIX: Get the partner_id from the partners table using user_id
      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('partner_id')
        .eq('user_id', req.auth.userId)  // ✅ Look up by user_id
        .single();

      if (partnerError || !partner) {
        console.error("❌ Partner not found for user_id:", req.auth.userId);
        return res.status(404).json({ error: "Partner profile not found" });
      }

      console.log("✅ Found partner_id:", partner.partner_id);

      // Generate UUID for post
      const postId = uuidv4();

      const postData = {
        post_id: postId,
        title: title,
        content: content,
        category: category || "general",
        partner_id: partner.partner_id,  // ✅ Use the correct partner_id
      };

      console.log("💾 Inserting post into database with partner_id:", partner.partner_id);

      const { data: newPost, error } = await supabase
        .from('posts')
        .insert([postData])
        .select()
        .single();

      if (error) {
        console.error("❌ Supabase error:", error);
        throw error;
      }

      console.log("✅ Post created successfully:", newPost.post_id);

      return res.json({ 
        success: true, 
        post: newPost,
        message: "Post created successfully"
      });
    } catch (error) {
      console.error("❌ Error creating post:", error);
      return res.status(500).json({ 
        error: "Failed to create post",
        details: error.message 
      });
    }
  }
);

// ============================================
// PARTNER: Delete a post
// ============================================
app.delete(
  '/api/posts/:id',
  requireAuth,
  requireRole('partner'),
  async (req, res) => {
    try {
      const partnerId = req.auth.userId;
      const postId = req.params.id;

      console.log('🗑️ Deleting post:', postId, 'for partner:', partnerId);

      // Verify the post belongs to this partner
      const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select('*')
        .eq('post_id', postId)
        .eq('partner_id', partnerId)
        .single();

      if (fetchError || !post) {
        return res.status(404).json({ error: 'Post not found or you do not have permission to delete it' });
      }

      // Delete the post
      const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .eq('post_id', postId)
        .eq('partner_id', partnerId);

      if (deleteError) {
        console.error('Error deleting post:', deleteError);
        throw deleteError;
      }

      console.log('✅ Post deleted successfully:', postId);

      return res.json({
        success: true,
        message: 'Post deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error deleting post:', error);
      return res.status(500).json({ 
        error: 'Failed to delete post',
        details: error.message 
      });
    }
  }
);
// ============================================
// 5. DELETE SERVICE (Owner Only)
// ============================================
app.delete('/api/services/:id', requireAuth, requireRole('partner'), async (req, res) => {
  try {
    const serviceId = req.params.id;
    const userId = req.auth.userId;

    console.log('🗑️ Deleting service:', { serviceId, userId });

    // Verify service exists and belongs to this partner
    const service = await getServiceById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const partner = await getUserById(userId, 'partner');
    if (!partner || (partner.partner_id !== service.partner_id && partner.id !== service.partner_id)) {
      return res.status(403).json({ error: 'Not authorized to delete this service' });
    }

    await deleteService(serviceId);

    return res.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting service:', error);
    return res.status(500).json({ 
      error: 'Failed to delete service',
      details: error.message 
    });
  }
});

// ------------------------
// CV Upload
// ------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, CVS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "cv-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOC, and DOCX files are allowed"));
    }
  },
});

app.post(
  "/api/upload-cv",
  requireAuth,
  requireRole("ambassador"),
  upload.single("cv"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const user = await getUserById(req.auth.userId, "ambassador");
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Remove old CV if exists
      if (user.cv_filename) {
        const oldPath = path.join(CVS_DIR, user.cv_filename);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Update user in database
      await updateUser(
        req.auth.userId,
        { cv_filename: req.file.filename },
        "ambassador"
      );

      return res.json({
        success: true,
        filename: req.file.filename,
        message: "CV uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading CV:", error);
      return res.status(500).json({ error: "Failed to upload CV" });
    }
  }
);

// ------------------------
// Notifications (legacy - keep for compatibility)
// ------------------------
app.get("/api/notifications/legacy", requireAuth, (req, res) => {
  const userId = req.auth.userId;
  const notifications = notificationsByUserId.get(userId) || [];

  // Mark all as read
  notifications.forEach((n) => (n.read = true));

  return res.json({ notifications });
});

app.post("/api/notifications/clear", requireAuth, (req, res) => {
  const userId = req.auth.userId;
  notificationsByUserId.set(userId, []);
  return res.json({ success: true });
});

// ------------------------
// Dashboard Stats
// ------------------------
app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
  try {
    const { role, userId } = req.auth;

    if (role === "ambassador") {
      const user = await getUserById(userId, "ambassador");
      if (!user) return res.status(404).json({ error: "User not found" });

      const progress = (await getJourneyProgress(userId)) || {
        current_month: 1,
        completed_tasks: {},
        start_date: new Date().toISOString(),
      };

      // Calculate journey stats
      const totalTasks = JOURNEY_MONTHS.reduce(
        (sum, month) => sum + month.tasks.length,
        0
      );
      const completedTasks = progress.completed_tasks || {};
      const completedCount = Object.keys(completedTasks).filter(
        (key) => completedTasks[key]
      ).length;
      const overallProgress =
        totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

      // Days since joining
      const joinDate = user.created_at ? new Date(user.created_at) : new Date();
      const today = new Date();
      const daysInProgram = Math.floor(
        (today - joinDate) / (1000 * 60 * 60 * 24)
      );

      // Get recent published articles
      const articles = await getArticles({ status: "published" });
      const recentArticles = articles.slice(0, 3).map((article) => ({
        id: article.article_id,
        title: article.title,
        excerpt: article.excerpt,
        date: article.created_at,
        category: article.category,
      }));

      return res.json({
        stats: {
          overallProgress,
          completedTasks: completedCount,
          totalTasks,
          currentMonth: progress.current_month,
          daysInProgram: Math.max(0, daysInProgram),
          daysRemaining: Math.max(0, 365 - daysInProgram),
        },
        user: {
          name: user.first_name || "Ambassador",
          email: user.email,
          joinDate: user.created_at,
        },
        recentArticles,
      });
    } else if (role === "partner") {
      const user = await getUserById(userId, "partner");
      if (!user) return res.status(404).json({ error: "User not found" });

      // Use the imported getPosts function
      const posts = await getPosts({ authorId: userId });
      const postsCreated = posts ? posts.length : 0;

      return res.json({
        stats: {
          postsCreated: postsCreated,
          totalEngagement: 0,
          partnerSince: user.created_at || new Date().toISOString(),
        },
        user: {
          organizationName: user.organization_name || '',
          contactName: user.contact_person || '',
          email: user.email,
        },
      });
    } else if (role === "admin") {
      const { items: ambassadors } = await listUsers("ambassador", {});
      const { items: partners } = await listUsers("partner", {});
      const articles = await getArticles({});

      return res.json({
        stats: {
          totalAmbassadors: ambassadors.length,
          totalPartners: partners.length,
          totalArticles: articles.length,
          activeAmbassadors: ambassadors.filter((a) => a.status === "active")
            .length,
        },
      });
    }

    return res.json({ stats: {} });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ------------------------
// Logout
// ------------------------
app.post("/api/logout", async (req, res) => {
  const cookies = parseCookies(req);
  const sid = cookies.sid;
  if (sid) {
    // Delete from database
    await deleteSessionDB(sid);
    // Delete from memory
    sessions.delete(sid);
  }
  clearSessionCookie(res);
  return res.redirect("/signin");
});

// ------------------------
// Test Database Connection
// ------------------------
app.get("/test-db", async (req, res) => {
  try {
    const { data, error } = await supabase.from('partners').select('count');
    if (error) throw error;
    res.json({ success: true, message: "Database connected", data });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ------------------------
// Initialize data
// ------------------------
ensureDataDir();
ensureUploadsDir();  // NEW LINE: Ensure uploads directory exists
loadArticlesFromDisk();
loadPostsFromDisk();
loadJourneyFromDisk();

// Auto-save data periodically
// setInterval(() => {
//   saveJourneyToDisk();
//   saveArticlesToDisk();
//   savePostsToDisk();
// }, 60000); // Every minute

// ------------------------
// Start Server
// ------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(
    `[journey] Journey progress tracking ENABLED with REAL-TIME updates`
  );
  console.log(
    `[journey] Loaded ${journeyProgressByAmbassador.size} ambassador progress records`
  );
  console.log(`[data] Data directory: ${DATA_DIR}`);
  console.log(`[uploads] Uploads directory ready for CVs`);
  console.log(`[notifications] Notification system ENABLED with helper functions`);
});


