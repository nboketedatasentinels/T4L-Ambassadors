require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const multer = require("multer");
const JOURNEY_MONTHS = require("./journey-db.js");
const app = express();
const { v4: uuidv4 } = require("uuid");

// ========== EMAIL SERVICE (NODEMAILER) ==========
const nodemailer = require("nodemailer");

// Gmail SMTP Configuration (from environment variables)
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || "", // Gmail App Password
  },
};

const SMTP_FROM = process.env.SMTP_FROM || process.env.EMAIL_USER || "";
const isDev = process.env.NODE_ENV !== "production";
const _consoleLog = console.log.bind(console);
const log = (...args) => { if (isDev) _consoleLog(...args); };

class EmailService {
  constructor() {
    // Initialize Nodemailer with hardcoded Gmail credentials
    this.nodemailerTransporter = null;
    this.etherealAccount = null;

    // Check if Ethereal should be used for testing
    if (process.env.USE_ETHEREAL === "true") {
      log("🔄 Ethereal mode enabled - will initialize on startup");
      // Ethereal will be initialized asynchronously after EmailService is created
    } else {
      // Use Gmail SMTP (hardcoded credentials)
      try {
        // Remove spaces from password if present (Gmail shows them with spaces)
        const smtpPass = SMTP_CONFIG.auth.pass.replace(/\s+/g, "");

        this.nodemailerTransporter = nodemailer.createTransport({
          host: SMTP_CONFIG.host,
          port: SMTP_CONFIG.port,
          secure: SMTP_CONFIG.secure,
          auth: {
            user: SMTP_CONFIG.auth.user,
            pass: smtpPass,
          },
        });

        // Verify connection
        this.nodemailerTransporter.verify((error, success) => {
          if (error) {
            console.error(
              "❌ SMTP connection verification failed:",
              error.message
            );
            console.error("   Please check:");
            console.error(
              "   1. App password is correct (16 characters, no spaces)"
            );
            console.error("   2. 2-Step Verification is enabled on Gmail");
            console.error("   3. App password hasn't been revoked");
          } else {
            log("✅ Nodemailer email service initialized (Gmail SMTP)");
            log(`   Connected to: ${SMTP_CONFIG.host}:${SMTP_CONFIG.port}`);
            log(`   From: ${SMTP_CONFIG.auth.user}`);
          }
        });
      } catch (error) {
        console.error("❌ Nodemailer init failed:", error.message);
        this.nodemailerTransporter = null;
      }
    }
  }

  // Initialize Ethereal for testing
  async initializeEthereal() {
    try {
      log("🔄 Creating Ethereal test account...");
      this.etherealAccount = await nodemailer.createTestAccount();

      this.nodemailerTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: this.etherealAccount.user,
          pass: this.etherealAccount.pass,
        },
      });

      log("✅ Ethereal email service initialized");
      log("📧 Test account created:", this.etherealAccount.user);
    } catch (error) {
      console.error("❌ Ethereal init failed:", error.message);
      this.nodemailerTransporter = null;
      this.etherealAccount = null;
    }
  }

  // Send ambassador welcome email using Nodemailer
  async sendAmbassadorWelcome(ambassadorData) {
    if (!this.nodemailerTransporter) {
      log("⚠️  Nodemailer not available - skipping email");
      return { success: false, error: "Email service not configured" };
    }

    try {
      const mailOptions = {
        from: this.etherealAccount?.user || SMTP_FROM,
        to: ambassadorData.email,
        subject: `🎉 Welcome ${ambassadorData.name} to T4LA Ambassador Program!`,
        html: this.createAmbassadorEmailBody(ambassadorData),
      };

      const info = await this.nodemailerTransporter.sendMail(mailOptions);

      // If using Ethereal, get the preview URL
      if (this.etherealAccount) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        log("✅ Ambassador email sent via Ethereal to", ambassadorData.email);
        return {
          success: true,
          method: "ethereal",
          messageId: info.messageId,
          previewUrl: previewUrl,
          etherealAccount: {
            user: this.etherealAccount.user,
            pass: this.etherealAccount.pass,
          },
        };
      } else {
        log("✅ Ambassador email sent via Nodemailer to", ambassadorData.email);
        return {
          success: true,
          method: "nodemailer",
          messageId: info.messageId,
        };
      }
    } catch (error) {
      console.error(`❌ Nodemailer failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Send partner welcome email using Nodemailer
  async sendPartnerWelcome(partnerData) {
    if (!this.nodemailerTransporter) {
      log("⚠️  Nodemailer not available - skipping email");
      return { success: false, error: "Email service not configured" };
    }

    try {
      const mailOptions = {
        from: this.etherealAccount?.user || SMTP_FROM,
        to: partnerData.email,
        subject: `🤝 Welcome ${partnerData.name} to T4LA Partner Network!`,
        html: this.createPartnerEmailBody(partnerData),
      };

      const info = await this.nodemailerTransporter.sendMail(mailOptions);

      // If using Ethereal, get the preview URL
      if (this.etherealAccount) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        log("✅ Partner email sent via Ethereal to", partnerData.email);
        return {
          success: true,
          method: "ethereal",
          messageId: info.messageId,
          previewUrl: previewUrl,
          etherealAccount: {
            user: this.etherealAccount.user,
            pass: this.etherealAccount.pass,
          },
        };
      } else {
        log("✅ Partner email sent via Nodemailer to", partnerData.email);
        return {
          success: true,
          method: "nodemailer",
          messageId: info.messageId,
        };
      }
    } catch (error) {
      console.error(`❌ Nodemailer failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // HTML email templates
  createAmbassadorEmailBody(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; }
          .header { background: linear-gradient(135deg, #4b0d7f 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9fafb; }
          .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed; }
          .code { font-size: 18px; font-weight: bold; color: #7c3aed; background: #f3e8ff; padding: 8px 12px; border-radius: 4px; }
          .button { display: inline-block; padding: 12px 30px; background: #4b0d7f; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Welcome to T4LA!</h1>
          <p>Your Ambassador Account is Ready</p>
        </div>
        
        <div class="content">
          <h2>Hello ${data.name},</h2>
          <p>Your ambassador account has been created successfully!</p>
          
          <div class="credentials">
            <h3>Your Login Credentials:</h3>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Access Code:</strong> <span class="code">${
              data.access_code
            }</span></p>
            <p><strong>Password:</strong> <span class="code">${
              data.password || "welcome123"
            }</span></p>
            <p><em>Please change your password after first login</em></p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${
              process.env.APP_URL || "http://localhost:3000"
            }/signin" class="button">
              Sign In Now →
            </a>
          </div>
          
          <p>If you have any questions, reply to this email.</p>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} T4LA Platform. All rights reserved.</p>
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </body>
      </html>
    `;
  }

  createPartnerEmailBody(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; }
          .header { background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9fafb; }
          .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4F46E5; }
          .code { font-size: 18px; font-weight: bold; color: #4F46E5; background: #e0e7ff; padding: 8px 12px; border-radius: 4px; }
          .button { display: inline-block; padding: 12px 30px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Welcome to T4LA Partner Network!</h1>
          ${data.company ? `<p>Welcome from ${data.company}</p>` : ""}
        </div>
        
        <div class="content">
          <h2>Hello ${data.name},</h2>
          <p>Your partner account has been created successfully!</p>
          
          <div class="credentials">
            <h3>Your Partner Login:</h3>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Partner Access Code:</strong> <span class="code">${
              data.access_code
            }</span></p>
            <p><strong>Password:</strong> <span class="code">${
              data.password || "welcome123"
            }</span></p>
            <p><em>Please change your password after first login</em></p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${
              process.env.APP_URL || "http://localhost:3000"
            }/partner-signin" class="button">
              Access Partner Dashboard →
            </a>
          </div>
          
          <p>If you need assistance, reply to this email.</p>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} T4LA Platform. All rights reserved.</p>
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </body>
      </html>
    `;
  }
}

// Initialize the email service
const emailService = new EmailService();

// Initialize Ethereal if requested (async initialization)
if (process.env.USE_ETHEREAL === "true") {
  emailService.initializeEthereal().catch((error) => {
    console.error("Failed to initialize Ethereal:", error);
  });
}

// ========== TEST ENDPOINT ==========
app.get("/api/test-email", async (req, res) => {
  try {
    const testData = {
      name: "Test Ambassador",
      email: process.env.EMAIL_USER || "test@example.com",
      access_code: "TEST123",
    };

    const result = await emailService.sendAmbassadorWelcome(testData);

    res.json({
      success: true,
      message: "Test email sent via Nodemailer",
      result: result,
      note:
        result.method === "ethereal"
          ? `Check preview URL: ${result.previewUrl}`
          : "Check the recipient's email inbox",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      note: "Make sure Gmail SMTP credentials are configured in server.js",
    });
  }
});

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
  createLinkedInAudit,
  getLinkedInAuditByAmbassadorId,
  updateLinkedInAudit,
  deleteLinkedInAudit,
  getLinkedInAudits,
  // Notification function (from db.js)
  createNotification
} = require("./models/db.js");

// ------------------------
// Basic Middleware
// ------------------------
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Disable cache and optional request logging (dev only to avoid log spam in production)
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  if (process.env.NODE_ENV !== "production") {
    log(`${req.method} ${req.url}`);
  }
  next();
});

// ------------------------
// About Me gate BEFORE static assets
// ------------------------
app.get("/about-me.html", requireAuth, requireRole("ambassador"), async (req, res) => {
  try {
    const userId = req.auth.userId;

    // Check if professional profile is already complete
    const { data: ambassador, error } = await supabase
      .from("ambassadors")
      .select("professional_headline, professional_summary, data_sharing_consent")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error checking profile:", error);
      return res.sendFile(path.join(__dirname, "public", "about-me.html"));
    }

    // If profile is already complete (headline + summary + consent), redirect to dashboard
    if (
      ambassador?.professional_headline &&
      ambassador?.professional_summary &&
      ambassador?.data_sharing_consent
    ) {
      log("✅ Profile already complete, redirecting to dashboard");
      return res.redirect("/ambassador-dashboard.html");
    }

    // Profile not complete, serve the about-me page
    res.sendFile(path.join(__dirname, "public", "about-me.html"));
  } catch (error) {
    console.error("Error serving about-me page:", error);
    return res.redirect("/signin");
  }
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
const mediaLibrary = []; // User media library storage

// ------------------------
// File-based persistence
// ------------------------
const DATA_DIR = path.join(__dirname, "data");
const ARTICLES_FILE = path.join(DATA_DIR, "articles.json");
const POSTS_FILE = path.join(DATA_DIR, "posts.json");
const JOURNEY_FILE = path.join(DATA_DIR, "journey.json");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const CVS_DIR = path.join(UPLOADS_DIR, "cvs");
const CERTS_DIR = path.join(UPLOADS_DIR, "certificates");

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(CVS_DIR)) {
      fs.mkdirSync(CVS_DIR, { recursive: true });
    }
    if (!fs.existsSync(CERTS_DIR)) {
      fs.mkdirSync(CERTS_DIR, { recursive: true });
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
      log(
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
      log(`[posts] Loaded ${postsById.size} post(s) from disk`);
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
    log(`[posts] Saved ${all.length} post(s) to disk`);
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
      log(
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
    const uploadsDir = path.join(__dirname, "uploads", "cvs");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      log(`[uploads] Created directory: ${uploadsDir}`);
    }
  } catch (err) {
    console.warn(
      "[uploads] Failed to ensure uploads directory:",
      err?.message || err
    );
  }
}

// ============================================
// APPLICATIONS API ENDPOINTS
// ============================================

// Multer configuration for CV uploads
const cvStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, "uploads", "cvs");
    // Ensure directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "cv-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// Multer configuration for support screenshots (images only)
const supportStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const supportDir = path.join(__dirname, "uploads", "support");
    if (!fs.existsSync(supportDir)) {
      fs.mkdirSync(supportDir, { recursive: true });
    }
    cb(null, supportDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      "support-" + uniqueSuffix + path.extname(file.originalname || ".png")
    );
  },
});

const supportUpload = multer({
  storage: supportStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(
        Object.assign(new multer.MulterError("LIMIT_FILE_TYPE"), {
          message: "Only image screenshots are allowed",
        })
      );
    }
    cb(null, true);
  },
});

const cvUpload = multer({
  storage: cvStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|txt/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOC, DOCX, and TXT files are allowed"));
    }
  },
});

// POST: Submit an application
// ============================================
// FIXED APPLICATION SUBMISSION ENDPOINT
// Replace the existing /api/applications/submit endpoint with this
// ============================================

app.post(
  "/api/applications/submit",
  requireAuth,
  // Wrap upload middleware in error handling
  (req, res, next) => {
    cvUpload.single("cv")(req, res, (err) => {
      if (err) {
        console.error("❌ File upload middleware error:", err.message);

        // Multer-specific errors
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            error: "File too large",
            details: "Maximum file size is 10MB",
          });
        }

        if (
          err.code === "LIMIT_FILE_TYPE" ||
          err.code === "LIMIT_UNEXPECTED_FILE"
        ) {
          return res.status(400).json({
            success: false,
            error: "Invalid file type",
            details: "Only PDF, DOC, DOCX, and TXT files are allowed",
          });
        }

        // Disk storage errors
        if (err.code === "ENOENT" || err.code === "EACCES") {
          console.error("❌ Storage error:", err?.message || err);
          return res.status(500).json({
            success: false,
            error: "Server storage error",
            details: "Unable to save file. Please try again later.",
          });
        }

        // Other multer errors
        return res.status(400).json({
          success: false,
          error: "File upload failed",
          details: err.message,
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { postId, postTitle, subscribeToNewsletter, termsAccepted } =
        req.body;
      const userId = req.auth.userId;
      const userRole = req.auth.role;

      // Validation
      if (!postId) {
        return res.status(400).json({
          success: false,
          error: "Post ID is required",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "CV file is required",
        });
      }

      if (termsAccepted !== "true" && termsAccepted !== true) {
        return res.status(400).json({
          success: false,
          error: "Terms must be accepted",
        });
      }

      if (userRole !== "ambassador") {
        return res.status(403).json({
          success: false,
          error: "Only ambassadors can submit applications",
        });
      }

      const { data: ambassador, error: ambassadorError } = await supabase
        .from("ambassadors")
        .select("ambassador_id, first_name, last_name, email, user_id")
        .eq("user_id", userId)
        .single();

      if (ambassadorError) {
        console.error("❌ Application submit DB error:", ambassadorError.message);
        return res.status(500).json({
          success: false,
          error: "Database error",
          details: ambassadorError.message,
        });
      }

      if (!ambassador) {
        return res.status(404).json({
          success: false,
          error: "Ambassador profile not found",
        });
      }

      const { data: post, error: postError } = await supabase
        .from("posts")
        .select("post_id, title, partner_id")
        .eq("post_id", postId)
        .single();

      if (postError || !post) {
        return res.status(404).json({
          success: false,
          error: "Opportunity not found",
        });
      }

      const { data: existingApp } = await supabase
        .from("applications")
        .select("application_id")
        .eq("post_id", postId)
        .eq("ambassador_id", ambassador.ambassador_id)
        .single();

      if (existingApp) {
        return res.status(400).json({
          success: false,
          error: "You have already applied to this opportunity",
        });
      }

      const applicationId = uuidv4();

      const applicationData = {
        application_id: applicationId,
        post_id: postId,
        ambassador_id: ambassador.ambassador_id,
        partner_id: post.partner_id,
        cv_filename: req.file.filename,
        status: "pending",
        applied_at: new Date().toISOString(),
        subscribe_to_newsletter:
          subscribeToNewsletter === "true" || subscribeToNewsletter === true,
        terms_accepted: true,
      };

      const { data: savedApp, error: dbError } = await supabase
        .from("applications")
        .insert([applicationData])
        .select()
        .single();

      if (dbError) {
        console.error("❌ Application submit DB error:", dbError.message);
        try {
          if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          log("Failed to delete orphaned file:", cleanupError.message);
        }

        return res.status(500).json({
          success: false,
          error: "Failed to save application",
          details: dbError.message,
        });
      }

      try {
        await createNotification(
          userId,
          "ambassador",
          "application_submitted",
          "✅ Application Submitted",
          `Your application for "${
            postTitle || post.title
          }" has been received.`,
          `/Partner-Calls.html`,
          applicationId
        );
      } catch (notifError) {
        log("Notification failed:", notifError.message);
      }

      // Do not notify admins about ambassador partner-opportunity applications
      // (Partners are notified below and manage applications on their own.)

      // Notify the partner who posted the opportunity
      try {
        if (post.partner_id) {
          const partnerUserId = await getPartnerUserIdFromPartnerId(post.partner_id);
          
          if (partnerUserId) {
            const ambassadorName = `${ambassador.first_name || ""} ${
              ambassador.last_name || ""
            }`.trim() || "An ambassador";
            await createNotification(
              partnerUserId,
              "partner",
              "application_received",
              "🎯 New Application Received",
              `${ambassadorName} has applied to your opportunity "${postTitle || post.title}"`,
              `/application-details.html?id=${applicationId}`,
              applicationId
            );
          }
        }
      } catch (partnerNotifError) {
        log("Failed to notify partner:", partnerNotifError.message);
      }

      return res.json({
        success: true,
        applicationId: savedApp.application_id,
        message: "Application submitted successfully!",
      });
    } catch (error) {
      console.error("❌ Application submit error:", error.message);
      try {
        if (req.file && req.file.path) fs.unlinkSync(req.file.path);
      } catch (cleanupError) {}
      return res.status(500).json({
        success: false,
        error: "Failed to submit application",
        details: isDev ? error.message : "Internal server error",
      });
    }
  }
);

// ============================================
// QUICK APPLY - One-click application using stored profile data
// ============================================
app.post(
  "/api/applications/quick-apply",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    log("\n🚀 ========== QUICK APPLY START ==========");

    try {
      const { postId } = req.body;
      const userId = req.auth.userId;

      log("📋 Auth info:", { userId, role: req.auth.role });

      // Validation
      if (!postId) {
        return res.status(400).json({
          success: false,
          error: "Post ID is required",
        });
      }

      // Get ambassador profile with all relevant data
      log("🔍 Looking up ambassador profile for user_id:", userId);
      let { data: ambassador, error: ambassadorError } = await supabase
        .from("ambassadors")
        .select("ambassador_id, first_name, last_name, email, user_id, professional_headline, professional_summary, cv_filename")
        .eq("user_id", userId)
        .single();

      // If not found by user_id, try alternative lookup methods
      if (ambassadorError || !ambassador) {
        log("⚠️ Ambassador not found by user_id, trying alternative lookups...");
        log("   Supabase error:", ambassadorError);
        
        // FALLBACK 1: Try looking up ambassador directly by ambassador_id 
        // (in case session has old ambassador_id instead of user_id)
        log("🔍 Trying ambassador_id lookup (legacy):", userId);
        const { data: ambById, error: ambIdError } = await supabase
          .from("ambassadors")
          .select("ambassador_id, first_name, last_name, email, user_id, professional_headline, professional_summary, cv_filename")
          .eq("ambassador_id", userId)
          .single();

        if (ambById && !ambIdError) {
          ambassador = ambById;
          log("✅ Found ambassador by ambassador_id (legacy session):", ambassador.first_name);
        } else {
          log("   ambassador_id lookup failed:", ambIdError);
        }
        
        // FALLBACK 2: Try via users table email lookup
        if (!ambassador) {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("email, access_code")
            .eq("user_id", userId)
            .single();

          log("📋 User data from users table:", userData);
          log("   User lookup error:", userError);

          if (userData && userData.email) {
            // Try to find ambassador by email
            log("📧 Trying email lookup:", userData.email);
            
            const { data: ambByEmail, error: emailError } = await supabase
              .from("ambassadors")
              .select("ambassador_id, first_name, last_name, email, user_id, professional_headline, professional_summary, cv_filename")
              .eq("email", userData.email)
              .single();

            if (ambByEmail && !emailError) {
              ambassador = ambByEmail;
              log("✅ Found ambassador by email:", ambassador.first_name);
              
              // Update the ambassador record with the correct user_id for future lookups
              if (!ambByEmail.user_id || ambByEmail.user_id !== userId) {
                await supabase
                  .from("ambassadors")
                  .update({ user_id: userId })
                  .eq("ambassador_id", ambByEmail.ambassador_id);
                log("🔧 Updated ambassador with user_id");
              }
            } else {
              log("   Email lookup failed:", emailError);
              
              // Try case-insensitive email lookup
              log("🔍 Trying case-insensitive email lookup...");
              
              const { data: ambByIlikeEmail, error: ilikeError } = await supabase
                .from("ambassadors")
                .select("ambassador_id, first_name, last_name, email, user_id, professional_headline, professional_summary, cv_filename")
                .ilike("email", userData.email)
                .single();

              if (ambByIlikeEmail && !ilikeError) {
                ambassador = ambByIlikeEmail;
                log("✅ Found ambassador by case-insensitive email:", ambassador.first_name);
                
                // Update the ambassador record with the correct user_id
                if (!ambByIlikeEmail.user_id || ambByIlikeEmail.user_id !== userId) {
                  await supabase
                    .from("ambassadors")
                    .update({ user_id: userId })
                    .eq("ambassador_id", ambByIlikeEmail.ambassador_id);
                  log("🔧 Updated ambassador with user_id");
                }
              } else {
                log("   Case-insensitive email lookup failed:", ilikeError);
              }
            }
          }
        }
      }

      if (!ambassador) {
        console.error("❌ Ambassador not found by any method");
        console.error("   user_id searched:", userId);
        
        // Log debugging info
        const { data: allAmbs } = await supabase
          .from("ambassadors")
          .select("ambassador_id, email, user_id, first_name")
          .limit(5);
        log("   Sample ambassadors in DB:", allAmbs);
        
        // Log the user info
        const { data: userInfo } = await supabase
          .from("users")
          .select("user_id, email, user_type")
          .eq("user_id", userId)
          .single();
        log("   User info from session:", userInfo);
        
        return res.status(404).json({
          success: false,
          error: "Ambassador profile not found",
          details: "Your account may not be properly linked. Try logging out and signing in again, or contact support."
        });
      }

      log("✅ Ambassador found:", ambassador.first_name, ambassador.last_name);

      // Check if ambassador has completed their about-me profile
      if (!ambassador.professional_headline || !ambassador.professional_summary) {
        log("❌ Ambassador has not completed about-me profile");
        return res.status(400).json({
          success: false,
          error: "Please complete your professional profile first",
          details: "Go to your About Me page to add your professional headline and summary.",
          redirect: "/about-me.html"
        });
      }

      log("✅ About-me profile is complete");

      // Check if post exists and get partner info
      log("🔍 Verifying post...");
      const { data: post, error: postError } = await supabase
        .from("posts")
        .select("post_id, title, partner_id")
        .eq("post_id", postId)
        .single();

      if (postError || !post) {
        console.error("❌ Post not found:", postError);
        return res.status(404).json({
          success: false,
          error: "Opportunity not found",
        });
      }

      log("✅ Post found:", post.title);

      // Check for existing application
      log("🔍 Checking for duplicate application...");
      const { data: existingApp } = await supabase
        .from("applications")
        .select("application_id")
        .eq("post_id", postId)
        .eq("ambassador_id", ambassador.ambassador_id)
        .single();

      if (existingApp) {
        log("⚠️ Already applied to this opportunity");
        return res.status(400).json({
          success: false,
          error: "You have already applied to this opportunity",
        });
      }

      // Try to get a CV filename - either from ambassador profile or from previous application
      let cvFilename = ambassador.cv_filename;
      
      if (!cvFilename) {
        // Check if they have a previous application with a CV
        log("🔍 Looking for existing CV from previous applications...");
        const { data: prevApp } = await supabase
          .from("applications")
          .select("cv_filename")
          .eq("ambassador_id", ambassador.ambassador_id)
          .not("cv_filename", "is", null)
          .order("applied_at", { ascending: false })
          .limit(1)
          .single();
        
        if (prevApp && prevApp.cv_filename) {
          cvFilename = prevApp.cv_filename;
          log("✅ Found CV from previous application:", cvFilename);
        }
      }

      // Create application
      log("💾 Creating application...");
      const applicationId = uuidv4();

      const applicationData = {
        application_id: applicationId,
        post_id: postId,
        ambassador_id: ambassador.ambassador_id,
        partner_id: post.partner_id,
        cv_filename: cvFilename || null,
        status: "pending",
        applied_at: new Date().toISOString(),
        subscribe_to_newsletter: false,
        terms_accepted: true,
        // Professional info is fetched from ambassadors table when viewing the application
      };

      log("📋 Application data prepared");

      const { data: savedApp, error: dbError } = await supabase
        .from("applications")
        .insert([applicationData])
        .select()
        .single();

      if (dbError) {
        console.error("❌ Database error:", dbError);
        return res.status(500).json({
          success: false,
          error: "Failed to save application",
          details: dbError.message,
        });
      }

      log("✅ Application saved:", savedApp.application_id);

      // Create notification for ambassador
      try {
        await createNotification(
          userId,
          "ambassador",
          "application_submitted",
          "✅ Application Submitted",
          `Your application for "${post.title}" has been sent with your profile info.`,
          `/Partner-Calls.html`,
          applicationId
        );
        log("✅ Ambassador notification sent");
      } catch (notifError) {
        console.error("⚠️ Notification failed:", notifError.message);
      }

      // Notify admins
      // Do not notify admins about ambassador partner-opportunity applications.

      // Notify the partner who posted the opportunity
      try {
        if (post.partner_id) {
          const partnerUserId = await getPartnerUserIdFromPartnerId(post.partner_id);
          
          if (partnerUserId) {
            const ambassadorName = `${ambassador.first_name || ""} ${ambassador.last_name || ""}`.trim() || "An ambassador";
            await createNotification(
              partnerUserId,
              "partner",
              "application_received",
              "🎯 New Application Received",
              `${ambassadorName} has applied to your opportunity "${post.title}"`,
              `/application-details.html?id=${applicationId}`,
              applicationId
            );
            log("✅ Partner notification sent");
          } else {
            log("⚠️ Partner user_id not found for partner_id:", post.partner_id);
          }
        }
      } catch (partnerNotifError) {
        console.error("⚠️ Failed to notify partner:", partnerNotifError.message);
      }

      log("\n🎉 ========== QUICK APPLY SUCCESS ==========\n");

      return res.json({
        success: true,
        applicationId: savedApp.application_id,
        message: "Application submitted successfully! Your profile has been shared with the partner.",
        ambassadorProfile: {
          name: `${ambassador.first_name} ${ambassador.last_name}`,
          headline: ambassador.professional_headline,
          hasCV: !!cvFilename
        }
      });

    } catch (error) {
      console.error("\n❌ ========== QUICK APPLY ERROR ==========");
      console.error("Error:", error.message);
      console.error("Stack:", error.stack);

      return res.status(500).json({
        success: false,
        error: "Failed to submit application",
        details: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
      });
    }
  }
);

// ============================================
// 3. CREATE SERVICE (T4L Partners Only)
// ============================================
app.post(
  "/api/services",
  requireAuth,
  requireRole("partner"),
  async (req, res) => {
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
        pricing_type, // ✅ NEW
        price, // ✅ NEW
        currency, // ✅ NEW
        price_note, // ✅ NEW
      } = req.body;

      log("📝 Creating service for partner user_id:", userId);

      // Validation
      if (!title || !type || !description) {
        return res.status(400).json({
          error: "Title, type, and description are required",
        });
      }

      // ✅ Validate pricing_type if provided
      if (!pricing_type) {
        return res.status(400).json({
          error: "Pricing type is required",
        });
      }

      // Get partner info
      const partner = await getUserById(userId, "partner");
      if (!partner) {
        return res.status(404).json({ error: "Partner not found" });
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
        status: status || "active", // ✅ FIXED: Defaults to 'active'
        pricing_type: pricing_type,
        price: price ? parseFloat(price) : null,
        currency: currency || "USD",
        price_note: price_note || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      log("💾 Saving service with pricing for partner_id:", partnerId);

      const service = await createService(serviceData);

      log("✅ Service created:", service.service_id);

      return res.json({
        success: true,
        service,
        message: "Service created successfully",
      });
    } catch (error) {
      console.error("❌ Error creating service:", error);
      return res.status(500).json({
        error: "Failed to create service",
        details: error.message,
      });
    }
  }
);

app.post("/api/services/:id/request", requireAuth, async (req, res) => {
  log("🚀 ========== SERVICE REQUEST START ==========");

  try {
    const serviceId = req.params.id;
    const userId = req.auth.userId;
    const userRole = req.auth.role;
    const { message } = req.body;

    log("📮 Requesting service:", { serviceId, userId, userRole });

    // 1. Only ambassadors can request
    if (userRole !== "ambassador") {
      return res.status(403).json({
        error: "Only ambassadors can request services",
      });
    }

    log("✅ Step 1: Role check passed");

    // 2. Get service
    const service = await getServiceById(serviceId);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    if (service.status !== "active") {
      return res
        .status(400)
        .json({ error: "Service is not accepting requests" });
    }

    log("✅ Step 2: Service found -", service.title);

    // 3. Get ambassador
    const ambassador = await getUserById(userId, "ambassador");
    if (!ambassador) {
      return res.status(404).json({ error: "Ambassador profile not found" });
    }

    const ambassadorId = ambassador.ambassador_id;
    log("✅ Step 3: Ambassador found -", ambassadorId);

    // 4. Check if already requested
    const { data: existingRequest } = await supabase
      .from("service_requests")
      .select("request_id")
      .eq("service_id", serviceId)
      .eq("ambassador_id", ambassadorId)
      .single();

    if (existingRequest) {
      log("⚠️ Already requested");
      return res.status(400).json({
        error: "You have already requested this service",
      });
    }

    log("✅ Step 4: No duplicate found");

    // 4b. Enforce capacity limit (max applications) if set on the service
    if (service.capacity != null && service.capacity > 0) {
      const { count: currentCount } = await supabase
        .from("service_requests")
        .select("request_id", { count: "exact", head: true })
        .eq("service_id", serviceId)
        .in("status", ["pending", "approved", "completed"]);

      if (currentCount != null && currentCount >= service.capacity) {
        return res.status(400).json({
          error: "This service has reached its participant limit. No more applications can be accepted.",
        });
      }
    }

    // 5. CREATE THE SERVICE REQUEST (THIS IS THE IMPORTANT PART)
    const requestId = uuidv4();
    const requestData = {
      request_id: requestId,
      service_id: serviceId,
      ambassador_id: ambassadorId,
      partner_id: service.partner_id,
      message: message || "",
      status: "pending",
      created_at: new Date().toISOString(),
    };

    log("💾 Creating service request in database:", requestId);

    const { data: serviceRequest, error: createError } = await supabase
      .from("service_requests")
      .insert([requestData])
      .select()
      .single();

    if (createError) {
      console.error("❌ Database error:", createError);
      throw createError;
    }

    log("✅ Step 5: Service request CREATED in database!", requestId);

    // 6. CREATE NOTIFICATIONS (WON'T FAIL IF THESE DON'T WORK)
    const ambassadorName = ambassador.first_name
      ? `${ambassador.first_name} ${ambassador.last_name || ""}`.trim()
      : "An ambassador";

    const linkedinUrl = ambassador.linkedin_profile_url || null;
    const speakerUrl = ambassador.speaker_profile_url || null;

    const profileSnippet =
      linkedinUrl || speakerUrl
        ? [
            linkedinUrl ? `LinkedIn: ${linkedinUrl}` : null,
            speakerUrl ? `Speaker profile: ${speakerUrl}` : null,
          ]
            .filter(Boolean)
            .join(" • ")
        : null;

    log("📬 Creating notifications...");

    // Get partner user_id
    const partnerUserId = await getPartnerUserIdFromPartnerId(
      service.partner_id
    );

    if (partnerUserId) {
      // 🚨 CRITICAL FIX: application_id = null, request_id = requestId
      await createNotification(
        partnerUserId,
        "partner",
        "service_request",
        "📋 New Service Request",
        `${ambassadorName} has requested your service "${service.title}"${
          profileSnippet ? ` · ${profileSnippet}` : ""
        }`,
        `/my-services.html`,
        null, // 🚨 MUST BE NULL FOR SERVICE REQUESTS
        requestId // 🚨 THIS IS THE SERVICE REQUEST ID
      );
      log("✅ Partner notification sent");
    }

    // Notify ambassador
    await createNotification(
      userId,
      "ambassador",
      "service_request_sent",
      "✅ Service Request Sent",
      `Your request for "${service.title}" has been sent to the partner`,
      `/services.html`,
      null, // 🚨 MUST BE NULL FOR SERVICE REQUESTS
      requestId // 🚨 THIS IS THE SERVICE REQUEST ID
    );

    log("✅ Ambassador notification sent");

    // Notify admins about the new service request
    try {
      const { data: admins } = await supabase.from("admins").select("user_id");
      if (admins && admins.length > 0) {
        for (const admin of admins) {
          await createNotification(
            admin.user_id,
            "admin",
            "service_request",
            "🔧 New Service Request",
            `${ambassadorName} requested service: "${service.title}"`,
            `/admin-dashboard.html`,
            null,
            requestId
          );
        }
        log("✅ Admin notifications sent for service request");
      }
    } catch (notifError) {
      console.error("⚠️ Failed to notify admins:", notifError.message);
    }

    log("\n🎉 ========== SERVICE REQUEST SUCCESS ==========\n");

    // 7. RETURN SUCCESS RESPONSE
    return res.json({
      success: true,
      requestId: requestId,
      message: "Service request submitted successfully!",
    });
  } catch (error) {
    console.error("\n❌ ========== SERVICE REQUEST ERROR ==========");
    console.error("Error:", error.message);
    console.error("===========================================\n");

    return res.status(500).json({
      error: "Failed to submit service request",
      details: error.message,
    });
  }
});

// ============================================
// PARTNER: Get applications for specific partner - FIXED
// ============================================
app.get(
  "/api/partner/applications",
  requireAuth,
  requireRole("partner"),
  async (req, res) => {
    try {
      const userId = req.auth.userId; // This is user_id
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      log("📋 Fetching applications for user_id:", userId);

      // ✅ FIX: First get the partner_id from the partners table
      const { data: partner, error: partnerError } = await supabase
        .from("partners")
        .select("partner_id")
        .eq("user_id", userId) // Lookup by user_id
        .single();

      if (partnerError || !partner) {
        console.error("❌ Partner not found for user_id:", userId);
        return res.json({
          items: [],
          total: 0,
          limit,
          offset,
        });
      }

      log("✅ Found partner_id:", partner.partner_id);

      // Optional status filter (frontend uses "accepted", DB uses "approved")
      const statusParam = req.query.status;
      const validStatuses = ["pending", "accepted", "approved", "rejected", "reviewed", "withdrawn"];
      const statusFilter =
        statusParam &&
        statusParam !== "all" &&
        validStatuses.includes(String(statusParam).toLowerCase())
          ? String(statusParam).toLowerCase() === "accepted"
            ? "approved"
            : String(statusParam).toLowerCase()
          : null;
      if (statusFilter) {
        log("📋 Partner applications filter: status =", statusFilter);
      }

      // Optional post_id filter
      const postIdParam = req.query.post_id || req.query.postId;
      const postIdFilter =
        postIdParam && String(postIdParam).trim() !== "" && String(postIdParam) !== "all"
          ? String(postIdParam).trim()
          : null;

      // ✅ Now get applications using the correct partner_id (and optional status + post_id)
      let query = supabase
        .from("applications")
        .select("*", { count: "exact" })
        .eq("partner_id", partner.partner_id);
      if (statusFilter) {
        // "Accepted" in UI = DB can have "approved" or legacy "accepted"
        if (statusFilter === "approved") {
          query = query.in("status", ["approved", "accepted"]);
        } else {
          query = query.eq("status", statusFilter);
        }
      }
      if (postIdFilter) {
        query = query.eq("post_id", postIdFilter);
      }
      const {
        data: applications,
        error,
        count,
      } = await query
        .order("applied_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Error fetching applications:", error);
        throw error;
      }

      if (!applications || applications.length === 0) {
        return res.json({
          items: [],
          total: 0,
          limit,
          offset,
        });
      }

      // Get detailed information for each application
      const detailedApplications = await Promise.all(
        applications.map(async (app) => {
          // Get ambassador details
          let ambassadorName = "Unknown";
          let ambassadorProfile = null;

          if (app.ambassador_id) {
            const { data: ambassador } = await supabase
              .from("ambassadors")
              .select("first_name, last_name, email, cv_filename")
              .eq("ambassador_id", app.ambassador_id)
              .single();

            if (ambassador) {
              ambassadorName = `${ambassador.first_name || ""} ${
                ambassador.last_name || ""
              }`.trim();
              ambassadorProfile = {
                name: ambassadorName,
                email: ambassador.email,
                cvFilename: ambassador.cv_filename,
              };
            }
          }

          // Get post title
          let postTitle = "Opportunity";
          if (app.post_id) {
            const { data: post } = await supabase
              .from("posts")
              .select("title")
              .eq("post_id", app.post_id)
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
            termsAccepted: app.terms_accepted,
          };
        })
      );

      log("✅ Found", detailedApplications.length, "applications");

      return res.json({
        items: detailedApplications,
        total: count || 0,
        limit,
        offset,
      });
    } catch (error) {
      console.error("❌ Error fetching partner applications:", error);
      return res.status(500).json({
        error: "Failed to fetch applications",
        details: error.message,
      });
    }
  }
);
// ============================================
// TEST ENDPOINT FOR PRESENTATION
// ============================================
app.get("/api/test-fix", async (req, res) => {
  log("🧪 TEST: Checking if service request fix works...");

  // Test the logic
  const testId = uuidv4();

  return res.json({
    status: "READY",
    fix: "APPLIED",
    message: "Service requests now use request_id instead of application_id",
    test: {
      correct_format: {
        application_id: null,
        request_id: testId,
      },
      timestamp: new Date().toISOString(),
    },
  });
});

// ============================================
// PARTNER: Update application status - FIXED
// ============================================
app.put(
  "/api/partner/applications/:id/status",
  requireAuth,
  requireRole("partner"),
  async (req, res) => {
    try {
      const userId = req.auth.userId; // ✅ This is user_id from session
      const applicationId = req.params.id;
      const { status } = req.body;

      if (!status || !["pending", "accepted", "rejected"].includes(status)) {
        return res.status(400).json({
          error: "Valid status is required (pending, accepted, or rejected)",
        });
      }

      // DB stores "approved", not "accepted"; map so filter and display stay in sync
      const statusToSave = status === "accepted" ? "approved" : status;

      log("📝 Updating application status:", {
        applicationId,
        status,
        statusToSave,
        userId,
      });

      // ✅ FIX: First get the partner_id from the partners table
      const { data: partner, error: partnerError } = await supabase
        .from("partners")
        .select("partner_id")
        .eq("user_id", userId) // ✅ Lookup by user_id
        .single();

      if (partnerError || !partner) {
        console.error("❌ Partner not found for user_id:", userId);
        return res.status(404).json({ error: "Partner not found" });
      }

      log("✅ Found partner_id:", partner.partner_id);

      // ✅ Check if application belongs to this partner using partner_id
      const { data: application, error: fetchError } = await supabase
        .from("applications")
        .select("*")
        .eq("application_id", applicationId)
        .eq("partner_id", partner.partner_id) // ✅ Use partner_id from lookup!
        .single();

      if (fetchError || !application) {
        log("❌ Application not found or unauthorized");
        return res.status(404).json({ error: "Application not found" });
      }

      log("✅ Application found, updating status...");

      // ✅ Update status (store "approved" when partner sends "accepted")
      const { data: updatedApplication, error: updateError } = await supabase
        .from("applications")
        .update({ status: statusToSave })
        .eq("application_id", applicationId)
        .select()
        .single();

      if (updateError) {
        console.error("❌ Error updating application:", updateError);
        throw updateError;
      }

      log("✅ Application status updated successfully");

      // Get ambassador and post details for notification
      const { data: ambassador } = await supabase
        .from("ambassadors")
        .select("first_name, last_name, email, user_id")
        .eq("ambassador_id", application.ambassador_id)
        .single();

      const { data: post } = await supabase
        .from("posts")
        .select("title")
        .eq("post_id", application.post_id)
        .single();

      const ambassadorName = ambassador
        ? `${ambassador.first_name || ""} ${ambassador.last_name || ""}`.trim()
        : "Ambassador";

      const postTitle = post ? post.title : "Opportunity";

      // Create notification for ambassador
      const statusMessages = {
        accepted: {
          title: "🎉 Application Accepted!",
          message: `Great news! Your application for "${postTitle}" has been accepted. The partner will contact you soon.`,
        },
        rejected: {
          title: "❌ Application Update",
          message: `Your application for "${postTitle}" was not selected this time. Keep applying to other opportunities!`,
        },
        pending: {
          title: "⏳ Application Under Review",
          message: `Your application for "${postTitle}" is being reviewed by the partner.`,
        },
      };

      const notificationInfo = statusMessages[status];

      // ✅ IMPORTANT: Use ambassador's user_id for notification, not ambassador_id
      if (ambassador && ambassador.user_id) {
        await createNotification(
          ambassador.user_id, // ✅ Use user_id for notification recipient
          "ambassador",
          "application_status_change",
          notificationInfo.title,
          notificationInfo.message,
          `/Partner-Calls.html`,
          applicationId
        );
        log("✅ Notification sent to ambassador");
      }

      return res.json({
        success: true,
        application: updatedApplication,
        message: `Application status updated to ${status}`,
        notificationSent: true,
      });
    } catch (error) {
      console.error("❌ Error updating application status:", error);
      return res.status(500).json({
        error: "Failed to update application status",
        details: error.message,
      });
    }
  }
);

app.put(
  "/api/services/:id",
  requireAuth,
  requireRole("partner"),
  async (req, res) => {
    try {
      const serviceId = req.params.id;
      const userId = req.auth.userId;
      const updates = req.body;

      log("✏️ Updating service:", { serviceId, userId });

      // Verify service exists and belongs to this partner
      const service = await getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      const partner = await getUserById(userId, "partner");
      if (
        !partner ||
        (partner.partner_id !== service.partner_id &&
          partner.id !== service.partner_id)
      ) {
        return res
          .status(403)
          .json({ error: "Not authorized to update this service" });
      }

      // Only allow certain fields to be updated
      const allowedUpdates = [
        "title",
        "description",
        "type",
        "duration",
        "capacity",
        "external_link",
        "status",
      ];
      const filteredUpdates = {};

      allowedUpdates.forEach((field) => {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      });

      filteredUpdates.updated_at = new Date().toISOString();

      const updatedService = await updateService(serviceId, filteredUpdates);

      return res.json({
        success: true,
        service: updatedService,
        message: "Service updated successfully",
      });
    } catch (error) {
      console.error("❌ Error updating service:", error);
      return res.status(500).json({
        error: "Failed to update service",
        details: error.message,
      });
    }
  }
);

app.put(
  "/api/service-requests/:id/status",
  requireAuth,
  requireRole("partner"),
  async (req, res) => {
    try {
      const requestId = req.params.id;
      const userId = req.auth.userId;
      const { status } = req.body;

      log("📝 Updating request status:", { requestId, status, userId });

      if (
        !status ||
        !["pending", "accepted", "rejected", "completed"].includes(status)
      ) {
        return res.status(400).json({
          error:
            "Valid status is required (pending, accepted, rejected, or completed)",
        });
      }

      // Get request details
      const { data: request, error: requestError } = await supabase
        .from("service_requests")
        .select("*, services:service_id(title, partner_id)")
        .eq("request_id", requestId)
        .single();

      if (requestError || !request) {
        return res.status(404).json({ error: "Service request not found" });
      }

      // Verify partner owns the service
      const partner = await getUserById(userId, "partner");
      if (
        !partner ||
        (partner.partner_id !== request.partner_id &&
          partner.id !== request.partner_id)
      ) {
        return res
          .status(403)
          .json({ error: "Not authorized to update this request" });
      }

      // Update status
      const updatedRequest = await updateServiceRequestStatus(
        requestId,
        status
      );

      // Get ambassador info for notification
      const { data: ambassador } = await supabase
        .from("ambassadors")
        .select("first_name, last_name, email, user_id")
        .eq("ambassador_id", request.ambassador_id)
        .single();

      // Create notification for ambassador
      const statusMessages = {
        accepted: {
          title: "🎉 Service Request Accepted!",
          message: `Your request for "${
            request.services?.title || "service"
          }" has been accepted. The partner will contact you soon.`,
        },
        rejected: {
          title: "❌ Service Request Update",
          message: `Your request for "${
            request.services?.title || "service"
          }" was not accepted at this time.`,
        },
        completed: {
          title: "✅ Service Completed",
          message: `Your service "${
            request.services?.title || "service"
          }" has been marked as completed.`,
        },
      };

      const notificationInfo = statusMessages[status];

      // Get ambassador's user_id for notification
      const ambassadorUserId = await getAmbassadorUserIdFromAmbassadorId(
        request.ambassador_id
      );

      if (ambassadorUserId && notificationInfo) {
        await createNotification(
          ambassadorUserId,
          "ambassador",
          "service_request_status",
          notificationInfo.title,
          notificationInfo.message,
          `/services.html`,
          requestId
        );
        log("✅ Notification sent to ambassador");
      }

      return res.json({
        success: true,
        request: updatedRequest,
        message: `Request status updated to ${status}`,
      });
    } catch (error) {
      console.error("❌ Error updating request status:", error);
      return res.status(500).json({
        error: "Failed to update request status",
        details: error.message,
      });
    }
  }
);

// ============================================
// NOTIFICATION ENDPOINTS
// ============================================

app.get("/api/notifications", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const role = req.auth.role;
    const limit = parseInt(req.query.limit) || 20;
    const unreadOnly = req.query.unread === "true";

    if (req.query.debug === "true") {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_type", "admin")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        console.error("Error fetching debug notifications:", error);
        throw error;
      }
      return res.json({
        notifications: data || [],
        debug: true,
        total: data?.length || 0,
        unreadCount: (data || []).filter((n) => !n.read).length,
      });
    }

    log("📬 Fetching notifications for:", userId, role);

    // ✅ CRITICAL: Filter by BOTH recipient_id AND recipient_type to ensure admins only see admin notifications
    let query = supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", userId)
        .eq("recipient_type", role)  // ✅ FIX: Filter by role to ensure admins only see admin notifications
        .order("created_at", { ascending: false })
        .limit(limit);

    log("🔍 Querying notifications for user:", userId, "with role filter:", role);

    if (unreadOnly) {
      query = query.eq("read", false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }

    // ✅ LOG: Check if notifications have 'read' field
    log("✅ Found", notifications?.length || 0, "notifications");
    log("📊 First notification read status:", notifications?.[0]?.read);
    log("📊 Unread count:", notifications?.filter(n => !n.read).length);

    return res.json({
      notifications: notifications || [],
      total: notifications?.length || 0,
      unreadCount: notifications?.filter((n) => !n.read).length || 0,
    });
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    return res.status(500).json({
      error: "Failed to fetch notifications",
      details: error.message,
    });
  }
});
// ============================================
// GET AMBASSADOR PORTFOLIO/PROFILE
// ============================================
app.get("/api/ambassadors/:id/portfolio", requireAuth, async (req, res) => {
  try {
    const ambassadorId = req.params.id;

    log("📖 Fetching ambassador portfolio:", ambassadorId);

    // Get ambassador basic info
    const { data: ambassador, error: ambError } = await supabase
      .from("ambassadors")
      .select(
        "first_name, last_name, email, bio, profile_picture, linkedin_url, portfolio_url, cv_filename"
      )
      .eq("ambassador_id", ambassadorId)
      .single();

    if (ambError || !ambassador) {
      log("❌ Ambassador not found:", ambassadorId);
      return res.status(404).json({ error: "Ambassador not found" });
    }

    // Get ambassador's articles (as portfolio items)
    const { data: articles, error: artError } = await supabase
      .from("articles")
      .select(
        "article_id, title, excerpt, content, status, created_at, likes, views"
      )
      .eq("ambassador_id", ambassadorId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(5);

    if (artError) {
      console.error("Error fetching articles:", artError);
    }

    // Get ambassador's journey progress
    const { data: journeyProgress } = await supabase
      .from("journey_progress")
      .select("current_month, completed_tasks")
      .eq("ambassador_id", ambassadorId)
      .single();

    // Calculate skills based on completed tasks
    let skills = [];
    if (journeyProgress && journeyProgress.completed_tasks) {
      const completedTasks = journeyProgress.completed_tasks;
      if (completedTasks["1-linkedin_course"]) skills.push("LinkedIn Strategy");
      if (completedTasks["2-implement_audit"]) skills.push("Content Audit");
      if (completedTasks["2-submit_article_1"]) skills.push("Article Writing");
      if (completedTasks["3-first_event"]) skills.push("Event Management");
    }

    return res.json({
      success: true,
      ambassador: {
        id: ambassadorId,
        name: `${ambassador.first_name || ""} ${
          ambassador.last_name || ""
        }`.trim(),
        email: ambassador.email,
        bio: ambassador.bio || "No bio provided",
        profilePicture: ambassador.profile_picture,
        linkedinUrl: ambassador.linkedin_url,
        portfolioUrl: ambassador.portfolio_url,
        cvFilename: ambassador.cv_filename,
        skills:
          skills.length > 0
            ? skills
            : ["Content Creation", "Community Engagement"],
      },
      portfolio: {
        articles: articles || [],
        totalArticles: articles?.length || 0,
        // Add other portfolio items here if needed
      },
      journey: journeyProgress || null,
    });
  } catch (error) {
    console.error("❌ Error fetching ambassador portfolio:", error);
    return res.status(500).json({
      error: "Failed to fetch ambassador portfolio",
      details: error.message,
    });
  }
});

// Mark notification as read
app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.auth.userId;
    const role = req.auth.role;

    // ✅ CRITICAL: Filter by BOTH recipient_id AND recipient_type to ensure admins can only mark their own notifications as read
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("notification_id", notificationId)
      .eq("recipient_id", userId)
      .eq("recipient_type", role)  // ✅ FIX: Ensure admin can only mark admin notifications as read
      .select()
      .single();

    if (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: "Notification not found or unauthorized" });
    }

    log("✅ Notification marked as read:", notificationId);
    return res.json({ success: true, notification: data });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({ error: "Failed to update notification" });
  }
});

// Mark all notifications as read
app.post("/api/notifications/mark-all-read", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const role = req.auth.role;

    log('📝 Marking all notifications as read for:', userId);

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("recipient_id", userId)
      .eq("recipient_type", role)
      .eq("read", false);

    if (error) {
      console.error('❌ Error:', error);
      throw error;
    }

    log('✅ All notifications marked as read');

    return res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all as read:", error);
    return res.status(500).json({ 
      error: "Failed to update notifications",
      details: error.message 
    });
  }
});

// ============================================
// AMBASSADOR: Get own applications with status - FIXED
// ============================================
app.get(
  "/api/ambassador/applications",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const userId = req.auth.userId; // This is user_id
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      log("📋 Fetching applications for user_id:", userId);

      // ✅ FIX: First get the ambassador_id from the ambassadors table
      const ambassador = await getUserById(userId, "ambassador");
      if (!ambassador) {
        console.error("❌ Ambassador not found for user_id:", userId);
        return res.json({
          items: [],
          total: 0,
          limit,
          offset,
        });
      }

      const ambassadorId = ambassador.ambassador_id || ambassador.id;
      log("✅ Found ambassador_id:", ambassadorId);

      // ✅ Now query applications using the correct ambassador_id
      const {
        data: applications,
        error,
        count,
      } = await supabase
        .from("applications")
        .select("*", { count: "exact" })
        .eq("ambassador_id", ambassadorId) // ✅ Use ambassador_id!
        .order("applied_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Error fetching applications:", error);
        throw error;
      }

      // Get post details for each application
      const detailedApplications = await Promise.all(
        (applications || []).map(async (app) => {
          const { data: post } = await supabase
            .from("posts")
            .select("title, content, category")
            .eq("post_id", app.post_id)
            .single();

          return {
            id: app.application_id,
            postId: app.post_id,
            postTitle: post?.title || "Opportunity",
            postContent: post?.content || "",
            postCategory: post?.category || "general",
            status: app.status, // ✅ Return actual status
            appliedAt: app.applied_at,
            cvFilename: app.cv_filename,
            subscribeToNewsletter: app.subscribe_to_newsletter,
            termsAccepted: app.terms_accepted,
          };
        })
      );

      log("✅ Found", detailedApplications.length, "applications");

      return res.json({
        items: detailedApplications,
        total: count || 0,
        limit,
        offset,
      });
    } catch (error) {
      console.error("❌ Error fetching ambassador applications:", error);
      return res.status(500).json({
        error: "Failed to fetch applications",
        details: error.message,
      });
    }
  }
);

// ============================================
// PARTNER: Get single application by ID - FIXED
// ============================================
app.get(
  "/api/partner/applications/:id",
  requireAuth,
  requireRole("partner"),
  async (req, res) => {
    try {
      const userId = req.auth.userId; // ✅ This is user_id from session
      const applicationId = req.params.id;

      log(
        "📖 Fetching application:",
        applicationId,
        "for user_id:",
        userId
      );

      // ✅ FIX: First get the partner_id from the partners table
      const { data: partner, error: partnerError } = await supabase
        .from("partners")
        .select("partner_id")
        .eq("user_id", userId) // ✅ Lookup by user_id
        .single();

      if (partnerError || !partner) {
        console.error("❌ Partner not found for user_id:", userId);
        return res.status(404).json({ error: "Partner not found" });
      }

      log("✅ Found partner_id:", partner.partner_id);

      // ✅ Get application and verify it belongs to this partner using partner_id
      const { data: application, error } = await supabase
        .from("applications")
        .select("*")
        .eq("application_id", applicationId)
        .eq("partner_id", partner.partner_id) // ✅ Use partner_id from lookup!
        .single();

      if (error || !application) {
        log("❌ Application not found or unauthorized");
        return res.status(404).json({ error: "Application not found" });
      }

      log("✅ Application found:", application.application_id);

      // Get ambassador details
      let ambassadorName = "Unknown";
      let ambassadorProfile = null;

      if (application.ambassador_id) {
        const { data: ambassador } = await supabase
          .from("ambassadors")
          .select(
            "first_name, last_name, email, cv_filename, professional_headline, professional_summary, linkedin_profile_url, speaker_profile_url"
          )
          .eq("ambassador_id", application.ambassador_id)
          .single();

        if (ambassador) {
          ambassadorName = `${ambassador.first_name || ""} ${
            ambassador.last_name || ""
          }`.trim();
          ambassadorProfile = {
            name: ambassadorName,
            email: ambassador.email,
            cvFilename: ambassador.cv_filename,
            professionalHeadline: ambassador.professional_headline,
            professionalSummary: ambassador.professional_summary,
            linkedinProfileUrl: ambassador.linkedin_profile_url || null,
            speakerProfileUrl: ambassador.speaker_profile_url || null,
          };
        }
      }

      // Get post title
      let postTitle = "Opportunity";
      if (application.post_id) {
        const { data: post } = await supabase
          .from("posts")
          .select("title")
          .eq("post_id", application.post_id)
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
        termsAccepted: application.terms_accepted,
      };

      log("✅ Formatted application sent to frontend");

      return res.json({
        application: formattedApplication,
      });
    } catch (error) {
      console.error("❌ Error fetching application:", error);
      return res.status(500).json({
        error: "Failed to fetch application",
        details: error.message,
      });
    }
  }
);

// Serve uploaded CV files
app.get("/uploads/cvs/:filename", (req, res) => {
  const filePath = path.join(__dirname, "uploads", "cvs", req.params.filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: "File not found" });
  }
});

// ============================================
// 1. GET ALL SERVICES (For Everyone)
// ============================================
app.get("/api/services", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const userRole = req.auth.role;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type;
    const search = req.query.search;

    log("📋 Fetching services for:", { userId, userRole });

    let filters = {
      limit,
      offset,
      status: "active",
    };

    if (type && type !== "all") filters.type = type;
    if (search && search.trim() !== "") filters.search = search.trim();

    const { services, total } = await getServices(filters);

    // ✅ OPTIMIZATION: Get user data once
    let userPartner = null;
    let userAmbassador = null;
    let userPartnerAsAmbassador = null;

    if (userRole === "partner") {
      userPartner = await getUserById(userId, "partner");

      // Check if partner also has ambassador profile
      const { data: partnerAmbassador } = await supabase
        .from("ambassadors")
        .select("ambassador_id")
        .eq("user_id", userId)
        .single();

      userPartnerAsAmbassador = partnerAmbassador;
    } else if (userRole === "ambassador") {
      userAmbassador = await getUserById(userId, "ambassador");
    }

    // ✅ OPTIMIZATION: Get all request statuses in one query
    let requestedServiceIds = new Set();
    if (userRole === "ambassador" && userAmbassador) {
      const ambassadorId = userAmbassador.ambassador_id || userAmbassador.id;
      const { data: existingRequests } = await supabase
        .from("service_requests")
        .select("service_id, status")
        .eq("ambassador_id", ambassadorId);

      existingRequests?.forEach((req) =>
        requestedServiceIds.add(req.service_id)
      );
    } else if (userRole === "partner" && userPartnerAsAmbassador) {
      // Partner requesting as ambassador
      const { data: existingRequests } = await supabase
        .from("service_requests")
        .select("service_id, status")
        .eq("ambassador_id", userPartnerAsAmbassador.ambassador_id);

      existingRequests?.forEach((req) =>
        requestedServiceIds.add(req.service_id)
      );
    }

    // ✅ OPTIMIZATION: Get all partner names and emails in one query
    const partnerIds = [...new Set(services.map(s => s.partner_id).filter(Boolean))];
    const partnerNamesMap = new Map();
    
    if (partnerIds.length > 0) {
      // Get partners with their user emails
      const { data: partners } = await supabase
        .from("partners")
        .select("partner_id, contact_person, organization_name, user_id")
        .in("partner_id", partnerIds);
      
      // Get user emails for these partners
      if (partners && partners.length > 0) {
        const userIds = partners.map(p => p.user_id).filter(Boolean);
        
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from("users")
            .select("user_id, email")
            .in("user_id", userIds);
          
          // Create a map of user_id to email
          const userEmailMap = new Map();
          users?.forEach(user => {
            userEmailMap.set(user.user_id, user.email || '');
          });
          
          // Combine partner info with email
          partners.forEach(partner => {
            const name = partner.contact_person || partner.organization_name || "Partner";
            const email = userEmailMap.get(partner.user_id) || '';
            partnerNamesMap.set(partner.partner_id, { name, email });
          });
        }
      }
    }

    // ✅ Capacity: get request counts for services that have a capacity limit
    const capacityServiceIds = services.filter((s) => s.capacity != null && s.capacity > 0).map((s) => s.service_id);
    const capacityCountMap = new Map();
    if (capacityServiceIds.length > 0) {
      const { data: capacityRows } = await supabase
        .from("service_requests")
        .select("service_id")
        .in("service_id", capacityServiceIds)
        .in("status", ["pending", "approved", "completed"]);
      (capacityRows || []).forEach((row) => {
        capacityCountMap.set(row.service_id, (capacityCountMap.get(row.service_id) || 0) + 1);
      });
    }

    // Process services
    const processedServices = services.map((service) => {
      const processed = { ...service };

      // Check ownership
      if (userPartner) {
        processed.isOwner = service.partner_id === userPartner.partner_id;
      }

      // Check if requested
      processed.hasRequested = requestedServiceIds.has(service.service_id);

      // Capacity: at capacity and spots left (for display / disabling Apply)
      if (service.capacity != null && service.capacity > 0) {
        const currentCount = capacityCountMap.get(service.service_id) || 0;
        processed.atCapacity = currentCount >= service.capacity;
        processed.spotsLeft = Math.max(0, service.capacity - currentCount);
      } else {
        processed.atCapacity = false;
        processed.spotsLeft = null; // unlimited
      }
      
      // Add partner name and email
      if (service.partner_id) {
        const partnerInfo = partnerNamesMap.get(service.partner_id);
        if (partnerInfo) {
          processed.partnerName = partnerInfo.name || "Partner";
          processed.partnerEmail = partnerInfo.email || '';
        } else {
          console.warn(`⚠️ Partner info not found for partner_id: ${service.partner_id}`);
          processed.partnerName = "Partner";
          processed.partnerEmail = '';
        }
      } else {
        processed.partnerName = "Partner";
        processed.partnerEmail = '';
      }

      return processed;
    });

    log(`✅ Found ${processedServices.length} services`);

    return res.json({
      services: processedServices,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("❌ Error fetching services:", error);
    return res.status(500).json({
      error: "Failed to fetch services",
      details: error.message,
    });
  }
});

// ============================================
// 8. GET SERVICE REQUESTS (Service Owner Only)
// ============================================
app.get(
  "/api/services/:id/requests",
  requireAuth,
  requireRole("partner"),
  async (req, res) => {
    try {
      const serviceId = req.params.id;
      const userId = req.auth.userId;

      log("📋 Fetching requests for service:", { serviceId, userId });

      // Verify service exists and belongs to this partner
      const service = await getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      const partner = await getUserById(userId, "partner");
      if (
        !partner ||
        (partner.partner_id !== service.partner_id &&
          partner.id !== service.partner_id)
      ) {
        return res
          .status(403)
          .json({ error: "Not authorized to view these requests" });
      }

      const requests = await getServiceRequests(serviceId);

      // Get ambassador info for each request
      const requestsWithDetails = await Promise.all(
        requests.map(async (request) => {
          const { data: ambassador } = await supabase
            .from("ambassadors")
            .select("first_name, last_name, email")
            .eq("ambassador_id", request.ambassador_id)
            .single();

          return {
            ...request,
            ambassador: ambassador
              ? {
                  name: `${ambassador.first_name || ""} ${
                    ambassador.last_name || ""
                  }`.trim(),
                  email: ambassador.email,
                }
              : null,
          };
        })
      );

      log(`✅ Found ${requestsWithDetails.length} requests`);

      return res.json({
        service: {
          id: service.service_id,
          title: service.title,
        },
        requests: requestsWithDetails,
        total: requestsWithDetails.length,
      });
    } catch (error) {
      console.error("❌ Error fetching service requests:", error);
      return res.status(500).json({
        error: "Failed to fetch service requests",
        details: error.message,
      });
    }
  }
);

// ============================================
// 6. GET MY SERVICES (T4L Partners Only)
// ============================================
app.get(
  "/api/partner/services",
  requireAuth,
  requireRole("partner"),
  async (req, res) => {
    try {
      const userId = req.auth.userId;
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      const status = req.query.status;

      log("📋 Fetching partner services for:", userId);

      const partner = await getUserById(userId, "partner");
      if (!partner) {
        return res.status(404).json({ error: "Partner not found" });
      }

      const partnerId = partner.partner_id || partner.id;

      let filters = {
        partnerId,
        limit,
        offset,
      };

      if (status && status !== "all") {
        filters.status = status;
      }

      const { services, total } = await getServices(filters);

      // Get request counts for each service
      const servicesWithRequests = await Promise.all(
        services.map(async (service) => {
          const { count: requestCount } = await supabase
            .from("service_requests")
            .select("*", { count: "exact", head: true })
            .eq("service_id", service.service_id);

          return {
            ...service,
            requestCount: requestCount || 0,
          };
        })
      );

      log(
        `✅ Found ${servicesWithRequests.length} services for partner`
      );

      return res.json({
        services: servicesWithRequests,
        total,
        limit,
        offset,
      });
    } catch (error) {
      console.error("❌ Error fetching partner services:", error);
      return res.status(500).json({
        error: "Failed to fetch your services",
        details: error.message,
      });
    }
  }
);

app.get("/api/services/:id", requireAuth, async (req, res) => {
  try {
    const serviceId = req.params.id;
    const userId = req.auth.userId;
    const userRole = req.auth.role;

    log("🔍 Fetching service details:", {
      serviceId,
      userId,
      userRole,
    });

    const service = await getServiceById(serviceId);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    // Get creator info
    let creatorInfo = {};
    if (service.partner_id) {
      const { data: partner } = await supabase
        .from("partners")
        .select("organization_name, contact_person")
        .eq("partner_id", service.partner_id)
        .single();

      if (partner) {
        creatorInfo = {
          name: partner.contact_person || partner.organization_name,
          organization: partner.organization_name,
        };
      }
    }

    // For ambassadors, check if they've requested this service
    let requestStatus = null;
    let hasRequested = false;

    if (userRole === "ambassador") {
      const ambassador = await getUserById(userId, "ambassador");
      if (ambassador) {
        const ambassadorId = ambassador.ambassador_id || ambassador.id;
        const { data: existingRequest } = await supabase
          .from("service_requests")
          .select("status")
          .eq("service_id", serviceId)
          .eq("ambassador_id", ambassadorId)
          .single();

        hasRequested = !!existingRequest;
        requestStatus = existingRequest?.status || null;
      }
    }

    // For partners, check if this is their service
    let isOwner = false;
    if (userRole === "partner" && service.partner_id) {
      const partner = await getUserById(userId, "partner");
      if (
        partner &&
        (partner.partner_id === service.partner_id ||
          partner.id === service.partner_id)
      ) {
        isOwner = true;

        // Get request count for owner
        const { count: requestCount } = await supabase
          .from("service_requests")
          .select("*", { count: "exact", head: true })
          .eq("service_id", serviceId);

        service.requestCount = requestCount || 0;
      }
    }

    const response = {
      ...service,
      creatorInfo,
      hasRequested,
      requestStatus,
      isOwner,
    };

    return res.json(response);
  } catch (error) {
    console.error("❌ Error fetching service details:", error);
    return res.status(500).json({
      error: "Failed to fetch service details",
      details: error.message,
    });
  }
});

// 10. GET MY SERVICE REQUESTS (Ambassadors Only)
// ============================================
app.get(
  "/api/ambassador/service-requests",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const userId = req.auth.userId;
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      log("📋 Fetching ambassador service requests for:", userId);

      const ambassador = await getUserById(userId, "ambassador");
      if (!ambassador) {
        return res.status(404).json({ error: "Ambassador not found" });
      }

      const ambassadorId = ambassador.ambassador_id || ambassador.id;

      // Get all service requests for this ambassador
      const {
        data: requests,
        error,
        count,
      } = await supabase
        .from("service_requests")
        .select("*", { count: "exact" })
        .eq("ambassador_id", ambassadorId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      // Get service details for each request
      const requestsWithDetails = await Promise.all(
        (requests || []).map(async (request) => {
          const { data: service } = await supabase
            .from("services")
            .select("title, type, description, status as service_status")
            .eq("service_id", request.service_id)
            .single();

          const { data: partner } = await supabase
            .from("partners")
            .select("organization_name, contact_person")
            .eq("partner_id", request.partner_id)
            .single();

          return {
            ...request,
            service: service || { title: "Unknown Service" },
            partner: partner || { organization_name: "Unknown Partner" },
          };
        })
      );

      log(`✅ Found ${requestsWithDetails.length} service requests`);

      return res.json({
        requests: requestsWithDetails,
        total: count || 0,
        limit,
        offset,
      });
    } catch (error) {
      console.error("❌ Error fetching ambassador service requests:", error);
      return res.status(500).json({
        error: "Failed to fetch your service requests",
        details: error.message,
      });
    }
  }
);

// ============================================
// SERVICES HTML PAGE ROUTES
// ============================================

// Services page - redirect to role-specific version
app.get("/services.html", requireAuth, async (req, res) => {
  try {
    const user = await getUserById(req.auth.userId, req.auth.role);
    if (!user) {
      return res.redirect("/signin");
    }
    // Redirect to role-specific services page
    if (user.role === "partner") {
      return res.redirect("/services-partner.html");
    } else if (user.role === "ambassador") {
      return res.redirect("/services-ambassador.html");
    } else {
      return res.redirect("/signin");
    }
  } catch (error) {
    console.error("Error serving services page:", error);
    return res.redirect("/signin");
  }
});

// Services - Ambassador version
app.get("/services-ambassador.html", requireAuth, requireRole("ambassador"), async (req, res) => {
  try {
    const user = await getUserById(req.auth.userId, "ambassador");
    if (!user) {
      return res.redirect("/signin");
    }
    log("✅ Serving services-ambassador.html to:", user.email);
    res.sendFile(path.join(__dirname, "public", "services-ambassador.html"));
  } catch (error) {
    console.error("Error serving ambassador services page:", error);
    return res.redirect("/signin");
  }
});

// Services - Partner version
app.get("/services-partner.html", requireAuth, requireRole("partner"), async (req, res) => {
  try {
    const user = await getUserById(req.auth.userId, "partner");
    if (!user) {
      return res.redirect("/partner-signin");
    }
    log("✅ Serving services-partner.html to:", user.email);
    res.sendFile(path.join(__dirname, "public", "services-partner.html"));
  } catch (error) {
    console.error("Error serving partner services page:", error);
    return res.redirect("/partner-signin");
  }
});

// Create service page (for T4L partners only)
app.get(
  "/create-service.html",
  requireAuth,
  requireRole("partner"),
  async (req, res) => {
    try {
      const user = await getUserById(req.auth.userId, "partner");
      if (!user) {
        return res.redirect("/partner-signin");
      }
      log("✅ Serving create-service.html to partner:", user.email);
      res.sendFile(path.join(__dirname, "public", "create-service.html"));
    } catch (error) {
      console.error("Error serving create service page:", error);
      return res.redirect("/partner-signin");
    }
  }
);

// My services page (for T4L partners only - STRICT ENFORCEMENT)
app.get(
  "/my-services.html",
  requireAuth,
  async (req, res) => {
    try {
      // ✅ CRITICAL: Check role FIRST - redirect non-partners immediately
      if (!req.auth || req.auth.role !== "partner") {
        log("🚫 Blocked access to my-services.html - role:", req.auth?.role);
        if (req.auth?.role === "ambassador") {
          return res.redirect("/ambassador-dashboard.html");
        } else {
          return res.redirect("/partner-signin");
        }
      }

      // ✅ DOUBLE CHECK: Verify user is actually a partner
      const user = await getUserById(req.auth.userId, "partner");
      if (!user) {
        log("🚫 User not found as partner:", req.auth.userId);
        return res.redirect("/partner-signin");
      }

      // ✅ TRIPLE CHECK: Verify role from database matches
      if (user.role !== "partner") {
        log("🚫 User role mismatch - DB role:", user.role, "Session role:", req.auth.role);
        return res.redirect("/partner-signin");
      }

      log("✅ Serving my-services.html to partner:", user.email);
      res.sendFile(path.join(__dirname, "public", "my-services.html"));
    } catch (error) {
      console.error("❌ Error serving my services page:", error);
      return res.redirect("/partner-signin");
    }
  }
);
// Add this TEMPORARY debug endpoint
app.get("/api/debug/session", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const role = req.auth.role;

    log("🔍 SESSION DEBUG:");
    log("   user_id from session:", userId);
    log("   role from session:", role);

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("user_id, email, user_type")
      .eq("user_id", userId)
      .single();

    log("   User in users table:", user);

    // Check if ambassador exists
    const { data: ambassador, error: ambError } = await supabase
      .from("ambassadors")
      .select("ambassador_id, user_id, email, first_name, last_name")
      .eq("user_id", userId)
      .single();

    log("   Ambassador found:", ambassador);

    return res.json({
      session: { userId, role },
      user: user,
      ambassador: ambassador,
      errors: { userError, ambError },
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
    // Use SameSite=Lax for localhost (works without HTTPS)
    // For production with HTTPS, you can change to SameSite=None; Secure
    "SameSite=Lax",
  ];
  if (maxAgeMs && Number.isFinite(maxAgeMs)) {
    attrs.push(`Max-Age=${Math.floor(maxAgeMs / 1000)}`);
  }
  res.setHeader("Set-Cookie", attrs.join("; "));
  log("Cookie set:", attrs.join("; "));
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

    log("Session created:", {
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

  // ✅ EXTRA SAFETY: Always trust the canonical role from the users table
  // This prevents any stale / incorrect role stored in the sessions table
  // from causing a partner to be seen as an ambassador (or vice‑versa).
  let effectiveRole = sess.role;
  try {
    const { data: userRow, error } = await supabase
      .from("users")
      .select("user_type")
      .eq("user_id", sess.userId)
      .single();

    if (!error && userRow && userRow.user_type) {
      if (
        userRow.user_type === "ambassador" ||
        userRow.user_type === "partner" ||
        userRow.user_type === "admin"
      ) {
        if (userRow.user_type !== sess.role) {
          log("⚠️ Session role mismatch, correcting from DB", {
            userId: sess.userId,
            sessionRole: sess.role,
            dbRole: userRow.user_type,
          });
        }
        effectiveRole = userRow.user_type;
      }
    }
  } catch (err) {
    console.error("⚠️ Failed to verify role from users table:", err.message);
  }

  req.auth = { ...sess, role: effectiveRole };
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
    log("Registration attempt:", { email, access_code, name });

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

    log("User created successfully:", newUser.ambassador_id);

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
      redirect: "/signin?registered=true",
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
    log("📝 Partner registration request received");
    log("Request body:", req.body);

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
    if (
      !email ||
      !access_code ||
      !password ||
      !organizationName ||
      !contactName
    ) {
      log("❌ Missing required fields!");
      return res.status(400).json({ error: "All fields required" });
    }

    const emailLower = String(email).toLowerCase().trim();
    const access_codeUpper = String(access_code).toUpperCase().trim();

    log("🔍 Checking if partner exists:", emailLower);

    // ✅ FIX: Check for orphaned user records
    // First, check if email exists in users table AT ALL
    const { data: existingUserCheck, error: userCheckError } = await supabase
      .from("users")
      .select("user_id, user_type")
      .eq("email", emailLower);

    if (userCheckError) {
      console.error("❌ Error checking existing users:", userCheckError);
      return res.status(500).json({ error: "Database error" });
    }

    if (existingUserCheck && existingUserCheck.length > 0) {
      const existingUser = existingUserCheck[0];

      log("⚠️ Found existing user:", existingUser);

      // Check if this is an orphaned partner user (in users table but not in partners table)
      if (existingUser.user_type === "partner") {
        const { data: partnerProfile, error: partnerError } = await supabase
          .from("partners")
          .select("partner_id")
          .eq("user_id", existingUser.user_id)
          .single();

        if (partnerError && partnerError.code === "PGRST116") {
          // This is an orphaned user - has user record but no partner profile
          log(
            "🔧 Found orphaned user record - attempting to create partner profile"
          );

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
            .from("partners")
            .insert([partnerData])
            .select()
            .single();

          if (createPartnerError) {
            console.error(
              "❌ Failed to create partner profile:",
              createPartnerError
            );
            return res.status(500).json({
              error: "Failed to complete registration",
              details: "Please contact support to fix your account",
            });
          }

          log(
            "✅ Successfully created partner profile for orphaned user"
          );

          return res.json({
            success: true,
            message: "Registration completed successfully",
            redirect: "/partner-signin?registered=true",
          });
        } else if (!partnerError) {
          // Partner already exists completely
          log("❌ Partner already exists completely");
          return res.status(409).json({ error: "Partner already exists" });
        }
      } else {
        // Email exists but for a different user type
        log("❌ Email already registered as", existingUser.user_type);
        return res.status(409).json({
          error: `This email is already registered as a ${existingUser.user_type}`,
        });
      }
    }

    log("✅ No existing user found - proceeding with new registration");

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

    log("💾 Creating partner in database...");

    // Create user in database
    const newUser = await createUser(userData, "partner");

    log("✅ Partner created successfully:", {
      partner_id: newUser.partner_id,
      email: newUser.email,
    });

    return res.json({
      success: true,
      message: "Registration successful",
      redirect: "/partner-signin?registered=true",
    });
  } catch (error) {
    console.error("❌ Partner registration error:", error);
    console.error("Error stack:", error.stack);

    // Better error message for duplicate key
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Email already registered",
        details:
          "This email is already in use. Please sign in or use a different email.",
      });
    }

    return res.status(500).json({
      error: "Registration failed",
      details: error.message,
    });
  }
});

app.post(
  "/api/admin/cleanup-orphans",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      log("🧹 Starting orphan cleanup...");

      // Find all users in users table
      const { data: allUsers, error: usersError } = await supabase
        .from("users")
        .select("user_id, email, user_type");

      if (usersError) {
        throw usersError;
      }

      const orphans = [];

      // Check each user
      for (const user of allUsers) {
        let roleTable, roleIdField;

        if (user.user_type === "ambassador") {
          roleTable = "ambassadors";
          roleIdField = "user_id";
        } else if (user.user_type === "partner") {
          roleTable = "partners";
          roleIdField = "user_id";
        } else if (user.user_type === "admin") {
          roleTable = "admins";
          roleIdField = "user_id";
        } else {
          continue;
        }

        // Check if role record exists
        const { data: roleRecord, error: roleError } = await supabase
          .from(roleTable)
          .select("*")
          .eq(roleIdField, user.user_id)
          .single();

        // If no role record found, this is an orphan
        if (roleError && roleError.code === "PGRST116") {
          orphans.push({
            user_id: user.user_id,
            email: user.email,
            user_type: user.user_type,
          });
        }
      }

      if (orphans.length === 0) {
        return res.json({
          message: "No orphaned records found",
          orphans: [],
        });
      }

      log(`⚠️ Found ${orphans.length} orphaned user records`);

      return res.json({
        message: `Found ${orphans.length} orphaned records`,
        orphans: orphans,
        suggestion: "You can delete these records or complete their profiles",
      });
    } catch (error) {
      console.error("❌ Cleanup error:", error);
      return res.status(500).json({ error: error.message });
    }
  }
);
app.delete(
  "/api/admin/cleanup-orphan/:user_id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const userId = req.params.user_id;

      log("🗑️ Deleting orphaned user:", userId);

      // Delete from users table (this will cascade if there are any related records)
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      log("✅ Orphaned user deleted:", userId);

      return res.json({
        success: true,
        message: "Orphaned user deleted successfully",
      });
    } catch (error) {
      console.error("❌ Delete error:", error);
      return res.status(500).json({ error: error.message });
    }
  }
);

// ------------------------
// Admin Registration Endpoint
// ------------------------
app.post("/register/admin", async (req, res) => {
  try {
    const { email, accessCode, password, name } = req.body || {};
    log("Admin registration attempt:", { email, accessCode, name });

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

    log("Admin created successfully:", newUser.admin_id);

    return res.json({
      success: true,
      message: "Admin registration successful",
      redirect: "/admin-signin.html?registered=true",
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

    log("Sign-in attempt:", { email, access_code });

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
      log(`Sign-in failed: User not found - ${emailLower}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify access code
    if (user.access_code !== access_codeUpper) {
      log(`Sign-in failed: Invalid access code - ${emailLower}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const computedHash = hashPassword(password, user.salt);
    if (computedHash !== user.password_hash) {
      log(`Sign-in failed: Invalid password - ${emailLower}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ✅ FIXED: Check status (normalized data already has status from users table)
    if (user.status !== "active") {
      log(`Sign-in failed: Account inactive - ${emailLower}`);
      return res
        .status(403)
        .json({ error: "Your account is not active. Please contact support." });
    }

    // Create session using user_id from normalized data
    const sessionId = await createSessionEnhanced(
      res,
      user.user_id, // ✅ MUST USE user_id, NOT ambassador_id
      "ambassador",
      Boolean(rememberMe)
    );

    log(`Ambassador signed in: ${emailLower}, Session: ${sessionId}`);

    // Decide where to send the ambassador after sign-in.
    // If they haven't completed About Me (headline + summary + consent),
    // send them there; otherwise go straight to the dashboard.
    const hasCompletedProfile =
      user.professional_headline &&
      user.professional_summary &&
      user.data_sharing_consent;
    const redirectUrl = hasCompletedProfile
      ? "/ambassador-dashboard.html"
      : "/about-me.html";

    log(`Profile complete: ${hasCompletedProfile}, redirecting to: ${redirectUrl}`);

    return res.json({
      success: true,
      message: "Sign in successful",
      redirect: redirectUrl,
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
  log("=== PARTNER SIGNIN REQUEST ===");
  log("Headers:", req.headers);
  log("Body:", req.body);
  log("=== END REQUEST ===");

  try {
    const { email, access_code, password, rememberMe } = req.body || {};

    // Basic validation
    if (!email || !access_code || !password) {
      log("❌ Missing fields");
      return res.status(400).json({ error: "All fields required" });
    }

    const emailLower = email.toLowerCase().trim();
    const access_codeUpper = access_code.toUpperCase().trim();

    log("🔍 Looking for partner:", emailLower);

    // ✅ FIXED: Use getUserByEmail which handles the two-table lookup
    const user = await getUserByEmail(emailLower, "partner");

    if (!user) {
      log("❌ No partner found with email:", emailLower);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    log("✅ Found user:", {
      email: user.email,
      access_code: user.access_code,
      status: user.status,
      partner_id: user.partner_id,
    });

    // Check access code
    if (user.access_code !== access_codeUpper) {
      log("❌ Access code mismatch:", {
        stored: user.access_code,
        provided: access_codeUpper,
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const computedHash = hashPassword(password, user.salt);
    log("Password check:", {
      salt_length: user.salt.length,
      stored_hash: user.password_hash.substring(0, 20) + "...",
      computed_hash: computedHash.substring(0, 20) + "...",
      match: computedHash === user.password_hash,
    });

    if (computedHash !== user.password_hash) {
      log("❌ Password mismatch");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ✅ Check status (comes from users table in the normalized data)
    if (user.status !== "approved") {
      log("❌ Account not approved:", user.status);
      return res.status(403).json({ error: "Account not approved" });
    }

    log("✅ All checks passed - creating session");

    // ✅ CORRECT - using user_id
    const sessionId = await createSessionEnhanced(
      res,
      user.user_id, // Use the user_id from the users table!
      "partner",
      Boolean(rememberMe)
    );

    log("✅ Session created:", sessionId);

    return res.json({
      success: true,
      redirect: "/partner-dashboard.html",
    });
  } catch (error) {
    console.error("❌ SIGNIN ERROR:", error);
    console.error("Stack:", error.stack);
    return res.status(500).json({
      error: "Sign in failed",
      details: error.message,
    });
  }
});

app.post("/admin-signin", async (req, res) => {
  log("=== ADMIN SIGNIN ATTEMPT ===");
  log("Body:", req.body);
  log("Cookies:", req.headers.cookie);
  log("=== END ===");

  try {
    const { email, accessCode, password, rememberMe } = req.body || {};

    log("📝 Step 1: Validation");
    if (!email || !accessCode || !password) {
      log("❌ Validation failed");
      return res
        .status(400)
        .json({ error: "Email, access code, and password are required" });
    }

    const emailLower = String(email).toLowerCase().trim();
    const accessCodeUpper = String(accessCode).toUpperCase().trim();

    // Block deprecated test admin account
    if (emailLower === "admin@test.com") {
      log("❌ Admin sign-in blocked: test account disabled");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    log("📝 Step 2: Looking up admin:", emailLower);

    // ✅ FIXED: Use getUserByEmail which handles the two-table lookup
    const user = await getUserByEmail(emailLower, "admin");

    log("📝 Step 3: User lookup result:", user ? "FOUND" : "NOT FOUND");

    if (!user) {
      log(`❌ Admin sign-in failed: User not found - ${emailLower}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    log("📝 Step 4: Checking access code");
    log("  Stored:", user.access_code);
    log("  Provided:", accessCodeUpper);

    // Verify access code
    if (user.access_code !== accessCodeUpper) {
      log(
        `❌ Admin sign-in failed: Invalid access code - ${emailLower}`
      );
      return res.status(401).json({ error: "Invalid credentials" });
    }

    log("📝 Step 5: Verifying password");
    // Verify password
    const computedHash = hashPassword(password, user.salt);
    log("  Hash match:", computedHash === user.password_hash);

    if (computedHash !== user.password_hash) {
      log(`❌ Admin sign-in failed: Invalid password - ${emailLower}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    log("📝 Step 6: Checking status");
    log("  Status:", user.status);

    // ✅ Check status (normalized data already has status from users table)
    if (user.status !== "active") {
      log(`❌ Admin sign-in failed: Account inactive - ${emailLower}`);
      return res.status(403).json({ error: "Account inactive" });
    }

    log("📝 Step 7: Creating session");
    log("  user_id:", user.user_id);
    log("  role: admin");

    // Create session using user_id from normalized data
    const sessionId = await createSessionEnhanced(
      res,
      user.user_id, // ✅ Use user_id, not admin_id
      "admin",
      Boolean(rememberMe)
    );

    log(`✅ Admin signed in: ${emailLower}, Session: ${sessionId}`);
    log("📝 Step 8: Sending response");

    return res.json({ ok: true, role: "admin" });
  } catch (error) {
    console.error("❌ Admin sign-in error:", error);
    console.error("Stack trace:", error.stack);
    return res.status(500).json({ error: "Sign in failed. Please try again." });
  }
});

// ============================================
// ADMIN: Submit LinkedIn Audit for Ambassador (FINAL FIX)
// ============================================
app.post('/admin/api/ambassadors/:id/linkedin-audit', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const ambassadorId = req.params.id;
    const { url, speaker_bio_url, feedback } = req.body;

    log('📝 Admin submitting LinkedIn audit for:', ambassadorId);

    // Validate input
    if (!url || !feedback) {
      return res.status(400).json({ 
        error: 'LinkedIn URL and feedback are required' 
      });
    }

    // Verify ambassador exists
    const { data: ambassador, error: ambassadorError } = await supabase
      .from('ambassadors')
      .select('*')
      .eq('ambassador_id', ambassadorId)
      .single();

    if (ambassadorError || !ambassador) {
      console.error('❌ Ambassador not found:', ambassadorId);
      return res.status(404).json({ error: 'Ambassador not found' });
    }

    log('✅ Found ambassador:', ambassador.email);

    // Get admin record
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('admin_id')
      .eq('user_id', req.auth.userId)
      .single();

    if (adminError || !adminData) {
      console.error('❌ Admin not found for user_id:', req.auth.userId);
      return res.status(404).json({ error: 'Admin record not found' });
    }

    const adminId = adminData.admin_id;
    const now = new Date().toISOString();

    log('✅ Found admin_id:', adminId);

    // Prepare audit data - SIMPLIFIED VERSION
    const auditPayload = {
      ambassador_id: ambassadorId,
      admin_id: adminId,
      linkedin_url: url,
      feedback: feedback,
      status: 'submitted', // Use 'submitted' which is in the allowed list
      submitted_at: now,
      updated_at: now,
      created_at: now
    };

    // Add speaker_bio_url only if provided
    if (speaker_bio_url && speaker_bio_url.trim() !== '') {
      auditPayload.speaker_bio_url = speaker_bio_url.trim();
    }

    log('💾 Saving audit with payload:', {
      ambassador_id: auditPayload.ambassador_id,
      admin_id: auditPayload.admin_id,
      status: auditPayload.status,
      hasFeedback: !!feedback
    });

    // Check if audit already exists
    const { data: existingAudit } = await supabase
      .from('linkedin_audits')
      .select('audit_id')
      .eq('ambassador_id', ambassadorId)
      .single();

    let auditData, auditError;

    if (existingAudit) {
      // Update existing audit
      log('🔄 Updating existing audit...');
      const result = await supabase
        .from('linkedin_audits')
        .update(auditPayload)
        .eq('ambassador_id', ambassadorId)
        .select()
        .single();
      auditData = result.data;
      auditError = result.error;
    } else {
      // Insert new audit
      log('🆕 Inserting new audit...');
      auditPayload.audit_id = uuidv4(); // Add UUID for new audit
      const result = await supabase
        .from('linkedin_audits')
        .insert([auditPayload])
        .select()
        .single();
      auditData = result.data;
      auditError = result.error;
    }

    if (auditError) {
      console.error('❌ Database error storing audit:', {
        message: auditError.message,
        code: auditError.code,
        details: auditError.details,
        hint: auditError.hint
      });
      
      // Check for specific constraint violations
      if (auditError.code === '23514') {
        return res.status(400).json({ 
          error: 'Invalid status value. Must be one of: pending, submitted, reviewed, completed, approved' 
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to store audit data',
        details: auditError.message
      });
    }

    log('✅ LinkedIn audit stored successfully:', auditData?.audit_id);

    // Notify the ambassador that their LinkedIn audit is ready
    try {
      const ambassadorUserId =
        ambassador.user_id || (await getAmbassadorUserIdFromAmbassadorId(ambassadorId));

      if (ambassadorUserId) {
        await createNotification(
          ambassadorUserId,
          "ambassador",
          "linkedin_audit_submitted",
          "Your LinkedIn profile audit is ready",
          "Your LinkedIn profile has been reviewed. View your audit feedback and recommendations.",
          "/journey.html" // Ambassadors can see audits from their journey page
        );
      } else {
        console.error("⚠️ Could not resolve ambassador user_id for LinkedIn audit notification");
      }
    } catch (notifError) {
      console.error("⚠️ Failed to create LinkedIn audit notification:", notifError?.message || notifError);
    }

    // Transform response for frontend
    const transformedAudit = auditData ? {
      id: auditData.audit_id,
      url: auditData.linkedin_url,
      speaker_bio_url: auditData.speaker_bio_url,
      feedback: auditData.feedback,
      status: auditData.status,
      submittedAt: auditData.submitted_at,
      submitted_by: auditData.submitted_by // Will be null, that's OK
    } : null;

    res.json({
      success: true,
      message: 'LinkedIn audit submitted successfully',
      audit: transformedAudit
    });

  } catch (error) {
    console.error('❌ Unexpected error submitting LinkedIn audit:', error);
    res.status(500).json({ 
      error: 'Failed to submit LinkedIn audit',
      details: error.message 
    });
  }
});

// Get LinkedIn audit for an ambassador
app.get('/admin/api/ambassadors/:id/linkedin-audit', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const ambassadorId = req.params.id;

    const { data, error } = await supabase
      .from('linkedin_audits')
      .select('*')
      .eq('ambassador_id', ambassadorId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error;
    }

    // Transform database fields to match frontend expectations
    const transformedAudit = data ? {
      ...data,
      url: data.linkedin_url, // Map linkedin_url to url for frontend
      submittedAt: data.submitted_at // Map submitted_at to submittedAt for frontend
    } : null;

    res.json({
      hasAudit: !!data,
      audit: transformedAudit
    });

  } catch (error) {
    console.error('❌ Error fetching LinkedIn audit:', error);
    res.status(500).json({ error: 'Failed to fetch audit data' });
  }
});

// Get LinkedIn Audits Count (for admin dashboard stats)
app.get('/admin/api/linkedin-audits/count', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    // Count total LinkedIn audits submitted by admin
    const { count, error } = await supabase
      .from('linkedin_audits')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Error counting LinkedIn audits:', error);
      return res.status(500).json({ error: 'Failed to count audits' });
    }

    log('✅ LinkedIn audits count:', count);
    res.json({ count: count || 0 });
  } catch (error) {
    console.error('❌ Error fetching LinkedIn audit count:', error);
    res.status(500).json({ error: 'Failed to fetch audit count' });
  }
});

// ============================================
// CERTIFICATE UPLOAD & VERIFICATION ENDPOINTS
// FIXED FOR VERCEL - Uses Supabase Storage
// ============================================

// ✅ Retry helper function with exponential backoff
async function retryOperation(operation, maxRetries = 3, delay = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const waitTime = delay * Math.pow(2, attempt - 1); // Exponential backoff
        log(`⚠️ Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  throw lastError;
}

// ✅ Health check for Supabase storage (non-blocking, just logs)
async function checkStorageHealth() {
  try {
    if (!supabase || !supabase.storage) {
      console.error("❌ Supabase storage not initialized");
      return false;
    }
    // Quick check - try to list buckets (this is a lightweight operation)
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      console.warn("⚠️ Storage health check warning:", error.message);
      return false;
    }
    // Check if certificates bucket exists
    const hasCertBucket = data && data.some(bucket => bucket.name === 'certificates');
    if (!hasCertBucket) {
      console.warn("⚠️ Certificates bucket not found in storage");
      return false;
    }
    return true;
  } catch (error) {
    console.warn("⚠️ Storage health check failed:", error.message);
    return false;
  }
}

// Ensure the Supabase Storage bucket for certificates exists (runs on startup)
async function initializeSupabaseStorage() {
  try {
    log("🔧 Initializing Supabase Storage...");

    if (!supabase || !supabase.storage) {
      console.error("❌ Supabase storage not initialized - skipping bucket setup");
      return;
    }

    // List existing buckets
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error("❌ Error listing buckets:", error);
      return;
    }

    // Check if certificates bucket exists
    const certificatesBucket = buckets?.find((b) => b.name === "certificates");

    if (!certificatesBucket) {
      log("📦 Creating 'certificates' bucket...");

      // Create bucket with proper settings
      const { error: createError } = await supabase.storage.createBucket(
        "certificates",
        {
          public: false,
          fileSizeLimit: 10 * 1024 * 1024, // 10MB
          allowedMimeTypes: [
            "image/jpeg",
            "image/png",
            "image/jpg",
            "application/pdf",
          ],
        }
      );

      if (createError) {
        console.error("❌ Error creating 'certificates' bucket:", createError);
      } else {
        log("✅ 'certificates' bucket created successfully");
      }
    } else {
      log("✅ 'certificates' bucket already exists");
    }
  } catch (error) {
    console.error("❌ Storage initialization error:", error);
  }
}

// ✅ Use memory storage instead of disk storage (required for Vercel)
const certificateStorage = multer.memoryStorage();

const certificateUpload = multer({
  storage: certificateStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpg|jpeg|png|pdf/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only JPG, JPEG, PNG, and PDF files are allowed for certificates"
        )
      );
    }
  },
});

// Debug endpoint to check storage setup
app.get('/api/certificates/check-storage', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    log('🔍 Checking Supabase Storage setup...');
    
    // List buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      return res.json({
        success: false,
        error: 'Failed to list buckets',
        details: listError
      });
    }
    
    const certificatesBucket = buckets?.find(b => b.name === 'certificates');
    
    if (!certificatesBucket) {
      return res.json({
        success: false,
        error: 'Certificates bucket not found',
        availableBuckets: buckets?.map(b => b.name) || []
      });
    }
    
    return res.json({
      success: true,
      bucket: certificatesBucket,
      message: 'Certificates bucket exists'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ambassador: upload certificate for a specific course
app.post(
  "/api/certificates/upload",
  requireAuth,
  requireRole("ambassador"),
  (req, res, next) => {
    log('📤 Certificate upload request received');
    log('   User:', req.auth.userId);
    log('   Role:', req.auth.role);
    
    certificateUpload.single("certificate")(req, res, (err) => {
      if (err) {
        console.error("❌ Multer error:", err.message);
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            error: "File too large",
            details: "Maximum file size is 10MB",
          });
        }
        return res.status(400).json({
          success: false,
          error: "File upload failed",
          details: err.message,
        });
      }
      
      log('✅ Multer completed');
      log('   File:', req.file ? req.file.filename : 'No file');
      next();
    });
  },
  async (req, res) => {
    log('🔄 Processing certificate upload...');
    
    try {
      const userId = req.auth.userId;
      const { courseType } = req.body;

      log('📋 Upload details:', {
        userId,
        courseType,
        hasFile: !!req.file,
        fileSize: req.file?.size,
        fileType: req.file?.mimetype
      });

      // Validate inputs
      if (!userId) {
        console.error('❌ No userId');
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      const validCourseTypes = [
        "linkedin_course",
        "transformational_course",
        "science_of_you",
        "ai_stacking",
      ];

      if (!courseType || !validCourseTypes.includes(courseType)) {
        console.error('❌ Invalid course type:', courseType);
        return res.status(400).json({
          success: false,
          error: "Invalid course type",
          validTypes: validCourseTypes,
        });
      }

      if (!req.file || !req.file.buffer) {
        console.error('❌ No file buffer');
        return res.status(400).json({ 
          success: false, 
          error: "No file uploaded or file buffer is missing" 
        });
      }

      // Get ambassador
      log('🔍 Looking up ambassador...');
      const ambassador = await getUserById(userId, "ambassador");

      if (!ambassador) {
        console.error('❌ Ambassador not found');
        return res.status(404).json({ error: "Ambassador not found" });
      }

      const ambassadorId = ambassador.ambassador_id || ambassador.id;
      log('✅ Found ambassador:', ambassadorId);

      // Generate unique filename
      const fileExt = path.extname(req.file.originalname) || '.pdf';
      const timestamp = Date.now();
      const randomSuffix = crypto.randomBytes(4).toString('hex');
      const uniqueFilename = `cert_${ambassadorId}_${courseType}_${timestamp}_${randomSuffix}${fileExt}`;

      log("📤 Uploading to Supabase Storage:", uniqueFilename);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("certificates")
        .upload(uniqueFilename, req.file.buffer, {
          contentType: req.file.mimetype || 'application/octet-stream',
          upsert: false,
        });
      
      if (uploadError) {
        console.error("❌ Supabase upload error:", uploadError);
        return res.status(500).json({
          success: false,
          error: "Storage upload failed",
          details: uploadError.message
        });
      }

      log("✅ File uploaded to Supabase:", uploadData.path);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("certificates")
        .getPublicUrl(uniqueFilename);

      // Check for existing certificate
      const existingCert = await supabase
        .from("certificates")
        .select("*")
        .eq("ambassador_id", ambassadorId)
        .eq("course_type", courseType)
        .maybeSingle();

      // Delete old file if exists
      if (existingCert.data && existingCert.data.filename) {
        try {
          await supabase.storage
            .from("certificates")
            .remove([existingCert.data.filename]);
          log("✅ Old certificate file removed");
        } catch (deleteError) {
          console.warn("⚠️ Failed to delete old file:", deleteError);
        }
      }

      const now = new Date().toISOString();
      const certificateData = {
        certificate_id: existingCert.data?.certificate_id || uuidv4(),
        ambassador_id: ambassadorId,
        course_type: courseType,
        filename: uniqueFilename,
        original_name: req.file.originalname,
        file_size: req.file.size,
        upload_date: now,
        verified: existingCert.data?.verified || false,
        created_at: existingCert.data?.created_at || now,
        updated_at: now,
      };

      // Save to database
      let savedCert;
      if (existingCert.data) {
        const { data, error } = await supabase
          .from("certificates")
          .update(certificateData)
          .eq("certificate_id", existingCert.data.certificate_id)
          .select()
          .single();
        if (error) throw error;
        savedCert = data;
      } else {
        const { data, error } = await supabase
          .from("certificates")
          .insert([certificateData])
          .select()
          .single();
        if (error) throw error;
        savedCert = data;
      }

      log("✅ Certificate saved to database:", savedCert.certificate_id);

      // ✅ Notify admins (non-critical, don't fail if this fails)
      try {
        const { data: admins } = await supabase.from("admins").select("user_id");
        if (admins && admins.length > 0) {
          const ambassadorName = `${ambassador.first_name || ""} ${
            ambassador.last_name || ""
          }`.trim() || "An ambassador";
          const courseName = courseType
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());

          // Send notifications in parallel, don't wait for all
          Promise.all(
            admins.map(admin =>
              createNotification(
                admin.user_id,
                "admin",
                "certificate_uploaded",
                "📜 New Certificate Uploaded",
                `${ambassadorName} uploaded a certificate for ${courseName}`,
                "/admin-dashboard.html",
                null,
                null,
                null,
                savedCert.certificate_id
              ).catch(err => console.warn(`⚠️ Failed to notify admin ${admin.user_id}:`, err.message))
            )
          ).catch(err => console.warn("⚠️ Notification batch failed:", err.message));
        }
      } catch (e) {
        console.warn("⚠️ Failed to send admin notifications (non-critical):", e?.message);
      }

      return res.json({
        success: true,
        certificate: {
          id: savedCert.certificate_id,
          courseType: savedCert.course_type,
          filename: savedCert.filename,
          uploadDate: savedCert.upload_date,
          verified: savedCert.verified,
          url: publicUrl,
        },
        message: "Certificate uploaded successfully",
      });
    } catch (error) {
      console.error("❌ Unexpected certificate upload error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to upload certificate",
        details: error.message,
      });

      // ✅ Provide helpful error messages based on error type
      let errorMessage = "Failed to upload certificate";
      let errorDetails = error.message || String(error);
      let statusCode = 500;

      // Network errors
      if (
        errorDetails.includes("timeout") ||
        errorDetails.includes("ETIMEDOUT")
      ) {
        errorMessage = "Upload timed out";
        errorDetails =
          "The upload took too long. Please check your connection and try again.";
        statusCode = 408;
      }
      // Connection errors
      else if (
        errorDetails.includes("network") ||
        errorDetails.includes("ECONNREFUSED")
      ) {
        errorMessage = "Network error";
        errorDetails =
          "Cannot connect to storage service. Please check your internet connection.";
        statusCode = 503;
      }
      // Storage errors
      else if (
        errorDetails.includes("Storage bucket") ||
        errorDetails.includes("bucket configuration")
      ) {
        errorMessage = "Storage unavailable";
        errorDetails =
          "Storage service is temporarily unavailable. Please try again in a few minutes.";
        statusCode = 503;
      }
      // Quota errors
      else if (
        errorDetails.includes("quota") ||
        errorDetails.includes("rate limit")
      ) {
        errorMessage = "Upload limit reached";
        errorDetails =
          "Too many uploads. Please wait a few minutes before trying again.";
        statusCode = 429;
      }

      const responseDetails =
        process.env.NODE_ENV === "development" ? errorDetails : undefined;

      return res.status(statusCode).json({
        success: false,
        error: errorMessage,
        details: responseDetails,
      });
    }
  }
);

// Ambassador: get own certificates
app.get(
  "/api/certificates",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const userId = req.auth.userId;
      const ambassador = await getUserById(userId, "ambassador");

      if (!ambassador) {
        return res.status(404).json({ error: "Ambassador not found" });
      }

      const ambassadorId = ambassador.ambassador_id || ambassador.id;

      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("ambassador_id", ambassadorId)
        .order("upload_date", { ascending: false });

      if (error) {
        console.error("❌ Error fetching certificates:", error);
        return res.status(500).json({
          error: "Failed to fetch certificates",
          details: error.message,
        });
      }

      return res.json({
        success: true,
        certificates: data || [],
      });
    } catch (error) {
      console.error("❌ Unexpected error fetching certificates:", error);
      return res.status(500).json({
        error: "Failed to fetch certificates",
        details: error.message,
      });
    }
  }
);

// Serve certificate files (protected) - FIXED FOR VERCEL
app.get(
  "/uploads/certificates/:filename",
  requireAuth,
  async (req, res) => {
    try {
      const filename = req.params.filename;

      // ✅ Get signed URL from Supabase Storage
      const { data, error } = await supabase.storage
        .from("certificates")
        .createSignedUrl(filename, 3600); // Valid for 1 hour

      if (error || !data) {
        console.error("❌ Supabase signed URL error:", error);
        return res.status(404).json({ error: "Certificate not found" });
      }

      // Return the signed URL as JSON so frontend can use it directly
      return res.json({ 
        success: true, 
        url: data.signedUrl 
      });
    } catch (error) {
      console.error("❌ Error serving certificate:", error);
      return res.status(500).json({ error: "Failed to retrieve certificate" });
    }
  }
);

// Admin: verify or reject certificate
app.patch(
  "/admin/api/certificates/:id/verify",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const certificateId = req.params.id;
      const { verified } = req.body;
      const adminUserId = req.auth.userId;

      const { data: admin, error: adminError } = await supabase
        .from("admins")
        .select("admin_id")
        .eq("user_id", adminUserId)
        .single();

      if (adminError || !admin) {
        return res.status(404).json({ error: "Admin not found" });
      }

      const now = new Date().toISOString();
      const updates = {
        verified: verified === true,
        verified_by: verified ? admin.admin_id : null,
        verified_at: verified ? now : null,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from("certificates")
        .update(updates)
        .eq("certificate_id", certificateId)
        .select()
        .single();

      if (error) {
        console.error("❌ Error updating certificate verification:", error);
        return res.status(500).json({
          error: "Failed to update certificate verification",
          details: error.message,
        });
      }

      return res.json({
        success: true,
        certificate: data,
        message: `Certificate ${verified ? "verified" : "rejected"} successfully`,
      });
    } catch (error) {
      console.error("❌ Unexpected error verifying certificate:", error);
      return res.status(500).json({
        error: "Failed to verify certificate",
        details: error.message,
      });
    }
  }
);

// Admin: list certificates with optional filters
app.get(
  "/admin/api/certificates",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { verified, courseType } = req.query;

      let query = supabase
        .from("certificates")
        .select(
          `
          *,
          ambassadors!inner (
            first_name,
            last_name,
            email
          )
        `
        )
        .order("upload_date", { ascending: false });

      if (verified !== undefined) {
        query = query.eq("verified", verified === "true");
      }

      if (courseType) {
        query = query.eq("course_type", courseType);
      }

      const { data, error } = await query;

      if (error) {
        console.error("❌ Error fetching certificates for admin:", error);
        return res.status(500).json({
          error: "Failed to fetch certificates",
          details: error.message,
        });
      }

      const formatted =
        data?.map((cert) => ({
          ...cert,
          ambassadorName: `${cert.ambassadors.first_name || ""} ${
            cert.ambassadors.last_name || ""
          }`.trim(),
          ambassadorEmail: cert.ambassadors.email,
        })) || [];

      return res.json({
        success: true,
        certificates: formatted,
        total: formatted.length,
      });
    } catch (error) {
      console.error("❌ Unexpected error fetching admin certificates:", error);
      return res.status(500).json({
        error: "Failed to fetch certificates",
        details: error.message,
      });
    }
  }
);

// ============================================
// AMBASSADOR: Get Own LinkedIn Audit
// ============================================
app.get(
  "/api/journey/linkedin-audit",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const userId = req.auth.userId;

      log("📖 Ambassador fetching LinkedIn audit for user:", userId);

      // First, get the ambassador's actual ambassador_id from the ambassadors table
      // The userId from auth might be different from the ambassador_id
      const ambassador = await getUserById(userId, "ambassador");
      
      if (!ambassador) {
        log("❌ Ambassador not found for user:", userId);
        return res.json({
          hasAudit: false,
          audit: null
        });
      }

      // Use the ambassador's actual ID (ambassador_id field or id field)
      const ambassadorId = ambassador.ambassador_id || ambassador.id;
      log("🔍 Looking for audit with ambassador_id:", ambassadorId);

      // Fetch directly from linkedin_audits table (where admin submits)
      const { data, error } = await supabase
        .from('linkedin_audits')
        .select('*')
        .eq('ambassador_id', ambassadorId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is OK
        console.error("❌ Error fetching LinkedIn audit:", error);
        throw error;
      }

      if (!data) {
        log("📭 No LinkedIn audit found for ambassador:", ambassadorId);
        return res.json({
          hasAudit: false,
          audit: null
        });
      }

      log("✅ LinkedIn audit found for ambassador:", ambassadorId);
      return res.json({
        hasAudit: true,
        audit: {
          linkedin_url: data.linkedin_url,
          speaker_bio_url: data.speaker_bio_url,
          feedback: data.feedback,
          status: data.status,
          submittedAt: data.submitted_at,
          updatedAt: data.updated_at
        }
      });
    } catch (error) {
      console.error("❌ Error fetching LinkedIn audit:", error);
      return res.status(500).json({
        error: "Failed to fetch LinkedIn audit",
        details: error.message,
      });
    }
  }
);

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
        log("User not found in database, redirecting to signin");
        return res.redirect("/signin");
      }

    // Check if professional profile is complete - redirect to about-me if not.
    // Once headline & summary are saved, About Me should not be shown again.
    if (!user.professional_headline || !user.professional_summary) {
        log("Profile incomplete, redirecting to about-me");
        return res.redirect("/about-me.html");
      }

      log("User authenticated successfully:", user.email);
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
        log("Partner not found in database, redirecting to signin");
        return res.redirect("/partner-signin");
      }
      log("Partner authenticated successfully:", user.email);
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
        log("Partner not found in database, redirecting to signin");
        return res.redirect("/partner-signin");
      }
      log("Partner authenticated for applications page:", user.email);
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
        log("Admin not found in database, redirecting to signin");
        return res.redirect("/admin-signin.html");
      }
      log("Admin authenticated successfully:", user.email);
      res.sendFile(path.join(__dirname, "public", "admin-dashboard.html"));
    } catch (error) {
      console.error("Admin dashboard auth error:", error);
      return res.redirect("/admin-signin.html");
    }
  }
);

// Profile page - redirect to role-specific version
app.get("/profile.html", requireAuth, async (req, res) => {
  try {
    const user = await getUserById(req.auth.userId, req.auth.role);
    if (!user) {
      return res.redirect("/signin");
    }
    // Redirect to role-specific profile page
    if (user.role === "partner") {
      return res.redirect("/profile-partner.html");
    } else if (user.role === "ambassador") {
      return res.redirect("/profile-ambassador.html");
    } else {
      return res.redirect("/signin");
    }
  } catch (error) {
    console.error("Error serving profile page:", error);
    return res.redirect("/signin");
  }
});

// Profile - Ambassador version
app.get("/profile-ambassador.html", requireAuth, requireRole("ambassador"), (req, res) => {
  res.sendFile(path.join(__dirname, "public", "profile-ambassador.html"));
});

// Profile - Partner version
app.get("/profile-partner.html", requireAuth, requireRole("partner"), (req, res) => {
  res.sendFile(path.join(__dirname, "public", "profile-partner.html"));
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

app.get("/Partner-Calls.html", requireAuth, requireRole("partner"), (req, res) => {
  res.sendFile(path.join(__dirname, "public", "Partner-Calls.html"));
});

app.get("/journey.html", requireAuth, requireRole("ambassador"), (req, res) => {
  res.sendFile(path.join(__dirname, "public", "journey.html"));
});

// Impact Log - Ambassador version
app.get("/impactlog-ambassador.html", requireAuth, requireRole("ambassador"), (req, res) => {
  res.sendFile(path.join(__dirname, "public", "impactlog-ambassador.html"));
});

// Impact Log - Partner version
app.get("/impactlog-partner.html", requireAuth, requireRole("partner"), (req, res) => {
  res.sendFile(path.join(__dirname, "public", "impactlog-partner.html"));
});

// Public event participation page (no auth required)
app.get("/event/:slug", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "event-participate.html"));
});

// ============================================
// IMPACT LOG API ENDPOINTS
// ============================================

// Helper: Generate a random slug for public event links
function generateSlug(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper: Calculate SCP for an impact entry
function calculateSCP(entry) {
  const base = (entry.people_impacted || 0) + (entry.hours_contributed || 0) * 2 + (entry.usd_value || 0) * 0.01;
  const multiplier = entry.verification_multiplier || 1.0;
  return Math.round(base * multiplier * 100) / 100;
}

// Helper: Check if user already earned points this month
async function hasEarnedPointsThisMonth(userId, month) {
  const { data } = await supabase
    .from('impact_entries')
    .select('entry_id')
    .eq('user_id', userId)
    .eq('points_month', month)
    .gt('points_earned', 0)
    .limit(1);
  return data && data.length > 0;
}

// ---- GET /api/impact/entries - List impact entries for current user ----
app.get("/api/impact/entries", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { esg_category, entry_type, limit: lim, offset: off } = req.query;

    let query = supabase
      .from('impact_entries')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (esg_category) query = query.eq('esg_category', esg_category);
    if (entry_type) query = query.eq('entry_type', entry_type);

    const limit = parseInt(lim) || 20;
    const offset = parseInt(off) || 0;

    query = query.order('created_at', { ascending: false })
                 .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ entries: data || [], total: count || 0, limit, offset });
  } catch (error) {
    console.error('Error fetching impact entries:', error);
    res.status(500).json({ error: 'Failed to fetch impact entries' });
  }
});

// ---- GET /api/impact/stats - Get aggregated impact stats for current user ----
app.get("/api/impact/stats", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;

    const { data: entries, error } = await supabase
      .from('impact_entries')
      .select('people_impacted, hours_contributed, usd_value, scp_earned, points_earned, esg_category, verification_level, entry_type')
      .eq('user_id', userId);

    if (error) throw error;

    const stats = {
      total_people_impacted: 0,
      total_hours: 0,
      total_usd_value: 0,
      total_scp: 0,
      total_points: 0,
      total_entries: (entries || []).length,
      by_esg: { environmental: 0, social: 0, governance: 0 },
      by_tier: { tier_1: 0, tier_2: 0, tier_3: 0, tier_4: 0 },
      events_participated: 0
    };

    (entries || []).forEach(e => {
      stats.total_people_impacted += e.people_impacted || 0;
      stats.total_hours += parseFloat(e.hours_contributed) || 0;
      stats.total_usd_value += parseFloat(e.usd_value) || 0;
      stats.total_scp += parseFloat(e.scp_earned) || 0;
      stats.total_points += e.points_earned || 0;
      if (e.esg_category) stats.by_esg[e.esg_category] = (stats.by_esg[e.esg_category] || 0) + (e.people_impacted || 0);
      if (e.verification_level) stats.by_tier[e.verification_level] = (stats.by_tier[e.verification_level] || 0) + 1;
      if (e.entry_type === 'event_derived') stats.events_participated++;
    });

    res.json(stats);
  } catch (error) {
    console.error('Error fetching impact stats:', error);
    res.status(500).json({ error: 'Failed to fetch impact stats' });
  }
});

// ---- POST /api/impact/entries - Create individual impact entry ----
app.post("/api/impact/entries", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const role = req.auth.role;
    const {
      title, description, esg_category,
      people_impacted, hours_contributed, usd_value,
      impact_unit, activity_date, evidence_url,
      external_verifier_email
    } = req.body;

    if (!title || !esg_category) {
      return res.status(400).json({ error: 'Title and ESG category are required' });
    }

    const actDate = activity_date ? new Date(activity_date) : new Date();
    const isPastDated = actDate < new Date(new Date().toDateString());
    const verificationLevel = isPastDated ? 'tier_1' : (evidence_url ? 'tier_3' : 'tier_1');
    const verificationMultiplier = verificationLevel === 'tier_1' ? 1.0 : verificationLevel === 'tier_2' ? 1.5 : verificationLevel === 'tier_3' ? 2.0 : 2.5;

    // Points: Regular users earn 1 point per month for first entry
    const pointsMonth = `${actDate.getFullYear()}-${String(actDate.getMonth() + 1).padStart(2, '0')}`;
    let pointsEarned = 0;
    if (role !== 'ambassador' && role !== 'partner') {
      const alreadyEarned = await hasEarnedPointsThisMonth(userId, pointsMonth);
      if (!alreadyEarned) pointsEarned = 1;
    }

    const entryData = {
      entry_id: uuidv4(),
      user_id: userId,
      user_role: role === 'admin' ? 'user' : role,
      entry_type: 'individual',
      title,
      description: description || '',
      esg_category,
      people_impacted: parseInt(people_impacted) || 0,
      hours_contributed: parseFloat(hours_contributed) || 0,
      usd_value: parseFloat(usd_value) || 0,
      impact_unit: impact_unit || 'people',
      activity_date: actDate.toISOString().split('T')[0],
      is_past_dated: isPastDated,
      verification_level: verificationLevel,
      verification_multiplier: verificationMultiplier,
      evidence_url: evidence_url || null,
      external_verifier_email: external_verifier_email || null,
      points_earned: pointsEarned,
      points_month: pointsMonth,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Calculate SCP
    entryData.scp_earned = calculateSCP(entryData);

    const { data, error } = await supabase
      .from('impact_entries')
      .insert([entryData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ entry: data, message: 'Impact entry created successfully' });
  } catch (error) {
    console.error('Error creating impact entry:', error);
    res.status(500).json({ error: 'Failed to create impact entry' });
  }
});

// ---- DELETE /api/impact/entries/:id - Delete impact entry ----
app.delete("/api/impact/entries/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const entryId = req.params.id;

    // Verify ownership
    const { data: entry } = await supabase
      .from('impact_entries')
      .select('user_id, entry_type')
      .eq('entry_id', entryId)
      .single();

    if (!entry || entry.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this entry' });
    }

    if (entry.entry_type === 'event_derived') {
      return res.status(400).json({ error: 'Cannot delete event-derived entries' });
    }

    const { error } = await supabase
      .from('impact_entries')
      .delete()
      .eq('entry_id', entryId);

    if (error) throw error;

    res.json({ message: 'Impact entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting impact entry:', error);
    res.status(500).json({ error: 'Failed to delete impact entry' });
  }
});

// ---- GET /api/impact/events - List impact events ----
app.get("/api/impact/events", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { filter, status: eventStatus } = req.query;

    let query = supabase.from('impact_events').select('*', { count: 'exact' });

    if (filter === 'mine') {
      query = query.eq('created_by', userId);
    }
    if (eventStatus) {
      query = query.eq('status', eventStatus);
    }

    query = query.order('created_at', { ascending: false }).limit(50);

    const { data, error, count } = await query;
    if (error) throw error;

    // For each event, get participant count
    const eventsWithCounts = await Promise.all((data || []).map(async (event) => {
      const { count: pCount } = await supabase
        .from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.event_id);
      return { ...event, participant_count: pCount || 0 };
    }));

    res.json({ events: eventsWithCounts, total: count || 0 });
  } catch (error) {
    console.error('Error fetching impact events:', error);
    res.status(500).json({ error: 'Failed to fetch impact events' });
  }
});

// ---- GET /api/impact/events/public/:slug - Get event by public slug (no auth) ----
// NOTE: This MUST be defined before /api/impact/events/:id to prevent "public" matching as :id
app.get("/api/impact/events/public/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;

    const { data: event, error } = await supabase
      .from('impact_events')
      .select('*')
      .eq('public_slug', slug)
      .single();

    if (error || !event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get participant count
    const { count } = await supabase
      .from('event_participants')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.event_id);

    // Get creator name
    let creatorName = 'Transformation Leader';
    if (event.creator_role === 'ambassador') {
      const { data: amb } = await supabase.from('ambassadors').select('first_name, last_name').eq('user_id', event.created_by).single();
      if (amb) creatorName = `${amb.first_name || ''} ${amb.last_name || ''}`.trim();
    } else if (event.creator_role === 'partner') {
      const { data: part } = await supabase.from('partners').select('organization_name').eq('user_id', event.created_by).single();
      if (part) creatorName = part.organization_name;
    }

    res.json({
      event: {
        event_id: event.event_id,
        title: event.title,
        description: event.description,
        esg_category: event.esg_category,
        total_impact_value: event.total_impact_value,
        impact_unit: event.impact_unit,
        event_date: event.event_date,
        start_time: event.start_time,
        end_time: event.end_time,
        status: event.status,
        creator_name: creatorName,
        public_slug: event.public_slug
      },
      participant_count: count || 0
    });
  } catch (error) {
    console.error('Error fetching public event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// ---- GET /api/impact/events/:id - Get single event details ----
app.get("/api/impact/events/:id", async (req, res) => {
  try {
    const eventId = req.params.id;

    const { data: event, error } = await supabase
      .from('impact_events')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (error || !event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get participants
    const { data: participants, count } = await supabase
      .from('event_participants')
      .select('*', { count: 'exact' })
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    // Get creator info
    let creatorName = 'Unknown';
    if (event.creator_role === 'ambassador') {
      const { data: amb } = await supabase.from('ambassadors').select('first_name, last_name').eq('user_id', event.created_by).single();
      if (amb) creatorName = `${amb.first_name || ''} ${amb.last_name || ''}`.trim();
    } else if (event.creator_role === 'partner') {
      const { data: part } = await supabase.from('partners').select('organization_name').eq('user_id', event.created_by).single();
      if (part) creatorName = part.organization_name;
    }

    res.json({
      event: { ...event, creator_name: creatorName },
      participants: participants || [],
      participant_count: count || 0
    });
  } catch (error) {
    console.error('Error fetching event details:', error);
    res.status(500).json({ error: 'Failed to fetch event details' });
  }
});

// ---- POST /api/impact/events - Create shared impact event ----
app.post("/api/impact/events", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const role = req.auth.role;

    if (role !== 'ambassador' && role !== 'partner' && role !== 'admin') {
      return res.status(403).json({ error: 'Only ambassadors, partners, and admins can create events' });
    }

    const {
      title, description, esg_category,
      total_impact_value, impact_unit,
      event_date, start_time, end_time,
      expected_participants, evidence_url,
      external_verifier_email
    } = req.body;

    if (!title || !esg_category || !total_impact_value || !event_date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing required fields: title, esg_category, total_impact_value, event_date, start_time, end_time' });
    }

    const slug = generateSlug(8);

    const eventData = {
      event_id: uuidv4(),
      created_by: userId,
      creator_role: role,
      title,
      description: description || '',
      esg_category,
      total_impact_value: parseInt(total_impact_value),
      impact_unit: impact_unit || 'people',
      event_date,
      start_time,
      end_time,
      status: 'open',
      verification_level: 'tier_2',
      verification_multiplier: 1.5,
      expected_participants: expected_participants ? parseInt(expected_participants) : null,
      evidence_url: evidence_url || null,
      external_verifier_email: external_verifier_email || null,
      public_slug: slug,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('impact_events')
      .insert([eventData])
      .select()
      .single();

    if (error) throw error;

    // Create master impact entry for the creator
    const masterEntry = {
      entry_id: uuidv4(),
      user_id: userId,
      user_role: role,
      entry_type: 'event_master',
      event_id: data.event_id,
      title: `[Event] ${title}`,
      description: description || '',
      esg_category,
      people_impacted: parseInt(total_impact_value),
      hours_contributed: 0,
      usd_value: 0,
      impact_unit: impact_unit || 'people',
      activity_date: event_date,
      verification_level: 'tier_2',
      verification_multiplier: 1.5,
      scp_earned: 0,
      points_earned: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    masterEntry.scp_earned = calculateSCP(masterEntry);

    await supabase.from('impact_entries').insert([masterEntry]);

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    res.status(201).json({
      event: data,
      public_link: `${baseUrl}/event/${slug}`,
      message: 'Shared impact event created successfully'
    });
  } catch (error) {
    console.error('Error creating impact event:', error);
    res.status(500).json({ error: 'Failed to create impact event' });
  }
});

// ---- POST /api/impact/events/:id/participate - Join an event ----
app.post("/api/impact/events/:id/participate", async (req, res) => {
  try {
    const eventId = req.params.id;
    const { display_name, anonymous_hash } = req.body;

    // Get event
    const { data: event, error: eventError } = await supabase
      .from('impact_events')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status === 'closed') {
      return res.status(400).json({ error: 'This event is closed. Participation is no longer possible.' });
    }

    // Determine participant identity
    let userId = null;
    let participantType = 'anonymous';
    let anonHash = anonymous_hash || null;

    // Check if user is authenticated
    const sess = await getSession(req);
    if (sess && sess.userId) {
      userId = sess.userId;
      participantType = 'user';

      // Check for duplicate
      const { data: existing } = await supabase
        .from('event_participants')
        .select('participant_id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .limit(1);

      if (existing && existing.length > 0) {
        return res.status(409).json({ error: 'You have already registered for this event', already_registered: true });
      }
    } else {
      // Anonymous participant
      if (!anonHash) {
        anonHash = crypto.createHash('sha256').update(`${req.ip}-${req.headers['user-agent']}-${Date.now()}`).digest('hex').substring(0, 32);
      }

      // Check for duplicate anonymous
      const { data: existingAnon } = await supabase
        .from('event_participants')
        .select('participant_id')
        .eq('event_id', eventId)
        .eq('anonymous_hash', anonHash)
        .limit(1);

      if (existingAnon && existingAnon.length > 0) {
        return res.status(409).json({ error: 'You have already registered for this event', already_registered: true });
      }
    }

    const participantData = {
      participant_id: uuidv4(),
      event_id: eventId,
      user_id: userId,
      participant_type: participantType,
      anonymous_hash: anonHash,
      display_name: display_name || null,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('event_participants')
      .insert([participantData])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'You have already registered for this event', already_registered: true });
      }
      throw error;
    }

    res.status(201).json({
      participant: data,
      message: 'Successfully registered for the event!'
    });
  } catch (error) {
    console.error('Error participating in event:', error);
    res.status(500).json({ error: 'Failed to register for event' });
  }
});

// ---- POST /api/impact/events/:id/close - Close an event and calculate impact ----
app.post("/api/impact/events/:id/close", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const eventId = req.params.id;

    // Verify ownership
    const { data: event } = await supabase
      .from('impact_events')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.created_by !== userId && req.auth.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to close this event' });
    }
    if (event.status === 'closed') {
      return res.status(400).json({ error: 'Event is already closed' });
    }

    // Get all participants
    const { data: participants } = await supabase
      .from('event_participants')
      .select('*')
      .eq('event_id', eventId);

    const participantCount = (participants || []).length;
    const perParticipantImpact = participantCount > 0 ? Math.round((event.total_impact_value / participantCount) * 100) / 100 : 0;

    // Update event
    const { error: updateError } = await supabase
      .from('impact_events')
      .update({
        status: 'closed',
        actual_participants: participantCount,
        per_participant_impact: perParticipantImpact,
        updated_at: new Date().toISOString()
      })
      .eq('event_id', eventId);

    if (updateError) throw updateError;

    // Create derived impact entries for each logged-in participant
    const derivedEntries = [];
    for (const p of (participants || [])) {
      if (p.user_id) {
        // Determine participant's role
        const { data: userData } = await supabase.from('users').select('user_type').eq('user_id', p.user_id).single();
        const participantRole = userData?.user_type || 'user';

        // Check points eligibility
        const pointsMonth = `${new Date(event.event_date).getFullYear()}-${String(new Date(event.event_date).getMonth() + 1).padStart(2, '0')}`;
        let pointsEarned = 0;
        if (participantRole !== 'ambassador' && participantRole !== 'partner') {
          const alreadyEarned = await hasEarnedPointsThisMonth(p.user_id, pointsMonth);
          if (!alreadyEarned) pointsEarned = 1;
        }

        const derivedEntry = {
          entry_id: uuidv4(),
          user_id: p.user_id,
          user_role: participantRole === 'admin' ? 'user' : participantRole,
          entry_type: 'event_derived',
          event_id: eventId,
          title: `[Participated] ${event.title}`,
          description: event.description || '',
          esg_category: event.esg_category,
          people_impacted: Math.round(perParticipantImpact),
          hours_contributed: 0,
          usd_value: 0,
          impact_unit: event.impact_unit,
          activity_date: event.event_date,
          verification_level: 'tier_2',
          verification_multiplier: 1.5,
          points_earned: pointsEarned,
          points_month: pointsMonth,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        derivedEntry.scp_earned = calculateSCP(derivedEntry);
        derivedEntries.push(derivedEntry);
      }

      // Update participant impact share
      await supabase
        .from('event_participants')
        .update({ impact_share: perParticipantImpact })
        .eq('participant_id', p.participant_id);
    }

    // Batch insert derived entries
    if (derivedEntries.length > 0) {
      await supabase.from('impact_entries').insert(derivedEntries);
    }

    res.json({
      message: 'Event closed successfully',
      actual_participants: participantCount,
      per_participant_impact: perParticipantImpact,
      derived_entries_created: derivedEntries.length
    });
  } catch (error) {
    console.error('Error closing event:', error);
    res.status(500).json({ error: 'Failed to close event' });
  }
});

// ---- DELETE /api/impact/events/:id - Delete an event ----
app.delete("/api/impact/events/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const eventId = req.params.id;

    const { data: event } = await supabase
      .from('impact_events')
      .select('created_by')
      .eq('event_id', eventId)
      .single();

    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.created_by !== userId && req.auth.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Delete event (CASCADE removes participants and related entries)
    const { error } = await supabase
      .from('impact_events')
      .delete()
      .eq('event_id', eventId);

    if (error) throw error;

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// ---- GET /api/admin/impact/aggregated - Admin aggregated impact metrics ----
app.get("/api/admin/impact/aggregated", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    // Get all impact entries
    const { data: entries, error } = await supabase
      .from('impact_entries')
      .select('people_impacted, hours_contributed, usd_value, scp_earned, esg_category, verification_level, user_role, entry_type');

    if (error) throw error;

    // Get event count
    const { count: eventCount } = await supabase
      .from('impact_events')
      .select('*', { count: 'exact', head: true });

    const metrics = {
      total_people_impacted: 0,
      total_hours: 0,
      total_usd_value: 0,
      total_scp: 0,
      total_entries: (entries || []).length,
      total_events: eventCount || 0,
      by_esg: { environmental: 0, social: 0, governance: 0 },
      by_tier: { tier_1: 0, tier_2: 0, tier_3: 0, tier_4: 0 },
      by_role: { ambassador: 0, partner: 0, user: 0 }
    };

    (entries || []).forEach(e => {
      metrics.total_people_impacted += e.people_impacted || 0;
      metrics.total_hours += parseFloat(e.hours_contributed) || 0;
      metrics.total_usd_value += parseFloat(e.usd_value) || 0;
      metrics.total_scp += parseFloat(e.scp_earned) || 0;
      if (e.esg_category) metrics.by_esg[e.esg_category] = (metrics.by_esg[e.esg_category] || 0) + (e.people_impacted || 0);
      if (e.verification_level) metrics.by_tier[e.verification_level] = (metrics.by_tier[e.verification_level] || 0) + 1;
      if (e.user_role) metrics.by_role[e.user_role] = (metrics.by_role[e.user_role] || 0) + (e.people_impacted || 0);
    });

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching aggregated impact:', error);
    res.status(500).json({ error: 'Failed to fetch aggregated impact data' });
  }
});

// ---- GET /api/impact/public-counter - Public impact counter (no auth) ----
app.get("/api/impact/public-counter", async (req, res) => {
  try {
    const { data: entries } = await supabase
      .from('impact_entries')
      .select('people_impacted, hours_contributed');

    let totalPeople = 0;
    let totalHours = 0;
    (entries || []).forEach(e => {
      totalPeople += e.people_impacted || 0;
      totalHours += parseFloat(e.hours_contributed) || 0;
    });

    const { count: eventCount } = await supabase
      .from('impact_events')
      .select('*', { count: 'exact', head: true });

    res.json({
      lives_impacted: totalPeople,
      hours_contributed: Math.round(totalHours),
      events_hosted: eventCount || 0
    });
  } catch (error) {
    console.error('Error fetching public counter:', error);
    res.status(500).json({ error: 'Failed to fetch impact data' });
  }
});

// Legacy Impactlog.html - redirect based on role
app.get("/Impactlog.html", requireAuth, async (req, res) => {
  try {
    const user = await getUserById(req.auth.userId, req.auth.role);
    if (!user) {
      return res.redirect("/signin");
    }
    // Redirect to role-specific impact log page
    if (user.role === "partner") {
      return res.redirect("/impactlog-partner.html");
    } else if (user.role === "ambassador") {
      return res.redirect("/impactlog-ambassador.html");
    } else {
      return res.redirect("/signin");
    }
  } catch (error) {
    console.error("Error serving impact log page:", error);
    return res.redirect("/signin");
  }
});

// Redirect chat-pillar.html based on role
app.get("/chat-pillar.html", requireAuth, async (req, res) => {
  try {
    const user = await getUserById(req.auth.userId, req.auth.role);
    if (!user) {
      return res.redirect("/signin");
    }
    if (user.role === "partner") {
      return res.redirect("/chat-pillar-partner.html");
    } else if (user.role === "ambassador") {
      return res.redirect("/chat-pillar-ambassador.html");
    } else {
      return res.redirect("/signin");
    }
  } catch (error) {
    console.error("Error serving chat-pillar page:", error);
    return res.redirect("/signin");
  }
});

// Ambassador Chat Pillar page
app.get("/chat-pillar-ambassador.html", requireAuth, requireRole("ambassador"), async (req, res) => {
  try {
    const user = await getUserById(req.auth.userId, "ambassador");
    if (!user) {
      return res.redirect("/signin");
    }
    res.sendFile(path.join(__dirname, "public", "chat-pillar-ambassador.html"));
  } catch (error) {
    console.error("Error serving ambassador chat-pillar page:", error);
    return res.redirect("/signin");
  }
});

// Partner Chat Pillar page
app.get("/chat-pillar-partner.html", requireAuth, requireRole("partner"), async (req, res) => {
  try {
    const user = await getUserById(req.auth.userId, "partner");
    if (!user) {
      return res.redirect("/partner-signin");
    }
    res.sendFile(path.join(__dirname, "public", "chat-pillar-partner.html"));
  } catch (error) {
    console.error("Error serving partner chat-pillar page:", error);
    return res.redirect("/partner-signin");
  }
});

app.get("/chat-region.html", requireAuth, requireRole("partner"), (req, res) => {
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
      log(`User not found: ${userId} (${role})`);
      return res.status(404).json({ error: "Not found" });
    }

    // Format response based on role
    const response = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    // Add name / organization fields based on role
    if (role === "ambassador") {
      response.name = user.first_name || user.name || "Ambassador";
    } else if (role === "partner") {
      // Prefer organization name for display; also expose contact/organization separately
      response.name =
        user.contact_person || user.organization_name || "Partner";
      response.organizationName = user.organization_name || null;
      response.contactName = user.contact_person || null;
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
      // Joined date for "Joined since" / "Member Since" UI
      joinedAt: user.created_at || user.createdAt || null,
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

// Mark notification as read
app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.auth.userId;

    log('📝 Marking notification as read:', notificationId);

    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("notification_id", notificationId)
      .eq("recipient_id", userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error:', error);
      throw error;
    }

    log('✅ Notification marked as read');

    return res.json({ success: true, notification: data });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({ 
      error: "Failed to update notification",
      details: error.message 
    });
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
// Professional Profile (About Me) API Endpoint
// ------------------------
app.post("/api/profile/about-me", requireAuth, requireRole("ambassador"), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const {
      professional_headline,
      professional_summary,
      linkedin_profile_url,
      speaker_profile_url,
      data_sharing_consent,
    } = req.body || {};

    log("📝 ========== ABOUT-ME PROFILE SAVE ==========");
    log("   User ID:", userId);
    log("   Headline:", professional_headline?.substring(0, 30));
    log("   Summary length:", professional_summary?.length);
    log("   Consent:", data_sharing_consent);

    // Validation
    if (!professional_headline || !professional_summary) {
      log("❌ Missing required fields");
      return res.status(400).json({
        error: "Professional headline and summary are required",
      });
    }

    // Require explicit data sharing consent
    if (!data_sharing_consent) {
      log("❌ Missing consent");
      return res.status(400).json({
        error:
          "You must consent to your data being shared with T4L Partners to continue",
      });
    }

    // Validate minimum word count
    const MIN_SUMMARY_WORDS = 70;
    const wordCount = professional_summary
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    if (wordCount < MIN_SUMMARY_WORDS) {
      log("❌ Summary too short:", wordCount, "words");
      return res.status(400).json({
        error: `Professional summary must be at least ${MIN_SUMMARY_WORDS} words`,
      });
    }

    log("✅ Validation passed");

    // ✅ Use getUserById helper to resolve ambassador and ambassador_id
    log("🔍 Looking up ambassador for user_id:", userId);
    const ambassador = await getUserById(userId, "ambassador");

    if (!ambassador) {
      console.error("❌ Ambassador not found for user_id:", userId);

      // Extra debug info to help diagnose setup issues
      try {
        const { data: user } = await supabase
          .from("users")
          .select("user_id, email, user_type")
          .eq("user_id", userId)
          .single();
        log("   User in users table:", user);

        const { data: allAmbs } = await supabase
          .from("ambassadors")
          .select("ambassador_id, user_id, email")
          .limit(5);
        log("   Sample ambassadors:", allAmbs);
      } catch (debugErr) {
        console.error("   Debug lookup failed:", debugErr);
      }

      return res.status(404).json({
        error: "Ambassador profile not found",
        details:
          "Your account may not be properly set up. Please contact support.",
      });
    }

    const ambassadorId = ambassador.ambassador_id || ambassador.id;
    log("✅ Found ambassador_id:", ambassadorId);

    // Build update payload
    const updatePayload = {
      professional_headline: professional_headline.trim(),
      professional_summary: professional_summary.trim(),
      updated_at: new Date().toISOString(),
    };

    // Try to include consent flag; if the column doesn't exist,
    // we'll handle the error and retry without it.
    try {
      updatePayload.data_sharing_consent = true;
    } catch (e) {
      log("⚠️ data_sharing_consent could not be set on payload");
    }

    // Optional links
    if (typeof linkedin_profile_url === "string" && linkedin_profile_url.trim()) {
      updatePayload.linkedin_profile_url = linkedin_profile_url.trim();
    }
    if (
      typeof speaker_profile_url === "string" &&
      speaker_profile_url.trim()
    ) {
      updatePayload.speaker_profile_url = speaker_profile_url.trim();
    }

    log("💾 Updating ambassador profile...");
    log("   Payload keys:", Object.keys(updatePayload));

    let { data: updated, error: updateError } = await supabase
      .from("ambassadors")
      .update(updatePayload)
      .eq("ambassador_id", ambassadorId)
      .select()
      .single();

    // If the error is specifically about data_sharing_consent missing, retry without it
    if (
      updateError &&
      (updateError.code === "PGRST204" ||
        (typeof updateError.message === "string" &&
          updateError.message.includes("data_sharing_consent")))
    ) {
      log("⚠️ Retrying profile update without data_sharing_consent column...");
      delete updatePayload.data_sharing_consent;

      const retry = await supabase
        .from("ambassadors")
        .update(updatePayload)
        .eq("ambassador_id", ambassadorId)
        .select()
        .single();

      updated = retry.data;
      updateError = retry.error;

      if (!updateError) {
        log("✅ Profile saved successfully (without consent column)");
        return res.json({
          success: true,
          message: "Professional profile saved successfully",
          redirect: "/ambassador-dashboard.html",
          warning:
            "Consent tracking column is missing in the database; please run the ambassadors ALTER TABLE migration.",
        });
      }
    }

    if (updateError) {
      console.error("❌ Update error:", updateError);
      console.error("   Code:", updateError.code);
      console.error("   Message:", updateError.message);
      console.error("   Details:", updateError.details);

      return res.status(500).json({
        error: "Failed to save professional profile",
        details: updateError.message,
      });
    }

    log("✅ Profile saved successfully");
    log("========== ABOUT-ME SAVE COMPLETE ==========\n");

    return res.json({
      success: true,
      message: "Professional profile saved successfully",
      redirect: "/ambassador-dashboard.html",
    });
  } catch (error) {
    console.error("❌ ========== ABOUT-ME ERROR ==========");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);

    return res.status(500).json({
      error: "Internal server error",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Please try again",
    });
  }
});

// ------------------------
// Feedback & Support (Ambassador + Partner)
// ------------------------
app.post(
  "/api/support/feedback",
  requireAuth,
  (req, res, next) => {
    supportUpload.single("screenshot")(req, res, (err) => {
      if (err) {
        console.error("❌ Support screenshot upload error:", err.message);
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            error: "Screenshot too large (max 5MB)",
          });
        }
        if (err.code === "LIMIT_FILE_TYPE") {
          return res.status(400).json({
            error: err.message || "Only image screenshots are allowed",
          });
        }
        return res.status(400).json({
          error: "Failed to upload screenshot",
          details: err.message,
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const userId = req.auth.userId;
      const role = req.auth.role || "ambassador";

      // Only ambassadors and partners can submit support feedback
      if (!["ambassador", "partner"].includes(role)) {
        return res.status(403).json({ error: "Only ambassadors and partners can send feedback." });
      }
      const { category, subject, message } = req.body || {};

      if (!message || String(message).trim().length < 10) {
        return res.status(400).json({
          error: "Please provide a short description of the issue (at least 10 characters).",
        });
      }

      // Try to link to ambassador_id if available (for ambassadors)
      let ambassadorId = null;
      if (role === "ambassador") {
        try {
          const { data: amb } = await supabase
            .from("ambassadors")
            .select("ambassador_id")
            .eq("user_id", userId)
            .single();
          ambassadorId = amb?.ambassador_id || null;
        } catch {
          ambassadorId = null;
        }
      }

      const screenshot_filename = req.file ? path.basename(req.file.path) : null;

      const { data, error } = await supabase
        .from("support_feedback")
        .insert([
          {
            user_id: userId,
            ambassador_id: ambassadorId,
            role,
            category: category || null,
            subject: subject || null,
            message: String(message).trim(),
            screenshot_filename,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("❌ Error saving support feedback:", error);
        return res.status(500).json({ error: "Failed to submit feedback" });
      }

      // Notify all admins about new feedback
      try {
        const { data: admins } = await supabase
          .from("admins")
          .select("user_id");

        if (admins && admins.length > 0) {
          const senderLabel = role === "partner" ? "a partner" : "an ambassador";
          const categoryLabel = category ? ` (${category})` : "";

          for (const admin of admins) {
            await createNotification(
              admin.user_id,
              "admin",
              "support_feedback",
              "🆘 New Support Feedback",
              `You received new feedback${categoryLabel} from ${senderLabel}.`,
              "/admin-support.html",
              null,
              null,
              null
            );
          }
        }
      } catch (notifyErr) {
        console.error("⚠️ Failed to notify admins about feedback:", notifyErr);
        // Do not fail the request if notifications break
      }

      return res.json({
        success: true,
        message: "Thanks for your feedback! Our team will review it.",
        feedback: { id: data.feedback_id },
      });
    } catch (err) {
      console.error("❌ Support feedback error:", err);
      return res.status(500).json({ error: "Failed to submit feedback" });
    }
  }
);

// Admin: list all support feedback
app.get(
  "/admin/api/support-feedback",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("support_feedback")
        .select(
          `
          feedback_id,
          user_id,
          ambassador_id,
          role,
          category,
          subject,
          message,
          status,
          screenshot_filename,
          created_at,
          updated_at
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error loading support feedback:", error);
        return res.status(500).json({ error: "Failed to load feedback" });
      }

      return res.json({ items: data || [] });
    } catch (err) {
      console.error("❌ Support feedback list error:", err);
      return res.status(500).json({ error: "Failed to load feedback" });
    }
  }
);

// ------------------------
// Journey API Endpoints - ENHANCED WITH REAL-TIME TRACKING
// ------------------------
app.get(
  "/api/journey",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const userId = req.auth.userId; // This is user_id from session
      
      log('📡 ========== /api/journey REQUEST ==========');
      log('   User ID from session:', userId);
      
      // ✅ STEP 1: Get ambassador_id from ambassadors table
      const ambassador = await getUserById(userId, "ambassador");
      
      if (!ambassador) {
        console.error('❌ Ambassador not found for user_id:', userId);
        return res.status(404).json({ error: 'Ambassador not found' });
      }
      
      const ambassadorId = ambassador.ambassador_id || ambassador.id;
      log('✅ Found ambassador_id:', ambassadorId);
      
      // ✅ STEP 2: Get journey progress using AMBASSADOR_ID
      let progress = await getJourneyProgress(ambassadorId); // ← USING AMBASSADOR_ID!
      
      // ✅ STEP 3: If no progress exists, create default
      if (!progress) {
        log('⚠️ No journey progress found, creating default...');
        progress = {
          current_month: 1,
          completed_tasks: {},
          start_date: new Date().toISOString(),
          month_start_dates: { 1: new Date().toISOString() },
        };
        
        // ✅ Save with AMBASSADOR_ID
        try {
          await upsertJourneyProgress(ambassadorId, progress); // ← USING AMBASSADOR_ID!
          log('✅ Default journey progress created for ambassador:', ambassadorId);
        } catch (upsertError) {
          console.error('❌ Failed to create journey progress:', upsertError);
          // Continue anyway - return default progress
        }
      } else {
        // ✅ SAFETY GUARD:
        // If there are ZERO completed tasks, force current_month to 1.
        // This prevents brand‑new ambassadors (who may have a bad/legacy
        // journey_progress row) from incorrectly showing as Month 2/3+
        // when they have not completed any journey tasks yet.
        const completedCountSafe = Object.keys(progress.completed_tasks || {}).filter(
          (key) => progress.completed_tasks[key]
        ).length;

        if (!completedCountSafe && progress.current_month !== 1) {
          log(
            '⚠️ Journey progress had no completed tasks but month was',
            progress.current_month,
            '→ forcing Month 1 for safety.'
          );

          progress.current_month = 1;

          try {
            await upsertJourneyProgress(ambassadorId, {
              ...progress,
              current_month: 1,
            });
            log('✅ Journey progress normalized to Month 1 for ambassador:', ambassadorId);
          } catch (normalizeError) {
            console.error('❌ Failed to normalize journey month to 1:', normalizeError);
            // Non‑fatal – we still respond with the in‑memory normalized value
          }
        }
      }
      
      log('✅ Journey Progress:');
      log('   Ambassador ID:', ambassadorId);
      log('   Current Month:', progress.current_month);
      log('   Completed Tasks:', Object.keys(progress.completed_tasks || {}).length);
      
      // ✅ BACKEND GUARD: Clamp current_month based on completed tasks
      // This prevents users from being shown a month they haven't legitimately reached
      // by checking if all tasks for each month are actually completed
      let maxEligibleMonth = 1; // Start at month 1
      
      log('🔍 Checking task completion to determine maxEligibleMonth...');
      
      // Check each month from 1 to 12 to see if all tasks are completed
      for (let monthNum = 1; monthNum <= 12; monthNum++) {
        const monthData = JOURNEY_MONTHS.find(m => m.month === monthNum);
        if (!monthData) {
          log(`   Month ${monthNum}: No data found, skipping`);
          continue;
        }
        
        // Check if ALL tasks for this month are completed
        const allTasksCompleted = monthData.tasks.every(task => {
          const taskKey = `${monthNum}-${task.id}`;
          return !!progress.completed_tasks[taskKey];
        });
        
        const completedCount = monthData.tasks.filter(task => {
          const taskKey = `${monthNum}-${task.id}`;
          return !!progress.completed_tasks[taskKey];
        }).length;
        
        log(
          `   Month ${monthNum}: ${completedCount}/${monthData.tasks.length} tasks completed - ` +
          `${allTasksCompleted ? '✅ ALL COMPLETE' : '❌ INCOMPLETE'}`
        );
        
        if (allTasksCompleted) {
          // If all tasks for this month are done, they're eligible for the next month
          // But cap at 12 (the maximum month)
          maxEligibleMonth = Math.min(monthNum + 1, 12);
        } else {
          // Found the first month that's not fully complete - stop here
          log(`   ⏹️ Stopping at Month ${monthNum} (first incomplete month)`);
          break;
        }
      }
      
      // Clamp the effective current month to the maximum eligible month
      // This ensures users can't be shown a month they haven't legitimately reached
      const effectiveCurrentMonth = Math.min(progress.current_month, maxEligibleMonth);
      
      log(`📊 Month Calculation:`);
      log(`   Database current_month: ${progress.current_month}`);
      log(`   maxEligibleMonth (based on tasks): ${maxEligibleMonth}`);
      log(`   effectiveCurrentMonth (clamped): ${effectiveCurrentMonth}`);
      
      if (effectiveCurrentMonth !== progress.current_month) {
        log(
          `⚠️ Journey month clamped: ${progress.current_month} → ${effectiveCurrentMonth} ` +
          `(maxEligibleMonth: ${maxEligibleMonth} based on completed tasks)`
        );
      }
      
      // ✅ Calculate statistics
      const totalTasks = JOURNEY_MONTHS.reduce(
        (sum, month) => sum + month.tasks.length,
        0
      );
      const completedCount = Object.keys(progress.completed_tasks || {}).filter(
        (key) => progress.completed_tasks[key]
      ).length;
      const overallProgress =
        totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

      // Get current month data (using effectiveCurrentMonth)
      const currentMonthData = JOURNEY_MONTHS.find(
        (m) => m.month === effectiveCurrentMonth
      );
      
      let currentMonthProgress = 0;
      let currentMonthTasks = [];

      if (currentMonthData) {
        currentMonthTasks = currentMonthData.tasks.map((task) => ({
          id: task.id,
          text: task.text,
          description: task.description || "",
          completed:
            !!progress.completed_tasks[`${effectiveCurrentMonth}-${task.id}`],
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
          isCurrentMonth: month.month === effectiveCurrentMonth,
          isCompleted: month.month < effectiveCurrentMonth,
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

      // Build response (using effectiveCurrentMonth)
      const response = {
        currentMonth: effectiveCurrentMonth,
        currentMonthTitle: currentMonthData ? currentMonthData.title : "Month 1",
        currentMonthMilestone: currentMonthData ? currentMonthData.milestone : "",
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
      };
      
      log('📤 Sending Response:');
      log('   currentMonth:', response.currentMonth);
      log('   overallProgress:', response.statistics.overallProgress);
      log('========== /api/journey COMPLETE ==========\n');

      return res.json(response);
    } catch (error) {
      console.error('❌ Journey fetch error:', error);
      console.error('Stack:', error.stack);
      return res.status(500).json({ 
        error: "Failed to fetch journey progress",
        details: error.message 
      });
    }
  }
);

// ============================================
// Journey Completion Notification Endpoint
// ============================================
app.post(
  "/api/journey/complete",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const userId = req.auth.userId;
      
      log('🎉 Journey completion notification request from user:', userId);
      
      // Get ambassador details
      const ambassador = await getUserById(userId, "ambassador");
      
      if (!ambassador) {
        return res.status(404).json({ error: 'Ambassador not found' });
      }
      
      const ambassadorName = `${ambassador.first_name || ""} ${ambassador.last_name || ""}`.trim() || "An ambassador";
      
      // Notify the user (ambassador)
      try {
        await createNotification(
          userId,
          "ambassador",
          "journey_completed",
          "🎉 Journey Completed!",
          "Congratulations! You've completed your 12-month transformation journey!",
          "/journey.html",
          null,
          null,
          null
        );
        log("✅ User notification sent");
      } catch (userNotifError) {
        console.error("⚠️ Failed to notify user:", userNotifError.message);
      }
      
      // Notify all admins
      try {
        const { data: admins } = await supabase.from("admins").select("user_id");
        if (admins && admins.length > 0) {
          for (const admin of admins) {
            await createNotification(
              admin.user_id,
              "admin",
              "journey_completed",
              "🎉 Ambassador Journey Completed",
              `${ambassadorName} has completed their 12-month transformation journey!`,
              "/admin-dashboard.html",
              null,
              null,
              null
            );
          }
          log("✅ Admin notifications sent to", admins.length, "admins");
        }
      } catch (adminNotifError) {
        console.error("⚠️ Failed to notify admins:", adminNotifError.message);
      }
      
      return res.json({
        success: true,
        message: "Notifications sent successfully"
      });
    } catch (error) {
      console.error('❌ Journey completion notification error:', error);
      return res.status(500).json({ 
        error: "Failed to send completion notifications",
        details: error.message 
      });
    }
  }
);

// ============================================
// Daily Journey Reminder System
// ============================================

// Function to send daily reminder to an ambassador
async function sendDailyJourneyReminder(ambassador) {
  try {
    const ambassadorId = ambassador.ambassador_id || ambassador.id;
    const userId = ambassador.user_id;
    
    if (!userId) {
      console.warn('⚠️ No user_id for ambassador, skipping reminder:', ambassadorId);
      return;
    }
    
    // Get journey progress
    const progress = await getJourneyProgress(ambassadorId);
    if (!progress) {
      log('📭 No journey progress found for ambassador:', ambassadorId);
      return;
    }
    
    const currentMonth = progress.current_month || 1;
    const completedTasks = progress.completed_tasks || {};
    
    // Get current month data
    const currentMonthData = JOURNEY_MONTHS.find(m => m.month === currentMonth);
    if (!currentMonthData) {
      return;
    }
    
    // Find incomplete tasks for current month
    const incompleteTasks = currentMonthData.tasks.filter(task => {
      const taskKey = `${currentMonth}-${task.id}`;
      return !completedTasks[taskKey];
    });
    
    if (incompleteTasks.length === 0) {
      // All tasks completed for current month
      return;
    }
    
    // Get the first incomplete task (or a critical one if available)
    const nextTask = incompleteTasks.find(t => t.critical) || incompleteTasks[0];
    const taskName = nextTask.text;
    
    // Motivational messages
    const motivationalMessages = [
      "💪 Keep pushing forward!",
      "🚀 You've got this!",
      "⭐ Don't give up - you're making progress!",
      "🌟 Every step counts - keep going!",
      "🔥 Stay focused and keep moving forward!",
      "✨ You're doing amazing - don't stop now!",
      "🎯 You're closer than you think - keep going!",
      "💎 Your transformation is happening - stay committed!",
      "🏆 Consistency is key - you've got this!"
    ];
    
    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    
    // Create notification
    const notificationTitle = "📅 Daily Journey Reminder";
    const notificationMessage = `${randomMessage}\n\nYour current task: ${taskName}\n\nComplete it to keep your momentum going! 💪`;
    
    await createNotification(
      userId,
      "ambassador",
      "daily_reminder",
      notificationTitle,
      notificationMessage,
      "/journey.html",
      null,
      null,
      null
    );
    
    log(`✅ Daily reminder sent to ambassador ${ambassadorId}: ${taskName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send daily reminder to ambassador:`, error);
    return false;
  }
}

// Function to send daily reminders to all active ambassadors
async function sendDailyRemindersToAllAmbassadors() {
  try {
    log('📬 Starting daily journey reminders...');
    
    // Get all active ambassadors (with no limit to get all)
    const { items: ambassadors } = await listUsers("ambassador", { 
      status: "active",
      limit: 1000  // Get all active ambassadors
    });
    
    if (!ambassadors || ambassadors.length === 0) {
      log('📭 No active ambassadors found');
      return;
    }
    
    if (!ambassadors || ambassadors.length === 0) {
      log('📭 No active ambassadors found');
      return;
    }
    
    log(`📧 Sending reminders to ${ambassadors.length} active ambassadors...`);
    
    let successCount = 0;
    let failCount = 0;
    
    // Send reminders to each ambassador
    for (const ambassador of ambassadors) {
      try {
        const sent = await sendDailyJourneyReminder(ambassador);
        if (sent) {
          successCount++;
        }
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Error sending reminder to ${ambassador.ambassador_id}:`, error);
        failCount++;
      }
    }
    
    log(`✅ Daily reminders completed: ${successCount} sent, ${failCount} failed`);
  } catch (error) {
    console.error('❌ Error in daily reminder system:', error);
  }
}

// Endpoint to manually trigger daily reminders (for testing/admin use)
app.post(
  "/admin/api/journey/send-daily-reminders",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      await sendDailyRemindersToAllAmbassadors();
      return res.json({
        success: true,
        message: "Daily reminders sent to all ambassadors"
      });
    } catch (error) {
      console.error('❌ Error sending daily reminders:', error);
      return res.status(500).json({
        error: "Failed to send daily reminders",
        details: error.message
      });
    }
  }
);

// Endpoint for ambassadors to get their daily reminder (called on dashboard/journey page load)
app.get(
  "/api/journey/daily-reminder",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const userId = req.auth.userId;
      
      // Get ambassador details
      const ambassador = await getUserById(userId, "ambassador");
      if (!ambassador) {
        return res.status(404).json({ error: 'Ambassador not found' });
      }
      
      const ambassadorId = ambassador.ambassador_id || ambassador.id;
      
      // Get journey progress
      const progress = await getJourneyProgress(ambassadorId);
      if (!progress) {
        return res.json({
          hasReminder: false,
          message: "No journey progress found"
        });
      }
      
      const currentMonth = progress.current_month || 1;
      const completedTasks = progress.completed_tasks || {};
      
      // Get current month data
      const currentMonthData = JOURNEY_MONTHS.find(m => m.month === currentMonth);
      if (!currentMonthData) {
        return res.json({
          hasReminder: false,
          message: "No current month data"
        });
      }
      
      // Find incomplete tasks for current month
      // Ensure we only check tasks from the current month's data
      const incompleteTasks = currentMonthData.tasks.filter(task => {
        const taskKey = `${currentMonth}-${task.id}`;
        const isCompleted = completedTasks[taskKey] === true || completedTasks[taskKey] === 'true';
        return !isCompleted;
      });
      
      if (incompleteTasks.length === 0) {
        // All tasks completed for current month
        return res.json({
          hasReminder: false,
          message: "All tasks completed for current month"
        });
      }
      
      // Get the first incomplete task (prioritize critical tasks, then by order in array)
      // This ensures we show tasks in the order they appear in the journey
      const criticalTasks = incompleteTasks.filter(t => t.critical);
      const nextTask = criticalTasks.length > 0 ? criticalTasks[0] : incompleteTasks[0];
      
      if (!nextTask) {
        return res.json({
          hasReminder: false,
          message: "No valid task found"
        });
      }
      
      const taskName = nextTask.text;
      
      // Log for debugging
      log(`📋 Daily reminder - Month ${currentMonth}, Task: ${taskName}, Task ID: ${nextTask.id}`);
      
      // Motivational messages
      const motivationalMessages = [
        "💪 Keep pushing forward!",
        "🚀 You've got this!",
        "⭐ Don't give up - you're making progress!",
        "🌟 Every step counts - keep going!",
        "🔥 Stay focused and keep moving forward!",
        "✨ You're doing amazing - don't stop now!",
        "🎯 You're closer than you think - keep going!",
      ];
      
      const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
      
      // Check if reminder notification was sent today
      const { data: recentNotifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", userId)
        .eq("recipient_type", "ambassador")
        .eq("type", "daily_reminder")
        .order("created_at", { ascending: false })
        .limit(1);
      
      const lastReminder = recentNotifications && recentNotifications[0];
      const today = new Date().toDateString();
      const lastReminderDate = lastReminder ? new Date(lastReminder.created_at).toDateString() : null;
      
      // If no reminder notification sent today, send one
      if (lastReminderDate !== today) {
        await sendDailyJourneyReminder(ambassador);
      }
      
      return res.json({
        hasReminder: true,
        motivationalMessage: randomMessage,
        taskName: taskName,
        currentMonth: currentMonth,
        monthTitle: currentMonthData.title
      });
    } catch (error) {
      console.error('❌ Error getting daily reminder:', error);
      return res.status(500).json({
        error: "Failed to get daily reminder",
        details: error.message
      });
    }
  }
);

// Schedule daily reminders (runs once per day at 9 AM)
function scheduleDailyReminders() {
  // Calculate milliseconds until next 9 AM
  const now = new Date();
  const next9AM = new Date();
  next9AM.setHours(9, 0, 0, 0);
  
  // If it's already past 9 AM today, schedule for tomorrow
  if (now.getTime() > next9AM.getTime()) {
    next9AM.setDate(next9AM.getDate() + 1);
  }
  
  const msUntil9AM = next9AM.getTime() - now.getTime();
  
  log(`⏰ Daily reminders scheduled for ${next9AM.toLocaleString()}`);
  
  // Set initial timeout
  setTimeout(() => {
    sendDailyRemindersToAllAmbassadors();
    
    // Then schedule to run every 24 hours
    setInterval(() => {
      sendDailyRemindersToAllAmbassadors();
    }, 24 * 60 * 60 * 1000); // 24 hours
  }, msUntil9AM);
}

// ============================================
// LinkedIn profile audit reminder (once, after first week)
// ============================================
// After an ambassador's first week in the program, send admins a one-time
// notification to upload that ambassador's LinkedIn profile audit.

async function checkAndSendLinkedInAuditReminders() {
  try {
    const { data: ambassadors, error: fetchError } = await supabase
      .from("ambassadors")
      .select("ambassador_id, user_id, first_name, last_name, linkedin_audit_reminder_sent_at, users(created_at)")
      .is("linkedin_audit_reminder_sent_at", null);

    if (fetchError) {
      if (fetchError.code === "42703" || fetchError.message?.includes("linkedin_audit_reminder_sent_at")) {
        log("⏭️ LinkedIn audit reminder: column not yet migrated, skipping.");
        return;
      }
      console.error("❌ LinkedIn audit reminder fetch error:", fetchError.message);
      return;
    }

    if (!ambassadors || ambassadors.length === 0) return;

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const eligible = ambassadors.filter((a) => {
      const createdAt = a.users?.created_at || a.created_at;
      if (!createdAt) return false;
      return new Date(createdAt) <= oneWeekAgo;
    });

    if (eligible.length === 0) return;

    const { data: admins } = await supabase.from("admins").select("user_id");
    if (!admins || admins.length === 0) return;

    for (const amb of eligible) {
      const name = [amb.first_name, amb.last_name].filter(Boolean).join(" ") || "An ambassador";
      const title = "Upload LinkedIn profile audit";
      const message = `${name} joined the program over a week ago. Please upload their LinkedIn profile audit when ready.`;
      const link = "/admin-linkedin-audits.html";

      for (const admin of admins) {
        await createNotification(
          admin.user_id,
          "admin",
          "linkedin_audit_reminder",
          title,
          message,
          link,
          null,
          null,
          null,
          null
        );
      }

      await supabase
        .from("ambassadors")
        .update({ linkedin_audit_reminder_sent_at: new Date().toISOString() })
        .eq("ambassador_id", amb.ambassador_id);
    }

    if (eligible.length > 0) {
      log(`✅ LinkedIn audit reminder: sent for ${eligible.length} ambassador(s).`);
    }
  } catch (err) {
    console.error("❌ LinkedIn audit reminder error:", err.message);
  }
}

function scheduleLinkedInAuditReminders() {
  const run = () => checkAndSendLinkedInAuditReminders();
  setTimeout(run, 60 * 1000);
  setInterval(run, 24 * 60 * 60 * 1000);
  log("⏰ LinkedIn audit reminders: run in 1 min, then every 24h.");
}

// ============================================
// ADDITIONAL FIX: Clear any localStorage conflicts
// ============================================

// Add this endpoint to help clear localStorage if needed
app.post(
  "/api/journey/clear-cache",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const userId = req.auth.userId;
      
      log('🧹 Clearing journey cache for user:', userId);
      
      // Get fresh data from database
      const progress = await getJourneyProgress(userId);
      
      if (!progress) {
        return res.status(404).json({ error: 'No journey progress found' });
      }
      
      log('✅ Cache cleared, fresh data retrieved');
      log('   Current Month:', progress.current_month);
      
      return res.json({
        success: true,
        message: 'Cache cleared successfully',
        currentMonth: progress.current_month,
        completedTasks: Object.keys(progress.completed_tasks || {}).length
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
      return res.status(500).json({ error: 'Failed to clear cache' });
    }
  }
);

// ============================================
// DEBUG ENDPOINT: Check journey data
// ============================================

app.get(
  "/api/debug/journey",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const userId = req.auth.userId;
      
      log('🔍 DEBUG: Checking journey for user:', userId);
      
      // Get from database
      const progress = await getJourneyProgress(userId);
      
      log('📊 Journey Progress:');
      log('   Current Month:', progress?.current_month);
      log('   Tasks:', Object.keys(progress?.completed_tasks || {}).length);
      log('   Start Date:', progress?.start_date);
      
      return res.json({
        userId,
        progress,
        database: {
          currentMonth: progress?.current_month,
          tasksCount: Object.keys(progress?.completed_tasks || {}).length,
          startDate: progress?.start_date
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Debug error:', error);
      return res.status(500).json({ error: error.message });
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

      // ✅ Get ambassador_id
      const ambassador = await getUserById(userId, "ambassador");
      if (!ambassador) {
        return res.status(404).json({ error: "Ambassador not found" });
      }
      
      const ambassadorId = ambassador.ambassador_id || ambassador.id;
      log('✅ Updating task for ambassador_id:', ambassadorId);

      // ✅ Get progress using ambassador_id
      let progress = await getJourneyProgress(ambassadorId);
      
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

      // ✅ Save using ambassador_id
      await upsertJourneyProgress(ambassadorId, {
        ...progress,
        completed_tasks: completedTasks,
      });

      // Calculate stats
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

// LEGACY: Lightweight progress polling endpoint (using old journey_progress table)
// NOTE: This endpoint is kept for backward compatibility but may be deprecated
app.get(
  "/api/journey/progress/legacy",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const userId = req.auth.userId;
      const ambassador = await getUserById(userId, "ambassador");
      if (!ambassador) {
        return res.status(404).json({ error: "Ambassador not found" });
      }
      const ambassadorId = ambassador.ambassador_id || ambassador.id;
      const progress = await getJourneyProgress(ambassadorId);

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
      
      // ✅ Get ambassador_id
      const ambassador = await getUserById(userId, "ambassador");
      if (!ambassador) {
        return res.status(404).json({ error: "Ambassador not found" });
      }
      
      const ambassadorId = ambassador.ambassador_id || ambassador.id;
      
      // ✅ Get progress using ambassador_id
      let progress = await getJourneyProgress(ambassadorId);

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

      // ✅ Save using ambassador_id
      await upsertJourneyProgress(ambassadorId, updatedProgress);

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

// ============================================
// NEW: Supabase Journey Progress API Endpoints
// ============================================

// GET current journey progress for ambassador (using new tables)
app.get('/api/journey/progress', requireAuth, requireRole('ambassador'), async (req, res) => {
  try {
    const userId = req.auth.userId;
    
    log('📡 ========== /api/journey/progress (NEW) REQUEST ==========');
    log('   User ID from session:', userId);
    
    // Get ambassador
    const ambassador = await getUserById(userId, 'ambassador');
    if (!ambassador) {
      console.error('❌ Ambassador not found for user_id:', userId);
      return res.status(404).json({ error: 'Ambassador not found' });
    }
    const ambassadorId = ambassador.ambassador_id || ambassador.id;
    log('✅ Found ambassador_id:', ambassadorId);

    // Get current month progress
    const { data: currentProgress, error: progressError } = await supabase
      .from('ambassador_journey_progress')
      .select(`
        *,
        journey_months (
          month_id,
          month_number,
          month_name,
          description
        )
      `)
      .eq('ambassador_id', ambassadorId)
      .eq('current_month', true)
      .maybeSingle();

    if (progressError) {
      console.error('❌ Error fetching current progress:', progressError);
      throw progressError;
    }

    // Get all month progress
    const { data: allProgress, error: allProgressError } = await supabase
      .from('ambassador_journey_progress')
      .select('*')
      .eq('ambassador_id', ambassadorId)
      .order('started_at', { ascending: true });

    if (allProgressError) {
      console.error('❌ Error fetching all progress:', allProgressError);
      throw allProgressError;
    }

    // Get task completion status
    // journey_tasks uses task_name, task_description (NOT title/description)
    let taskCompletions = [];
    const { data: taskData, error: taskError } = await supabase
      .from('ambassador_task_completion')
      .select(`
        *,
        journey_tasks (
          task_id,
          task_identifier,
          month_id,
          task_name,
          task_description
        )
      `)
      .eq('ambassador_id', ambassadorId);

    if (taskError) {
      console.error('❌ Error fetching task completions:', taskError.message);
      // Fallback: try minimal columns in case schema uses different names
      if (taskError.message && (taskError.message.includes('title') || taskError.message.includes('description') || taskError.message.includes('does not exist'))) {
        log('⚠️ Retrying with minimal journey_tasks columns (task_id, task_identifier, month_id)...');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('ambassador_task_completion')
          .select(`
            *,
            journey_tasks (
              task_id,
              task_identifier,
              month_id
            )
          `)
          .eq('ambassador_id', ambassadorId);
        if (!fallbackError && fallbackData) {
          taskCompletions = fallbackData;
          log('✅ Fallback succeeded, task completions loaded');
        }
      }
      // Don't return 500: allow UI to load with empty task completions (e.g. new user or schema mismatch)
      if (taskCompletions.length === 0 && taskError) {
        console.warn('⚠️ Using empty task completions due to:', taskError.message);
      }
    } else {
      taskCompletions = taskData || [];
    }

    let currentProgressRes = currentProgress;
    let allProgressRes = allProgress || [];

    // Ensure month 1 progress exists for new users (so we have started_at for 3-week gate)
    if (!currentProgressRes && (!allProgressRes || allProgressRes.length === 0)) {
      const { data: month1 } = await supabase
        .from('journey_months')
        .select('month_id')
        .eq('month_number', 1)
        .single();
      if (month1) {
        const now = new Date().toISOString();
        const { data: inserted, error: insertErr } = await supabase
          .from('ambassador_journey_progress')
          .insert([{
            ambassador_id: ambassadorId,
            month_id: month1.month_id,
            current_month: true,
            started_at: now,
            created_at: now,
            updated_at: now
          }])
          .select()
          .single();
        if (!insertErr && inserted) {
          currentProgressRes = inserted;
          allProgressRes = [inserted];
          log('✅ Created initial Month 1 progress for ambassador');
        }
      }
    }

    // Resolve current month: from joined journey_months or 1 when we just created Month 1 progress
    const resolvedCurrentMonth = (currentProgressRes && currentProgressRes.journey_months && currentProgressRes.journey_months.month_number != null)
      ? currentProgressRes.journey_months.month_number
      : (currentProgressRes ? 1 : 1);

    const currentMonthStartedAt = currentProgressRes ? (currentProgressRes.started_at || null) : null;

    log('✅ Journey progress loaded:', {
      currentMonth: resolvedCurrentMonth,
      currentMonthStartedAt,
      progressRecords: allProgressRes.length,
      taskCompletions: taskCompletions?.length || 0
    });

    return res.json({
      success: true,
      currentMonth: resolvedCurrentMonth,
      currentMonthStartedAt,
      currentProgress: currentProgressRes,
      allProgress: allProgressRes,
      taskCompletions: taskCompletions || []
    });
  } catch (error) {
    console.error('❌ Error fetching journey progress:', error);
    // Return 200 with safe defaults so journey + dashboard pages still load in production
    const userId = req.auth && req.auth.userId;
    if (userId) {
      return res.json({
        success: true,
        currentMonth: 1,
        currentMonthStartedAt: null,
        currentProgress: null,
        allProgress: [],
        taskCompletions: [],
        _fallback: true,
        _message: 'Journey data temporarily unavailable; showing default view.'
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch journey progress',
      details: error.message
    });
  }
});

// POST - Initialize or update current month
app.post('/api/journey/progress/month', requireAuth, requireRole('ambassador'), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { monthNumber } = req.body;

    log('📡 ========== /api/journey/progress/month REQUEST ==========');
    log('   User ID:', userId, 'Month:', monthNumber);

    if (!monthNumber || monthNumber < 1 || monthNumber > 12) {
      return res.status(400).json({ error: 'Invalid month number' });
    }

    // Get ambassador
    const ambassador = await getUserById(userId, 'ambassador');
    if (!ambassador) {
      return res.status(404).json({ error: 'Ambassador not found' });
    }
    const ambassadorId = ambassador.ambassador_id || ambassador.id;

    // 3-week gate: advancing to next month only allowed after 3 weeks in current month
    if (monthNumber > 1) {
      const previousMonthNumber = monthNumber - 1;
      const { data: prevMonth } = await supabase
        .from('journey_months')
        .select('month_id')
        .eq('month_number', previousMonthNumber)
        .single();
      if (prevMonth) {
        const { data: prevProgress } = await supabase
          .from('ambassador_journey_progress')
          .select('started_at')
          .eq('ambassador_id', ambassadorId)
          .eq('month_id', prevMonth.month_id)
          .maybeSingle();
        if (prevProgress && prevProgress.started_at) {
          const startedAt = new Date(prevProgress.started_at).getTime();
          const threeWeeksMs = 21 * 24 * 60 * 60 * 1000;
          if (Date.now() - startedAt < threeWeeksMs) {
            return res.status(403).json({
              error: 'Month not yet available',
              message: `Your month ${previousMonthNumber} activities are being reviewed. Your next month activities will open soon.`,
              currentMonth: previousMonthNumber
            });
          }
        }
      }
    }

    // Get month_id from journey_months table
    const { data: month, error: monthError } = await supabase
      .from('journey_months')
      .select('month_id')
      .eq('month_number', monthNumber)
      .single();

    if (monthError || !month) {
      console.error('❌ Month not found:', monthNumber, monthError);
      return res.status(404).json({ error: 'Month not found' });
    }

    // Set all other months to not current
    await supabase
      .from('ambassador_journey_progress')
      .update({ current_month: false, updated_at: new Date().toISOString() })
      .eq('ambassador_id', ambassadorId);

    // Check if progress record exists for this month
    const { data: existing, error: existingError } = await supabase
      .from('ambassador_journey_progress')
      .select('*')
      .eq('ambassador_id', ambassadorId)
      .eq('month_id', month.month_id)
      .maybeSingle();

    let progressRecord;
    const now = new Date().toISOString();

    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('ambassador_journey_progress')
        .update({ 
          current_month: true,
          updated_at: now
        })
        .eq('progress_id', existing.progress_id)
        .select()
        .single();

      if (error) throw error;
      progressRecord = data;
      log('✅ Updated existing progress record');
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('ambassador_journey_progress')
        .insert([{
          ambassador_id: ambassadorId,
          month_id: month.month_id,
          current_month: true,
          started_at: now,
          created_at: now,
          updated_at: now
        }])
        .select()
        .single();

      if (error) throw error;
      progressRecord = data;
      log('✅ Created new progress record');
    }

    return res.json({
      success: true,
      progress: progressRecord
    });
  } catch (error) {
    console.error('❌ Error updating month progress:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to update month progress',
      details: error.message 
    });
  }
});

// POST - Toggle task completion
app.post('/api/journey/tasks/toggle', requireAuth, requireRole('ambassador'), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { taskIdentifier, monthNumber, completed } = req.body;

    log('🔄 Toggle task:', { taskIdentifier, monthNumber, completed });

    // Get ambassador
    const ambassador = await getUserById(userId, 'ambassador');
    if (!ambassador) {
      return res.status(404).json({ error: 'Ambassador not found' });
    }
    const ambassadorId = ambassador.ambassador_id || ambassador.id;

    // Resolve month_id from journey_months (so we can scope task lookup by month)
    let monthId = null;
    if (monthNumber != null) {
      const { data: monthRow, error: monthErr } = await supabase
        .from('journey_months')
        .select('month_id')
        .eq('month_number', parseInt(monthNumber, 10))
        .maybeSingle();
      if (!monthErr && monthRow) monthId = monthRow.month_id;
    }

    // Build task query: by task_identifier, and by month_id if we have it
    let taskQuery = supabase
      .from('journey_tasks')
      .select('task_id, month_id, task_name')
      .eq('task_identifier', taskIdentifier);
    if (monthId) taskQuery = taskQuery.eq('month_id', monthId);
    const { data: task, error: taskError } = await taskQuery.maybeSingle();

    if (taskError) {
      console.error('❌ Database error looking up task:', taskIdentifier, taskError);
      return res.status(500).json({ 
        error: 'Database error',
        details: taskError.message 
      });
    }

    if (!task) {
      console.error('❌ Task not found in database:', taskIdentifier);
      console.error('   Searched for task_identifier:', taskIdentifier, 'month_id:', monthId || '(any)');
      
      return res.status(404).json({ 
        error: 'Task not found',
        taskIdentifier,
        monthNumber,
        hint: 'journey_tasks may be empty. Run migrations/ensure-journey-months-and-tasks.sql in Supabase SQL Editor, then migrations/populate-journey-tasks.sql for all 12 months.'
      });
    }

    log('✅ Task found:', taskIdentifier, '->', task.task_name || 'unnamed');

    // Get or create progress record for this month
    const { data: progressRecord, error: progressError } = await supabase
      .from('ambassador_journey_progress')
      .select('progress_id')
      .eq('ambassador_id', ambassadorId)
      .eq('month_id', task.month_id)
      .maybeSingle();

    let progressId;
    if (!progressRecord) {
      // Create progress record if it doesn't exist
      const { data: newProgress, error: createError } = await supabase
        .from('ambassador_journey_progress')
        .insert([{
          ambassador_id: ambassadorId,
          month_id: task.month_id,
          current_month: false,
          started_at: new Date().toISOString()
        }])
        .select('progress_id')
        .single();

      if (createError) throw createError;
      progressId = newProgress.progress_id;
      log('✅ Created progress record for month');
    } else {
      progressId = progressRecord.progress_id;
    }

    // Check if task completion record exists
    const { data: existing, error: existingError } = await supabase
      .from('ambassador_task_completion')
      .select('*')
      .eq('ambassador_id', ambassadorId)
      .eq('task_id', task.task_id)
      .maybeSingle();

    const now = new Date().toISOString();
    let taskCompletion;

    if (existing) {
      // Update existing record
      const updateData = {
        status: completed ? 'completed' : 'not_started',
        updated_at: now
      };

      if (completed) {
        updateData.completed_at = now;
        if (!existing.started_at) {
          updateData.started_at = now;
        }
      } else {
        updateData.completed_at = null;
      }

      const { data, error } = await supabase
        .from('ambassador_task_completion')
        .update(updateData)
        .eq('completion_id', existing.completion_id)
        .select()
        .single();

      if (error) throw error;
      taskCompletion = data;
      log('✅ Updated task completion');
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('ambassador_task_completion')
        .insert([{
          ambassador_id: ambassadorId,
          task_id: task.task_id,
          progress_id: progressId,
          status: completed ? 'completed' : 'not_started',
          started_at: completed ? now : null,
          completed_at: completed ? now : null,
          created_at: now,
          updated_at: now
        }])
        .select()
        .single();

      if (error) throw error;
      taskCompletion = data;
      log('✅ Created task completion');
    }

    return res.json({
      success: true,
      taskCompletion
    });
  } catch (error) {
    console.error('❌ Error toggling task:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to toggle task',
      details: error.message 
    });
  }
});

// POST - Bulk update tasks (for migration from localStorage)
app.post('/api/journey/tasks/bulk-update', requireAuth, requireRole('ambassador'), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { tasks, currentMonth } = req.body;

    log('🔄 Bulk update tasks:', { taskCount: Object.keys(tasks || {}).length, currentMonth });

    // Get ambassador
    const ambassador = await getUserById(userId, 'ambassador');
    if (!ambassador) {
      return res.status(404).json({ error: 'Ambassador not found' });
    }
    const ambassadorId = ambassador.ambassador_id || ambassador.id;

    const results = [];
    
    // Process each task from localStorage format
    // Format: { "1-linkedin_course": true, "2-submit_article_1": true, ... }
    if (tasks && typeof tasks === 'object') {
      for (const [taskKey, isCompleted] of Object.entries(tasks)) {
        if (!isCompleted) continue; // Only migrate completed tasks
        
        try {
          // Parse task key: "1-linkedin_course" -> month: 1, taskId: "linkedin_course"
          const [monthStr, taskIdentifier] = taskKey.split('-');
          const monthNumber = parseInt(monthStr);
          
          if (!monthNumber || !taskIdentifier) {
            console.warn('⚠️ Invalid task key format:', taskKey);
            continue;
          }

          // Get task_id from journey_tasks table
          const { data: task, error: taskError } = await supabase
            .from('journey_tasks')
            .select('task_id, month_id')
            .eq('task_identifier', taskIdentifier)
            .maybeSingle();

          if (taskError || !task) {
            console.warn('⚠️ Task not found:', taskIdentifier);
            results.push({ taskKey, success: false, error: 'Task not found' });
            continue;
          }

          // Get or create progress record for this month
          const { data: progressRecord, error: progressError } = await supabase
            .from('ambassador_journey_progress')
            .select('progress_id')
            .eq('ambassador_id', ambassadorId)
            .eq('month_id', task.month_id)
            .maybeSingle();

          let progressId;
          if (!progressRecord) {
            const { data: newProgress, error: createError } = await supabase
              .from('ambassador_journey_progress')
              .insert([{
                ambassador_id: ambassadorId,
                month_id: task.month_id,
                current_month: false,
                started_at: new Date().toISOString()
              }])
              .select('progress_id')
              .single();

            if (createError) throw createError;
            progressId = newProgress.progress_id;
          } else {
            progressId = progressRecord.progress_id;
          }

          // Check if task completion record exists
          const { data: existing, error: existingError } = await supabase
            .from('ambassador_task_completion')
            .select('*')
            .eq('ambassador_id', ambassadorId)
            .eq('task_id', task.task_id)
            .maybeSingle();

          const now = new Date().toISOString();

          if (existing) {
            // Update existing record
            const { error: updateError } = await supabase
              .from('ambassador_task_completion')
              .update({
                status: 'completed',
                completed_at: now,
                updated_at: now
              })
              .eq('completion_id', existing.completion_id);

            if (updateError) throw updateError;
          } else {
            // Create new record
            const { error: insertError } = await supabase
              .from('ambassador_task_completion')
              .insert([{
                ambassador_id: ambassadorId,
                task_id: task.task_id,
                progress_id: progressId,
                status: 'completed',
                started_at: now,
                completed_at: now,
                created_at: now,
                updated_at: now
              }]);

            if (insertError) throw insertError;
          }

          results.push({ taskKey, success: true });
        } catch (error) {
          console.error(`❌ Failed to migrate task ${taskKey}:`, error);
          results.push({ taskKey, success: false, error: error.message });
        }
      }
    }

    // Update current month if provided
    if (currentMonth) {
      try {
        // Get month_id from journey_months table
        const { data: month, error: monthError } = await supabase
          .from('journey_months')
          .select('month_id')
          .eq('month_number', currentMonth)
          .single();

        if (!monthError && month) {
          // Set all other months to not current
          await supabase
            .from('ambassador_journey_progress')
            .update({ current_month: false, updated_at: new Date().toISOString() })
            .eq('ambassador_id', ambassadorId);

          // Check if progress record exists for this month
          const { data: existing, error: existingError } = await supabase
            .from('ambassador_journey_progress')
            .select('*')
            .eq('ambassador_id', ambassadorId)
            .eq('month_id', month.month_id)
            .maybeSingle();

          const now = new Date().toISOString();

          if (existing) {
            await supabase
              .from('ambassador_journey_progress')
              .update({ 
                current_month: true,
                updated_at: now
              })
              .eq('progress_id', existing.progress_id);
          } else {
            await supabase
              .from('ambassador_journey_progress')
              .insert([{
                ambassador_id: ambassadorId,
                month_id: month.month_id,
                current_month: true,
                started_at: now,
                created_at: now,
                updated_at: now
              }]);
          }
        }
      } catch (error) {
        console.error('❌ Error updating current month:', error);
      }
    }

    return res.json({
      success: true,
      message: 'Bulk update completed',
      results,
      migrated: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
  } catch (error) {
    console.error('❌ Error in bulk update:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to bulk update tasks',
      details: error.message 
    });
  }
});

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
      const ambassadorId = req.params.id;
      log('📡 Fetching journey for ambassador:', ambassadorId);
      
      const progress = (await getJourneyProgress(ambassadorId)) || {
        current_month: 1,
        completed_tasks: {},
        start_date: new Date().toISOString(),
        month_start_dates: { 1: new Date().toISOString() },
        last_updated: new Date().toISOString(),
      };

      log('📊 Journey progress data:', {
        current_month: progress.current_month,
        completed_tasks_count: Object.keys(progress.completed_tasks || {}).length,
        start_date: progress.start_date
      });

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
      const currentMonth = progress.current_month || 1;
      const currentMonthData = JOURNEY_MONTHS.find(
        (m) => m.month === currentMonth
      );
      const currentMonthTasks = currentMonthData
        ? currentMonthData.tasks.length
        : 0;
      const currentMonthCompleted = currentMonthData
        ? currentMonthData.tasks.filter(
            (task) => completedTasks[`${currentMonth}-${task.id}`]
          ).length
        : 0;
      const currentMonthProgress =
        currentMonthTasks > 0
          ? Math.round((currentMonthCompleted / currentMonthTasks) * 100)
          : 0;

      const response = {
        ambassadorId: ambassadorId,
        currentMonth: currentMonth,
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
            isCurrentMonth: month.month === currentMonth,
            isCompleted: month.month < currentMonth,
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
      };
      
      log('✅ Journey response:', {
        ambassadorId: response.ambassadorId,
        currentMonth: response.currentMonth,
        overallProgress: response.statistics.overallProgress,
        completedCount: response.statistics.completedCount,
        totalTasks: response.statistics.totalTasks,
        monthsCount: response.months.length
      });

      return res.json(response);
    } catch (error) {
      console.error("❌ Error fetching ambassador journey:", error);
      return res.status(500).json({ error: "Internal server error", details: error.message });
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
// Admin History API (12-month journey completers, with deactivation)
// ------------------------
app.get(
  "/admin/api/history",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      // Ambassadors who have completed 12-month journey (journey_progress.current_month >= 12)
      const { data: progressRows, error: progressError } = await supabase
        .from("journey_progress")
        .select("ambassador_id, current_month, last_updated, start_date")
        .gte("current_month", 12);

      if (progressError) {
        console.error("Error fetching history journey progress:", progressError);
        return res.status(500).json({ error: "Failed to load history" });
      }

      if (!progressRows || progressRows.length === 0) {
        return res.json({ history: [], total: 0 });
      }

      const ambassadorIds = progressRows.map((r) => r.ambassador_id);
      const { data: ambassadors, error: ambError } = await supabase
        .from("ambassadors")
        .select("ambassador_id, user_id, email, first_name, last_name")
        .in("ambassador_id", ambassadorIds);

      if (ambError || !ambassadors || ambassadors.length === 0) {
        return res.json({ history: [], total: 0 });
      }

      const userIds = [...new Set(ambassadors.map((a) => a.user_id))];
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("user_id, status, created_at, last_login")
        .in("user_id", userIds);

      if (usersError) {
        return res.status(500).json({ error: "Failed to load user status" });
      }
      const userMap = (users || []).reduce((acc, u) => {
        acc[u.user_id] = u;
        return acc;
      }, {});

      const progressMap = progressRows.reduce((acc, p) => {
        acc[p.ambassador_id] = p;
        return acc;
      }, {});

      const history = ambassadors.map((amb) => {
        const prog = progressMap[amb.ambassador_id];
        const u = userMap[amb.user_id] || {};
        return {
          ambassador_id: amb.ambassador_id,
          user_id: amb.user_id,
          name: [amb.first_name, amb.last_name].filter(Boolean).join(" ") || amb.email,
          email: amb.email,
          current_month: prog ? prog.current_month : 12,
          completed_at: prog ? prog.last_updated : null,
          start_date: prog ? prog.start_date : null,
          status: u.status || "active",
          created_at: u.created_at,
          last_login: u.last_login,
        };
      });

      // Sort by completed_at / last_updated descending
      history.sort((a, b) => {
        const ta = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const tb = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        return tb - ta;
      });

      return res.json({ history, total: history.length });
    } catch (error) {
      console.error("Error in /admin/api/history:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.patch(
  "/admin/api/users/:id/status",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const userId = req.params.id;
      const { status } = req.body;
      if (!["active", "inactive", "suspended", "pending"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const { data: user, error: fetchError } = await supabase
        .from("users")
        .select("user_id, user_type")
        .eq("user_id", userId)
        .single();

      if (fetchError || !user) {
        return res.status(404).json({ error: "User not found" });
      }
      if (user.user_type === "admin") {
        return res.status(403).json({ error: "Cannot change admin user status" });
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating user status:", updateError);
        return res.status(500).json({ error: "Failed to update status" });
      }

      return res.json({ success: true, status });
    } catch (error) {
      console.error("Error in PATCH /admin/api/users/:id/status:", error);
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
        name: [amb.first_name, amb.last_name].filter(Boolean).join(" ") || amb.email || "Ambassador",
        email: amb.email,
        access_code: amb.access_code,
        password: amb.generated_password || "", // ✅ Include password for admin reference
        status: amb.status,
        subscription_type: amb.subscription_type || "free", // ✅ Expose subscription type for admin UI
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
      const ambassadorId = req.params.id;

      log("🔍 Admin fetching ambassador:", ambassadorId);

      // Instead of just getUserById, you need:
      const { data: ambassador, error } = await supabase
        .from("ambassadors")
        .select(
          `
          *,
          users!inner (
            access_code,
            email,
            status
          )
        `
        )
        .eq("ambassador_id", ambassadorId)
        .single();

      if (error || !ambassador) {
        console.error("Error fetching ambassador:", error);
        return res.status(404).json({ error: "Ambassador not found" });
      }

      log(
        "📤 Sending ambassador data with access_code:",
        ambassador.users?.access_code
      );

      return res.json({
        id: ambassador.ambassador_id,
        name: ambassador.first_name || "Ambassador",
        email: ambassador.users?.email || ambassador.email,
        access_code: ambassador.users?.access_code, // ✅ NOW IT WILL WORK!
        password: ambassador.generated_password || "", // ✅ Include password for admin reference
        status: ambassador.users?.status || ambassador.status,
        subscription_type: ambassador.subscription_type || "free",
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

app.get(
  "/admin/api/articles/:id/notifications",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const articleId = req.params.id;

      log("📬 Fetching notifications for article:", articleId);

      // Get all notifications related to this article
      const { data: notifications, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("article_id", articleId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching article notifications:", error);
        throw error;
      }

      log("✅ Found", notifications?.length || 0, "notifications");

      return res.json({
        items: notifications || [],
        total: notifications?.length || 0,
      });
    } catch (error) {
      console.error("❌ Error fetching article notifications:", error);
      return res.status(500).json({
        error: "Failed to fetch notifications",
        details: error.message,
      });
    }
  }
);

app.post(
  "/admin/api/ambassadors",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      log("📝 Creating ambassador:", req.body);

      const { first_name, email, access_code, password, subscription_type } = req.body; // ✅ ADDED subscription_type

      if (!first_name || !email || !access_code || !password) {
        // CHANGED: name → first_name
        return res.status(400).json({
          error: "Name, email, access code, and password are required",
        });
      }

      const emailLower = email.toLowerCase().trim();
      const accessCodeUpper = access_code.toUpperCase().trim();

      // Check if email exists
      const existingUser = await getUserByEmail(emailLower, "ambassador");
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const salt = crypto.randomBytes(8).toString("hex");
      const hashedPassword = hashPassword(password, salt);

      const userData = {
        first_name: first_name, // CHANGED: name → first_name
        email: emailLower,
        access_code: accessCodeUpper,
        password_hash: hashedPassword,
        salt: salt,
        generated_password: password, // Store the plain text password for admin reference
        status: "active",
        subscription_type: subscription_type || "free", // ✅ NEW: Default to free
      };

      log("💾 Saving ambassador to database:", userData);

      const newAmbassador = await createUser(userData, "ambassador");

      log("✅ Ambassador created in database:", newAmbassador);

      // Initialize journey progress asynchronously (non-blocking)
      upsertJourneyProgress(
        newAmbassador.ambassador_id || newAmbassador.id,
        {
          current_month: 1,
          completed_tasks: {},
          start_date: new Date().toISOString(),
          month_start_dates: { 1: new Date().toISOString() },
        }
      ).then(() => {
        log("✅ Journey progress initialized");
      }).catch(error => {
        console.error("⚠️ Error initializing journey progress:", error);
      });

      // ========== SEND WELCOME EMAIL ASYNCHRONOUSLY (NON-BLOCKING) ==========
      // Send email in background to avoid blocking the response
      emailService.sendAmbassadorWelcome({
        name: newAmbassador.first_name || first_name,
        email: newAmbassador.email,
        access_code: newAmbassador.access_code,
        password: password, // Include the generated password in the email
      }).then(emailResult => {
        if (emailResult.success) {
          log("✅ Welcome email sent successfully");
        } else {
          console.warn("⚠️ Welcome email failed:", emailResult.error);
        }
      }).catch(error => {
        console.error("❌ Error sending welcome email:", error);
      });

      // Return immediately without waiting for email
      log("🎉 Ambassador creation COMPLETE (email sending in background)");

      return res.json({
        success: true,
        ambassador: {
          id: newAmbassador.ambassador_id || newAmbassador.id,
          name: newAmbassador.first_name,
          email: newAmbassador.email,
          access_code: newAmbassador.access_code,
          status: newAmbassador.status,
          subscription_type: newAmbassador.subscription_type, // ✅ NEW
        },
        emailSent: true, // Email is being sent in background
        message: "✅ Ambassador added! Welcome email will be sent shortly.",
      });
    } catch (error) {
      console.error("❌ Error creating ambassador:", error);
      return res.status(500).json({
        error: "Failed to create ambassador",
        details: error.message,
      });
    }
  }
);

// ✅ NEW: Endpoint to check ambassador subscription status
app.get(
  "/api/ambassador/subscription",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const userId = req.auth.userId;

      const ambassador = await getUserById(userId, "ambassador");
      if (!ambassador) {
        return res.status(404).json({ error: "Ambassador not found" });
      }

      return res.json({
        subscription_type: ambassador.subscription_type || "free",
        has_full_access: ambassador.subscription_type === "paid",
      });
    } catch (error) {
      console.error("Error checking subscription:", error);
      return res.status(500).json({ error: "Failed to check subscription" });
    }
  }
);

// ✅ NEW: Middleware to check subscription access
function requireSubscription(featureName) {
  return async function (req, res, next) {
    try {
      const userId = req.auth.userId;
      const ambassador = await getUserById(userId, "ambassador");

      if (!ambassador) {
        return res.status(404).json({ error: "Ambassador not found" });
      }

      // If paid subscription, allow all access
      if (ambassador.subscription_type === "paid") {
        return next();
      }

      // Free tier allowed features
      const freeFeatures = ["events", "partners", "impact-log", "chat"];

      if (freeFeatures.includes(featureName)) {
        return next();
      }

      // Feature not allowed for free tier
      return res.status(403).json({
        error: "This feature requires a paid subscription",
        subscription_type: "free",
        required_subscription: "paid",
      });
    } catch (error) {
      console.error("Subscription check error:", error);
      return res.status(500).json({ error: "Failed to verify subscription" });
    }
  };
}

app.put(
  "/admin/api/ambassadors/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { name, email, access_code, status, subscription_type } = req.body;
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
      if (subscription_type) updates.subscription_type = subscription_type;

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
          subscription_type: updatedAmbassador.subscription_type || "free",
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
      const { items: partnerItems } = await listUsers("partner", {});
      const partners = (partnerItems || []).map((p) => ({
        ...p,
        name: p.contact_person || p.organization_name || p.email || "Partner",
      }));
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
      log("📝 Creating partner:", req.body);

      const {
        contact_person,
        organization_name,
        email,
        access_code,
        password,
      } = req.body; // CHANGED

      if (!contact_person || !email || !access_code || !password) {
        // CHANGED: name → contact_person
        return res.status(400).json({
          error:
            "Contact person, email, access code, and password are required",
        });
      }

      const emailLower = email.toLowerCase().trim();
      const accessCodeUpper = access_code.toUpperCase().trim();

      // Check if email exists
      const existingUser = await getUserByEmail(emailLower, "partner");
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const salt = crypto.randomBytes(8).toString("hex");
      const hashedPassword = hashPassword(password, salt);

      const userData = {
        contact_person: contact_person, // CHANGED: contact_name → contact_person
        organization_name: organization_name || "", // CHANGED: company → organization_name
        email: emailLower,
        access_code: accessCodeUpper,
        password_hash: hashedPassword,
        salt: salt,
        generated_password: password, // Store the plain text password for admin reference
        status: "approved",
      };

      log("💾 Saving partner to database:", userData);

      const newPartner = await createUser(userData, "partner");

      log("✅ Partner created in database:", newPartner);

      // ========== SEND WELCOME EMAIL ASYNCHRONOUSLY (NON-BLOCKING) ==========
      // Send email in background to avoid blocking the response
      emailService.sendPartnerWelcome({
        name: newPartner.contact_person || contact_person,
        email: newPartner.email,
        company: newPartner.organization_name || organization_name,
        access_code: newPartner.access_code,
        password: password, // Include the generated password in the email
      }).then(emailResult => {
        if (emailResult.success) {
          log("✅ Welcome email sent successfully");
        } else {
          console.warn("⚠️ Welcome email failed:", emailResult.error);
        }
      }).catch(error => {
        console.error("❌ Error sending welcome email:", error);
      });

      // Return immediately without waiting for email
      log("🎉 Partner creation COMPLETE (email sending in background)");

      return res.json({
        success: true,
        partner: {
          id: newPartner.partner_id || newPartner.id,
          name: newPartner.contact_person || contact_person,
          email: newPartner.email,
          company: newPartner.organization_name,
          access_code: newPartner.access_code,
          status: newPartner.status,
        },
        emailSent: true, // Email is being sent in background
        message: "✅ Partner added! Welcome email will be sent shortly.",
      });
    } catch (error) {
      console.error("❌ Error creating partner:", error);
      return res.status(500).json({
        error: "Failed to create partner",
        details: error.message,
      });
    }
  }
);

// UPDATE Partner
app.put(
  "/admin/api/partners/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { contact_person, organization_name, email, access_code, status } = req.body;
      const partner = await getUserById(req.params.id, "partner");

      if (!partner) {
        return res.status(404).json({ error: "Partner not found" });
      }

      const updates = {};

      // Check if email is being changed and if it's already taken
      if (email && email.toLowerCase() !== partner.email.toLowerCase()) {
        const existingUser = await getUserByEmail(email.toLowerCase(), "partner");
        if (existingUser && existingUser.id !== req.params.id) {
          return res.status(400).json({ error: "Email already registered" });
        }
        updates.email = email.toLowerCase();
      }

      // Check if access code is being changed
      if (access_code && access_code !== partner.access_code) {
        updates.access_code = access_code.toUpperCase();
      }

      if (contact_person) updates.contact_person = contact_person;
      if (organization_name) updates.organization_name = organization_name;
      if (status) updates.status = status;

      const updatedPartner = await updateUser(req.params.id, updates, "partner");

      return res.json({
        success: true,
        partner: {
          id: updatedPartner.id,
          contact_person: updatedPartner.contact_person,
          organization_name: updatedPartner.organization_name,
          email: updatedPartner.email,
          access_code: updatedPartner.access_code,
          status: updatedPartner.status,
        },
      });
    } catch (error) {
      console.error("Error updating partner:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// DELETE Partner
app.delete(
  "/admin/api/partners/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const partner = await getUserById(req.params.id, "partner");
      if (!partner) {
        return res.status(404).json({ error: "Partner not found" });
      }

      await deleteUser(req.params.id, "partner");

      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting partner:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ============================================
// ADMIN: Generate Unique Access Codes
// ============================================

// Helper function to generate and verify unique code
async function generateUniqueCode(prefix, maxAttempts = 10) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate random 4-digit code
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const code = `${prefix}-${randomNum}`;

    // Check if code exists in database
    const { data: existingUsers, error } = await supabase
      .from("users")
      .select("user_id")
      .eq("access_code", code)
      .limit(1);

    if (error) {
      console.error("Error checking code uniqueness:", error);
      throw error;
    }

    // If no existing user found, code is unique
    if (!existingUsers || existingUsers.length === 0) {
      log(`✅ Generated unique code: ${code} (attempt ${attempt + 1})`);
      return code;
    }

    log(`⚠️ Code ${code} already exists, trying again...`);
  }

  // If we couldn't generate a unique code after max attempts
  throw new Error("Failed to generate unique code after multiple attempts");
}

// Generate unique ambassador code
app.post(
  "/api/admin/generate-code/ambassador",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      log("🔑 Generating unique ambassador code...");

      const code = await generateUniqueCode("T4LA");

      return res.json({
        success: true,
        code: code,
        message: "Unique code generated successfully",
      });
    } catch (error) {
      console.error("❌ Error generating ambassador code:", error);
      return res.status(500).json({
        error: "Failed to generate code",
        details: error.message,
      });
    }
  }
);

// Generate unique partner code
app.post(
  "/api/admin/generate-code/partner",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      log("🔑 Generating unique partner code...");

      const code = await generateUniqueCode("T4LP");

      return res.json({
        success: true,
        code: code,
        message: "Unique code generated successfully",
      });
    } catch (error) {
      console.error("❌ Error generating partner code:", error);
      return res.status(500).json({
        error: "Failed to generate code",
        details: error.message,
      });
    }
  }
);

// Generate secure password
app.post(
  "/api/admin/generate-password",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      log("🔑 Generating secure password...");

      // Generate a secure random password
      // 12 characters: mix of uppercase, lowercase, numbers, and special characters
      const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const lowercase = "abcdefghijklmnopqrstuvwxyz";
      const numbers = "0123456789";
      const special = "!@#$%^&*";
      const allChars = uppercase + lowercase + numbers + special;

      let password = "";
      // Ensure at least one of each type
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
      password += numbers[Math.floor(Math.random() * numbers.length)];
      password += special[Math.floor(Math.random() * special.length)];

      // Fill the rest randomly
      for (let i = password.length; i < 12; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
      }

      // Shuffle the password
      password = password
        .split("")
        .sort(() => Math.random() - 0.5)
        .join("");

      return res.json({
        success: true,
        password: password,
        message: "Secure password generated successfully",
      });
    } catch (error) {
      console.error("❌ Error generating password:", error);
      return res.status(500).json({
        error: "Failed to generate password",
        details: error.message,
      });
    }
  }
);

// ============================================
// ADMIN: Verify code uniqueness (optional check)
// ============================================
app.post(
  "/api/admin/verify-code",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ error: "Code is required" });
      }

      const { data: existingUsers, error } = await supabase
        .from("users")
        .select("user_id, email, user_type")
        .eq("access_code", code.toUpperCase())
        .limit(1);

      if (error) throw error;

      const isUnique = !existingUsers || existingUsers.length === 0;

      return res.json({
        unique: isUnique,
        code: code.toUpperCase(),
        existingUser: isUnique
          ? null
          : {
              type: existingUsers[0].user_type,
              email: existingUsers[0].email,
            },
      });
    } catch (error) {
      console.error("Error verifying code:", error);
      return res.status(500).json({ error: "Failed to verify code" });
    }
  }
);

// ------------------------
// Articles APIs
// ------------------------
app.get(
  "/admin/api/articles",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const statusFilter = req.query.status;
      const search = req.query.q;

      // Always join with ambassadors table
      let query = supabase.from("articles").select(
        `
        *,
        ambassadors!inner (
          first_name,
          last_name
        )
      `,
        { count: "exact" }
      );

      // Apply filters
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
      }

      query = query.order("created_at", { ascending: false });

      const { data: articles, error, count } = await query;

      if (error) throw error;

      // Format for table
      const formattedArticles = (articles || []).map((article) => {
        const ambassador = article.ambassadors;
        const authorName = ambassador
          ? `${ambassador.first_name || ""} ${
              ambassador.last_name || ""
            }`.trim()
          : "Unknown Author";

        // Calculate review history stats
        const reviewHistory = article.review_history || [];
        const pendingFeedback = reviewHistory.filter((r) => !r.addressed).length;

        return {
          id: article.article_id,
          article_id: article.article_id,
          title: article.title || "Untitled",
          authorNameRole: authorName, // ✅ From ambassadors table
          companyDescription: article.category || "General", // ✅ From article category
          status: article.status || "pending",
          createdAt: article.created_at,
          date: article.created_at
            ? new Date(article.created_at).toLocaleDateString()
            : "-",
          ambassadorName: authorName,
          review_history: reviewHistory, // ✅ Include full review history
          review_count: reviewHistory.length, // ✅ Total reviews count
          pending_feedback_count: pendingFeedback, // ✅ Unaddressed feedback count
          ambassador_consent_to_publish: article.ambassador_consent_to_publish || false, // ✅ Consent status
          consent_given_at: article.consent_given_at, // ✅ When consent was given
        };
      });

      return res.json({
        items: formattedArticles,
        total: count || 0,
      });
    } catch (error) {
      console.error("Error fetching articles:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);
// Add to server.js after other admin routes
app.get(
  "/admin-journey-tracker.html",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const user = await getUserById(req.auth.userId, "admin");
      if (!user) {
        return res.redirect("/admin-signin.html");
      }
      res.sendFile(
        path.join(__dirname, "public", "admin-journey-tracker.html")
      );
    } catch (error) {
      console.error("Admin journey tracker auth error:", error);
      return res.redirect("/admin-signin.html");
    }
  }
);

// ============================================
// ADMIN: GET SINGLE ARTICLE (REPLACE EXISTING)
// ============================================

app.get(
  "/admin/api/articles/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const articleId = req.params.id;

      log("📖 Fetching article with ambassador info:", articleId);

      // Get article WITH ambassador join
      const { data: article, error } = await supabase
        .from("articles")
        .select(
          `
        *,
        ambassadors!inner (
          first_name,
          last_name,
          email,
          user_id,
          ambassador_id
        )
      `
        )
        .eq("article_id", articleId)
        .single();

      if (error) {
        console.error("❌ Database error:", error);
        return res.status(500).json({
          error: "Database error",
          details: error.message,
        });
      }

      if (!article) {
        log("❌ Article not found:", articleId);
        return res.status(404).json({ error: "Article not found" });
      }

      // Extract ambassador info
      const ambassador = article.ambassadors;
      const ambassadorName = ambassador
        ? `${ambassador.first_name || ""} ${ambassador.last_name || ""}`.trim()
        : "Unknown Ambassador";

      const ambassadorEmail = ambassador?.email || "unknown@example.com";
      const ambassadorId = ambassador?.ambassador_id;

      // Build response
      const response = {
        id: article.article_id,
        article_id: article.article_id,
        ambassador_id: ambassadorId,
        title: article.title || "Untitled",
        content: article.content || "",
        contentHtml: article.content || "<p>No content</p>",
        excerpt: article.excerpt || "",
        authorNameRole: ambassadorName,
        author_name: ambassadorName,
        authorEmail: ambassadorEmail,
        status: article.status || "pending",
        publication_link: article.publication_link || null,
        category: article.category || "general",
        createdAt: article.created_at,
        updatedAt: article.updated_at,
        views: article.views || 0,
        likes: article.likes || 0,
        review_history: article.review_history || [], // ✅ Include review history for admin dashboard
      };

      log("✅ Article sent with ambassador_id:", ambassadorId);

      return res.json(response);
    } catch (error) {
      console.error("❌ Unexpected error:", error);
      return res.status(500).json({
        error: "Failed to fetch article",
        details: error.message,
      });
    }
  }
);

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
app.patch(
  "/admin/api/articles/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const articleId = req.params.id;
      const { status, publication_link, feedback_message } = req.body;
      const adminUserId = req.auth.userId;

      log("📝 Updating article status:", {
        articleId,
        status,
        publication_link,
        feedback_message,
        adminUserId,
      });

      // Check if article exists
      const { data: existingArticle, error: fetchError } = await supabase
        .from("articles")
        .select("*")
        .eq("article_id", articleId)
        .single();

      if (fetchError || !existingArticle) {
        return res.status(404).json({ error: "Article not found" });
      }

      // Get admin info for review history
      const admin = await getUserById(adminUserId, "admin");
      const adminName = admin
        ? `${admin.first_name || ""} ${admin.last_name || ""}`.trim() ||
          admin.name ||
          "Admin"
        : "Admin";
      const adminEmail = admin ? admin.email : "unknown";

      const updates = {};
      if (status) updates.status = status;
      if (publication_link) updates.publication_link = publication_link;
      updates.updated_at = new Date().toISOString();

      // Add to review history if there's a feedback message or status change
      let newReviewEntry = null;
      if (feedback_message || (status && status !== existingArticle.status)) {
        const existingHistory = existingArticle.review_history || [];
        newReviewEntry = {
          id: `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          admin_name: adminName,
          admin_email: adminEmail,
          message: feedback_message || `Status changed to ${status}`,
          old_status: existingArticle.status,
          new_status: status || existingArticle.status,
          timestamp: new Date().toISOString(),
          addressed: false,
        };
        updates.review_history = [...existingHistory, newReviewEntry];
        log("📝 Adding review history entry:", newReviewEntry);
      }

      // Try to update with review_history first
      let updatedArticle;
      let updateError;
      
      ({ data: updatedArticle, error: updateError } = await supabase
        .from("articles")
        .update(updates)
        .eq("article_id", articleId)
        .select()
        .single());

      // If review_history column doesn't exist, retry without it
      if (updateError && updateError.code === 'PGRST204' && updateError.message.includes('review_history')) {
        console.warn("⚠️ review_history column not found, updating without it. Please add the column to your Supabase articles table.");
        delete updates.review_history;
        
        ({ data: updatedArticle, error: updateError } = await supabase
          .from("articles")
          .update(updates)
          .eq("article_id", articleId)
          .select()
          .single());
      }

      if (updateError) {
        console.error("Error updating article:", updateError);
        throw updateError;
      }

      log("✅ Article updated successfully:", {
        article_id: updatedArticle.article_id,
        old_status: existingArticle.status,
        new_status: updatedArticle.status,
        review_history_count: (updatedArticle.review_history || []).length,
        status_match:
          existingArticle.status === updatedArticle.status
            ? "⚠️ SAME"
            : "✅ CHANGED",
      });

      return res.json({
        success: true,
        article: updatedArticle,
        message: `Article status updated to ${status}`,
      });
    } catch (error) {
      console.error("❌ Error updating article:", error);
      return res.status(500).json({
        error: "Failed to update article status",
        details: error.message,
      });
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
  "/api/ambassador/articles/latest",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const userId = req.auth.userId;

      log("📖 Fetching latest article for user_id:", userId);

      // ✅ Get ambassador using getUserById
      const ambassador = await getUserById(userId, "ambassador");
      if (!ambassador) {
        console.error("❌ Ambassador not found for user_id:", userId);
        return res.status(404).json({ error: "Ambassador not found" });
      }

      const ambassadorId = ambassador.ambassador_id || ambassador.id;
      log("✅ Found ambassador_id:", ambassadorId);

      // Get most recent article for this ambassador
      const { data: articles, error } = await supabase
        .from("articles")
        .select("*")
        .eq("ambassador_id", ambassadorId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching latest article:", error);
        throw error;
      }

      if (!articles || articles.length === 0) {
        log("📭 No articles found for ambassador:", ambassadorId);
        return res.status(404).json({ error: "No articles found" });
      }

      const article = articles[0];

      // Get notifications for this article
      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("article_id", article.article_id)
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false });

      // Format response
      const formattedArticle = {
        id: article.article_id,
        article_id: article.article_id,
        title: article.title,
        contentHtml: article.content,
        byline: article.excerpt,
        status: article.status,
        publication_link: article.publication_link,
        ambassador_consent_to_publish: article.ambassador_consent_to_publish || false,
        consent_given_at: article.consent_given_at,
        createdAt: article.created_at,
        updatedAt: article.updated_at,
        views: article.views || 0,
        likes: article.likes || 0,
      };

      const formattedNotifications = (notifications || []).map((notif) => ({
        id: notif.notification_id,
        type: notif.type,
        message: notif.message,
        createdAt: notif.created_at,
        read: notif.read,
      }));

      log("✅ Latest article sent:", formattedArticle.title);

      return res.json({
        article: formattedArticle,
        notifications: formattedNotifications,
      });
    } catch (error) {
      console.error("❌ Error in /api/ambassador/articles/latest:", error);
      return res.status(500).json({
        error: "Failed to fetch latest article",
        details: error.message,
      });
    }
  }
);

// 2. ✅ LIST ARTICLES ROUTE (NO PARAMS)
app.get(
  "/api/ambassador/articles",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const userId = req.auth.userId;
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      log("📖 Fetching articles for user_id:", userId);

      // ✅ FIX: First get the ambassador_id from the ambassadors table
      const ambassador = await getUserById(userId, "ambassador");
      if (!ambassador) {
        console.error("❌ Ambassador not found for user_id:", userId);
        return res.json({
          items: [],
          total: 0,
          limit,
          offset,
        });
      }

      const ambassadorId = ambassador.ambassador_id || ambassador.id;
      log("✅ Found ambassador_id:", ambassadorId);

      // ✅ Query articles using the correct ambassador_id
      const {
        data: articles,
        error,
        count,
      } = await supabase
        .from("articles")
        .select("*", { count: "exact" })
        .eq("ambassador_id", ambassadorId) // ✅ Use ambassador_id!
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Error fetching ambassador articles:", error);
        throw error;
      }
      // Format articles for frontend
      const formattedArticles = (articles || []).map((article) => ({
        id: article.article_id,
        article_id: article.article_id,
        title: article.title,
        contentHtml: article.content,
        byline: article.excerpt,
        status: article.status,
        publication_link: article.publication_link, // ← ADD HERE
        createdAt: article.created_at,
        updatedAt: article.updated_at,
        views: article.views || 0,
        likes: article.likes || 0,
      }));

      log("✅ Found", formattedArticles.length, "articles");

      return res.json({
        items: formattedArticles,
        total: count || 0,
        limit,
        offset,
      });
    } catch (error) {
      console.error("Error in /api/ambassador/articles:", error);
      return res.status(500).json({
        error: "Failed to fetch articles",
        details: error.message,
      });
    }
  }
);

// ============================================
// AMBASSADOR: Get single article by ID
// ============================================
app.get(
  "/api/ambassador/articles/:id",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const articleId = req.params.id;
      const userId = req.auth.userId;

      log(
        "📖 Ambassador fetching article:",
        articleId,
        "User:",
        userId
      );

      // ✅ FIX: First get the ambassador_id from the ambassadors table
      const ambassador = await getUserById(userId, "ambassador");
      if (!ambassador) {
        console.error("❌ Ambassador not found for user_id:", userId);
        return res.status(404).json({ error: "Ambassador not found" });
      }

      const ambassadorId = ambassador.ambassador_id || ambassador.id;
      log("✅ Found ambassador_id:", ambassadorId);

      // ✅ Get article and verify ownership using ambassador_id
      const { data: articles, error } = await supabase
        .from("articles")
        .select("*")
        .eq("article_id", articleId)
        .eq("ambassador_id", ambassadorId);

      if (error) {
        console.error("Error fetching article:", error);
        throw error;
      }

      if (!articles || articles.length === 0) {
        return res.status(404).json({ error: "Article not found" });
      }

      const article = articles[0];

      // ✅ CRITICAL FIX: Query notifications for THIS SPECIFIC ARTICLE and THIS USER
      log(
        "📬 Fetching notifications for article:",
        articleId,
        "user:",
        userId
      );

      const { data: notifications, error: notifError } = await supabase
        .from("notifications")
        .select("*")
        .eq("article_id", articleId) // Filter by article_id
        .eq("recipient_id", userId) // Filter by user_id (recipient)
        .order("created_at", { ascending: false });

      if (notifError) {
        console.error("⚠️ Error fetching notifications:", notifError);
        // Don't fail the whole request
      }

      log(
        "✅ Found",
        notifications?.length || 0,
        "notifications for this article and user"
      );

      // ✅ DEBUG LOG: Show notification details
      if (notifications && notifications.length > 0) {
        notifications.forEach((notif) => {
          log("  📧 Notification:", {
            id: notif.notification_id,
            type: notif.type,
            message: notif.message?.substring(0, 50) + "...",
            recipient_id: notif.recipient_id,
            article_id: notif.article_id,
          });
        });
      } else {
        log("  ⚠️ No notifications found");

        // Debug query to see ALL notifications for this article
        const { data: allArticleNotifs } = await supabase
          .from("notifications")
          .select("*")
          .eq("article_id", articleId);

        log(
          `  🔍 Total notifications for article ${articleId}:`,
          allArticleNotifs?.length || 0
        );

        if (allArticleNotifs && allArticleNotifs.length > 0) {
          log("  🔍 Notifications found but not for current user:");
          allArticleNotifs.forEach((notif) => {
            log(
              "    - recipient_id:",
              notif.recipient_id,
              "user_id:",
              userId,
              "match:",
              notif.recipient_id === userId
            );
          });
        }
      }

      // Format response
      const formattedArticle = {
        id: article.article_id,
        article_id: article.article_id,
        ambassador_id: article.ambassador_id,
        title: article.title,
        contentHtml: article.content,
        byline: article.excerpt,
        status: article.status,
        publication_link: article.publication_link,
        ambassador_consent_to_publish: article.ambassador_consent_to_publish || false,
        consent_given_at: article.consent_given_at,
        createdAt: article.created_at,
        updatedAt: article.updated_at,
        views: article.views || 0,
        likes: article.likes || 0,
      };

      // ✅ DEBUG: Log the status being returned
      log("📊 Returning article status to ambassador:", {
        article_id: article.article_id,
        status_from_db: article.status,
        status_type: typeof article.status,
        formatted_status: formattedArticle.status,
      });

      const formattedNotifications = (notifications || []).map((notif) => ({
        id: notif.notification_id,
        type: notif.type,
        message: notif.message,
        createdAt: notif.created_at,
        read: notif.read,
      }));

      return res.json({
        article: formattedArticle,
        notifications: formattedNotifications,
      });
    } catch (error) {
      console.error("Error in /api/ambassador/articles/:id:", error);
      return res.status(500).json({
        error: "Failed to fetch article",
        details: error.message,
      });
    }
  }
);
app.get("/api/debug/notifications-check", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const articleId = req.query.articleId;

    log("🔍 DEBUG NOTIFICATIONS CHECK:");
    log("  User ID:", userId);
    log("  Article ID:", articleId);

    // Get user's role
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("user_type")
      .eq("user_id", userId)
      .single();

    log("  User type:", user?.user_type);

    // Check all notifications for this article
    const { data: allNotifications } = await supabase
      .from("notifications")
      .select("*")
      .eq("article_id", articleId);

    log(
      "  Total notifications for article:",
      allNotifications?.length || 0
    );

    if (allNotifications && allNotifications.length > 0) {
      log("  All notifications:");
      allNotifications.forEach((notif) => {
        log(`    - ID: ${notif.notification_id}`);
        log(`      Type: ${notif.type}`);
        log(
          `      Recipient ID: ${notif.recipient_id} (matches user: ${
            notif.recipient_id === userId
          })`
        );
        log(
          `      Recipient Type: ${notif.recipient_type} (matches user type: ${
            notif.recipient_type === user?.user_type
          })`
        );
        log(`      Message: ${notif.message?.substring(0, 50)}...`);
        log(`      Created: ${notif.created_at}`);
      });
    }

    // Check notifications for this specific user
    const { data: userNotifications } = await supabase
      .from("notifications")
      .select("*")
      .eq("article_id", articleId)
      .eq("recipient_id", userId);

    log(
      "  User-specific notifications:",
      userNotifications?.length || 0
    );

    return res.json({
      userId,
      articleId,
      userType: user?.user_type,
      allNotifications: allNotifications || [],
      userNotifications: userNotifications || [],
      totalAll: allNotifications?.length || 0,
      totalUser: userNotifications?.length || 0,
    });
  } catch (error) {
    console.error("Debug error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================
// ✅ ALSO ADD: Debug endpoint to check notifications
// ============================================
app.get(
  "/api/debug/article-notifications/:articleId",
  requireAuth,
  async (req, res) => {
    try {
      const articleId = req.params.articleId;
      const userId = req.auth.userId;

      // Get all notifications for this article
      const { data: allNotifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("article_id", articleId);

      // Get notifications for current user
      const { data: userNotifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("article_id", articleId)
        .eq("recipient_id", userId);

      return res.json({
        articleId,
        currentUserId: userId,
        totalNotifications: allNotifications?.length || 0,
        userNotifications: userNotifications?.length || 0,
        allNotifications: allNotifications || [],
        userNotificationsData: userNotifications || [],
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
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

      log("Article submission request:", {
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

      log("User verified:", {
        user_id: req.auth.userId,
        ambassador_id: user.ambassador_id || user.id,
        email: user.email,
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

      log(
        "Creating article with ambassador_id:",
        articleData.ambassador_id
      );

      const newArticle = await createArticle(articleData);

      log("Article created successfully:", newArticle?.article_id);

      // Notify admins about the new article submission
      try {
        const { data: admins } = await supabase.from("admins").select("user_id");
        if (admins && admins.length > 0) {
          const ambassadorName = `${user.first_name || ""} ${
            user.last_name || ""
          }`.trim() || "An ambassador";
          for (const admin of admins) {
            await createNotification(
              admin.user_id,
              "admin",
              "article_submitted",
              "📝 New Article Submitted",
              `${ambassadorName} submitted a new article: "${title}"`,
              `/admin-dashboard.html`,
              null,
              null,
              newArticle.article_id
            );
          }
          log("✅ Admin notifications sent for article submission");
        }
      } catch (notifError) {
        console.error("⚠️ Failed to notify admins:", notifError.message);
      }

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
app.post(
  "/admin/api/notifications",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { articleId, type, message, ambassadorId } = req.body;
      const adminUserId = req.auth.userId;

      log("📤 Creating admin notification:", {
        articleId,
        type,
        hasAmbassadorId: !!ambassadorId,
        adminUserId,
      });

      // Get article details if not provided
      let targetArticleId = articleId;
      let targetAmbassadorId = ambassadorId;

      if (articleId && !ambassadorId) {
        // Fetch article to get ambassador ID
        const { data: article, error: articleError } = await supabase
          .from("articles")
          .select("ambassador_id")
          .eq("article_id", articleId)
          .single();

        if (articleError || !article) {
          return res.status(404).json({ error: "Article not found" });
        }
        targetAmbassadorId = article.ambassador_id;
      }

      if (!targetAmbassadorId) {
        return res.status(400).json({ error: "Ambassador ID is required" });
      }

      log("🔍 Getting ambassador user_id for:", targetAmbassadorId);

      // Get ambassador's user_id
      const { data: ambassador, error: ambassadorError } = await supabase
        .from("ambassadors")
        .select("user_id, first_name, last_name, email")
        .eq("ambassador_id", targetAmbassadorId)
        .single();

      if (ambassadorError || !ambassador) {
        console.error("❌ Ambassador not found:", targetAmbassadorId);
        return res.status(404).json({ error: "Ambassador not found" });
      }

      log("✅ Found ambassador:", {
        user_id: ambassador.user_id,
        name: `${ambassador.first_name} ${ambassador.last_name}`,
        email: ambassador.email,
      });

      // Get admin info
      const admin = await getUserById(adminUserId, "admin");
      const adminName = admin
        ? admin.first_name || admin.name || "Admin"
        : "Admin";

      // Determine notification content based on type (now receives direct status values)
      let notificationTitle, notificationLink;
      const notificationType = type || "needs_update";
      
      log("📋 Notification type received from frontend:", type);
      log("📋 Using notification type:", notificationType);

      // Handle BOTH old format (article_approved) and new direct format (approved)
      const normalizedType = notificationType.toLowerCase().replace('article_', '');
      
      if (normalizedType === "published" || notificationType === "ready_to_publish") {
        notificationTitle = "🎉 Your Article Has Been Published!";
        notificationLink = `/article-progress.html?articleId=${
          targetArticleId || ""
        }`;
      } else if (normalizedType === "approved") {
        notificationTitle = "✅ Your Article Has Been Approved!";
        notificationLink = `/ambassador-review.html?articleId=${
          targetArticleId || ""
        }`;
      } else if (normalizedType === "rejected") {
        notificationTitle = "❌ Article Not Approved";
        notificationLink = `/ambassador-review.html?articleId=${
          targetArticleId || ""
        }`;
      } else if (normalizedType === "pending") {
        notificationTitle = "⏳ Article Under Review";
        notificationLink = `/ambassador-review.html?articleId=${
          targetArticleId || ""
        }`;
      } else if (normalizedType === "needs_update") {
        notificationTitle = "📝 Article Needs Updates";
        notificationLink = `/ambassador-review.html?articleId=${
          targetArticleId || ""
        }`;
      } else {
        notificationTitle = "📝 Article Update";
        notificationLink = `/article-progress.html?articleId=${
          targetArticleId || ""
        }`;
      }

      // Create notification
      const notificationData = {
        notification_id: uuidv4(),
        recipient_id: ambassador.user_id, // ✅ CRITICAL: Use ambassador's user_id
        recipient_type: "ambassador",
        type: notificationType,
        title: notificationTitle,
        message: message || "Your article needs some updates.",
        link: notificationLink,
        article_id: targetArticleId,
        read: false,
        created_at: new Date().toISOString(),
      };

      log("📝 Creating notification with data:", notificationData);

      const { data: notification, error: notificationError } = await supabase
        .from("notifications")
        .insert([notificationData])
        .select()
        .single();

      if (notificationError) {
        console.error("❌ Error creating notification:", notificationError);
        throw notificationError;
      }

      log(
        "✅ Notification created successfully:",
        notification.notification_id
      );

      return res.json({
        success: true,
        notification,
        message: "Notification sent successfully (review history updated via /admin/api/articles/:id)",
      });
    } catch (error) {
      console.error("❌ Error creating notification:", error);
      return res.status(500).json({
        error: "Failed to send notification",
        details: error.message,
      });
    }
  }
);

// ============================================
// ADMIN: Clean Up Duplicate Review History Entries
// ============================================

app.post(
  "/admin/api/articles/cleanup-duplicates",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      log("🧹 Starting duplicate review cleanup...");

      // Get all articles with review history
      const { data: articles, error: fetchError } = await supabase
        .from("articles")
        .select("article_id, title, review_history")
        .not("review_history", "is", null);

      if (fetchError) {
        console.error("❌ Error fetching articles:", fetchError);
        throw fetchError;
      }

      log(`📊 Found ${articles?.length || 0} articles with review history`);

      let totalCleaned = 0;
      let totalDuplicatesRemoved = 0;

      for (const article of articles || []) {
        const reviewHistory = article.review_history || [];
        
        if (reviewHistory.length === 0) continue;

        log(`\n🔍 Checking article: ${article.title}`);
        log(`   Original review count: ${reviewHistory.length}`);

        // Remove duplicates based on timestamp + message + admin
        const seen = new Map();
        const cleaned = [];

        for (const review of reviewHistory) {
          // Create unique key based on timestamp + message + admin
          const key = `${review.timestamp}_${review.message}_${review.admin_email}`;
          
          if (!seen.has(key)) {
            seen.set(key, true);
            cleaned.push(review);
          } else {
            log(`   ❌ Found duplicate: ${review.message?.substring(0, 30)}... at ${review.timestamp}`);
            totalDuplicatesRemoved++;
          }
        }

        // If duplicates were found, update the article
        if (cleaned.length < reviewHistory.length) {
          log(`   ✅ Cleaning: ${reviewHistory.length} → ${cleaned.length} reviews`);
          
          const { error: updateError } = await supabase
            .from("articles")
            .update({
              review_history: cleaned,
              updated_at: new Date().toISOString()
            })
            .eq("article_id", article.article_id);

          if (updateError) {
            console.error(`   ⚠️ Failed to update article ${article.article_id}:`, updateError);
          } else {
            totalCleaned++;
          }
        } else {
          log(`   ✓ No duplicates found`);
        }
      }

      log("\n📊 CLEANUP SUMMARY:");
      log(`   Articles checked: ${articles?.length || 0}`);
      log(`   Articles cleaned: ${totalCleaned}`);
      log(`   Duplicate reviews removed: ${totalDuplicatesRemoved}`);

      return res.json({
        success: true,
        summary: {
          articlesChecked: articles?.length || 0,
          articlesCleaned: totalCleaned,
          duplicatesRemoved: totalDuplicatesRemoved
        },
        message: `Removed ${totalDuplicatesRemoved} duplicate reviews from ${totalCleaned} articles`
      });

    } catch (error) {
      console.error("❌ Error during cleanup:", error);
      return res.status(500).json({
        error: "Failed to clean up duplicates",
        details: error.message
      });
    }
  }
);

// Helper function to extract URL from message
function extractPublicationLink(message) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = message.match(urlRegex);
  return matches ? matches[0] : null;
}

app.patch(
  "/api/ambassador/articles/:id",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const articleId = req.params.id;
      const { title, contentHtml, byline, status } = req.body;

      // ✅ CRITICAL: Get ambassador_id from the user
      const ambassador = await getUserById(req.auth.userId, "ambassador");
      if (!ambassador) {
        console.error("❌ Ambassador not found for user_id:", req.auth.userId);
        return res.status(404).json({ error: "Ambassador not found" });
      }

      const ambassadorId = ambassador.ambassador_id || ambassador.id;
      log(
        "✅ Found ambassador_id:",
        ambassadorId,
        "for user_id:",
        req.auth.userId
      );

      // Check if article exists and belongs to the user
      const existingArticle = await getArticleById(articleId);
      if (!existingArticle) {
        return res.status(404).json({ error: "Article not found" });
      }

      // ✅ FIX: Verify the article belongs to the current user using ambassador_id
      if (existingArticle.ambassador_id !== ambassadorId) {
        console.error("❌ Article ownership mismatch:", {
          article_ambassador_id: existingArticle.ambassador_id,
          user_ambassador_id: ambassadorId,
        });
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

      // ✅ Mark all previous unaddressed feedback as "addressed" when ambassador resubmits
      const existingHistory = existingArticle.review_history || [];
      if (existingHistory.length > 0) {
        const updatedHistory = existingHistory.map((entry) => {
          if (!entry.addressed) {
            log(
              "📝 Marking feedback as addressed:",
              entry.id,
              "from:",
              entry.admin_name
            );
            return { ...entry, addressed: true, addressed_at: new Date().toISOString() };
          }
          return entry;
        });
        updates.review_history = updatedHistory;
        log(
          "✅ Marked",
          existingHistory.filter((e) => !e.addressed).length,
          "feedback entries as addressed"
        );
      }

      const updatedArticle = await updateArticle(articleId, updates);

      // Notify admins so the update appears in the bell — ambassador sent updated version after feedback
      try {
        const { data: admins } = await supabase.from("admins").select("user_id");
        if (admins && admins.length > 0) {
          const ambassadorName = `${ambassador.first_name || ""} ${ambassador.last_name || ""}`.trim() || "An ambassador";
          const articleTitle = (updatedArticle.title || existingArticle.title || "Article").substring(0, 60);
          for (const admin of admins) {
            await createNotification(
              admin.user_id,
              "admin",
              "article_updated",
              "📝 Article Updated",
              `${ambassadorName} submitted an updated version: "${articleTitle}"`,
              "/admin-dashboard.html",
              null,
              null,
              articleId
            );
          }
          log("✅ Admin notifications sent for article update");
        }
      } catch (notifError) {
        console.error("⚠️ Failed to notify admins of article update:", notifError.message);
      }

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

// ============================================
// AMBASSADOR CONSENT TO PUBLISH - NEW ENDPOINT
// ============================================
app.post(
  "/api/ambassador/articles/:id/consent-to-publish",
  requireAuth,
  requireRole("ambassador"),
  async (req, res) => {
    try {
      const articleId = req.params.id;
      const userId = req.auth.userId;

      log("📝 Ambassador giving consent to publish article:", articleId);

      // Get ambassador
      const ambassador = await getUserById(userId, "ambassador");
      if (!ambassador) {
        console.error("❌ Ambassador not found for user_id:", userId);
        return res.status(404).json({ error: "Ambassador not found" });
      }

      const ambassadorId = ambassador.ambassador_id || ambassador.id;

      // Check if article exists
      const existingArticle = await getArticleById(articleId);
      if (!existingArticle) {
        return res.status(404).json({ error: "Article not found" });
      }

      // Verify ownership
      if (existingArticle.ambassador_id !== ambassadorId) {
        console.error("❌ Article ownership mismatch");
        return res.status(403).json({ error: "You can only consent to publish your own articles" });
      }

      // Verify article is approved (only approved articles can receive consent)
      if (existingArticle.status !== "approved") {
        log("❌ Article status is not approved:", existingArticle.status);
        return res.status(400).json({ 
          error: "Only approved articles can receive publishing consent",
          currentStatus: existingArticle.status
        });
      }

      // Update article with consent
      const updates = {
        ambassador_consent_to_publish: true,
        consent_given_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Try to update with consent fields
      let updatedArticle;
      let updateError;
      
      ({ data: updatedArticle, error: updateError } = await supabase
        .from("articles")
        .update(updates)
        .eq("article_id", articleId)
        .select()
        .single());

      // If consent column doesn't exist, just log and return success anyway
      if (updateError && (updateError.code === 'PGRST204' || updateError.message?.includes('ambassador_consent_to_publish'))) {
        console.warn("⚠️ ambassador_consent_to_publish column not found in articles table. Please add these columns:");
        console.warn("  - ambassador_consent_to_publish (boolean, default false)");
        console.warn("  - consent_given_at (timestamp)");
        
        // Still return success - the consent is recorded in the notification
        updatedArticle = existingArticle;
      } else if (updateError) {
        console.error("Error updating article with consent:", updateError);
        throw updateError;
      }

      // Notify all admins in the bell so they remember to share the publication
      try {
        const { data: admins } = await supabase.from("admins").select("user_id");
        if (admins && admins.length > 0) {
          const ambassadorName = `${ambassador.first_name || ""} ${ambassador.last_name || ""}`.trim() || ambassador.name || "An ambassador";
          const articleTitle = (existingArticle.title || "Article").substring(0, 60);
          for (const admin of admins) {
            await createNotification(
              admin.user_id,
              "admin",
              "ambassador_consent_to_publish",
              "✅ Ready to publish – ambassador consent",
              `${ambassadorName} allowed you to publish. Remember to share: "${articleTitle}"`,
              "/admin-dashboard.html",
              null,
              null,
              articleId,
              null
            );
          }
          log("✅ Admin notifications sent for ambassador consent to publish");
        }
      } catch (notifError) {
        console.warn("⚠️ Failed to create admin notifications for consent:", notifError.message);
      }

      log("✅ Ambassador consent to publish recorded for article:", articleId);

      return res.json({
        success: true,
        message: "Consent to publish recorded successfully",
        article: {
          id: articleId,
          status: existingArticle.status,
          ambassador_consent_to_publish: true,
          consent_given_at: updates.consent_given_at
        }
      });
    } catch (error) {
      console.error("❌ Error recording consent to publish:", error);
      return res.status(500).json({ 
        error: "Failed to record consent to publish",
        details: error.message 
      });
    }
  }
);

// Get ALL posts with application status for current user
// ============================================
app.get("/api/posts", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const userRole = req.auth.role;

    log("📖 Fetching posts for user:", userId, "role:", userRole);

    // Get all posts (getPosts returns [] on error)
    const posts = await getPosts();

    // If user is an ambassador, check which posts they've applied to
    if (userRole === "ambassador") {
      try {
        const ambassador = await getUserById(userId, "ambassador");

        if (ambassador) {
          const ambassadorId = ambassador.ambassador_id || ambassador.id;
          log("✅ Ambassador ID:", ambassadorId);

          const { data: applications, error } = await supabase
            .from("applications")
            .select("post_id, status")
            .eq("ambassador_id", ambassadorId);

          if (error) {
            console.error("Error fetching applications:", error);
          }

          // Normalize status values for ambassadors:
          // - DB may store variants like "approved", "APPROVED ", "accepted_by_partner", etc.
          // - Some rows may have different casing or extra whitespace.
          // We normalize everything to: "pending" | "accepted" | "rejected".
          // Any non-empty status that is NOT "pending" or "rejected" is treated as "accepted".
          // When multiple applications exist per post, we keep the "best" status:
          // accepted > rejected > pending.
          const statusPriority = { pending: 1, rejected: 2, accepted: 3 };
          const applicationStatusMap = new Map();

          (applications || []).forEach((app) => {
            const raw = (app.status || "").toString().trim().toLowerCase();
            let normalizedStatus;

            if (raw === "rejected") {
              normalizedStatus = "rejected";
            } else if (!raw || raw === "pending") {
              normalizedStatus = "pending";
            } else {
              // Any other non-empty status (approved, accepted_by_partner, etc.)
              // is treated as accepted for the ambassador UI.
              normalizedStatus = "accepted";
            }

            const current = applicationStatusMap.get(app.post_id);
            if (
              !current ||
              (statusPriority[normalizedStatus] || 0) >
                (statusPriority[current] || 0)
            ) {
              applicationStatusMap.set(app.post_id, normalizedStatus);
            }
          });

          const postsWithStatus = (posts || []).map((post) => ({
            ...post,
            hasApplied: applicationStatusMap.has(post.post_id),
            applicationStatus: applicationStatusMap.get(post.post_id) || null,
          }));

          return res.json({ posts: postsWithStatus });
        }
      } catch (ambError) {
        console.error("Error enriching posts for ambassador:", ambError);
        // Fall through: return posts without status
      }
    }

    return res.json({ posts: posts || [] });
  } catch (error) {
    console.error("Error fetching posts:", error);
    // Return 200 with empty list so dashboard/visibility calls still render
    return res.json({ posts: [] });
  }
});

// ✅ FIXED: Get posts for the logged-in partner
app.get(
  "/api/partner/posts",
  requireAuth,
  requireRole("partner"),
  async (req, res) => {
    try {
      const userId = req.auth.userId; // This is the user_id from session

      log("📖 Fetching posts for user_id:", userId);

      // ✅ FIX: First get the partner_id from the partners table
      const { data: partner, error: partnerError } = await supabase
        .from("partners")
        .select("partner_id")
        .eq("user_id", userId) // Lookup by user_id
        .single();

      if (partnerError || !partner) {
        console.error("❌ Partner not found for user_id:", userId);
        return res.json({ posts: [], total: 0 });
      }

      log("✅ Found partner_id:", partner.partner_id);

      // ✅ Now fetch posts using the correct partner_id
      const { data: posts, error } = await supabase
        .from("posts")
        .select("*")
        .eq("partner_id", partner.partner_id) // Use partner_id from lookup
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error fetching posts:", error);
        throw error;
      }

      log("✅ Found", posts?.length || 0, "posts");

      return res.json({
        posts: posts || [],
        total: posts?.length || 0,
      });
    } catch (error) {
      console.error("❌ Error fetching partner posts:", error);
      return res.status(500).json({
        error: "Failed to fetch posts",
        details: error.message,
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
      const {
        title,
        content,
        category,
        format,
        location,
        deadline,
        liftPillars,
      } = req.body;

      log("📝 Creating post:", {
        title: title?.substring(0, 50),
        content: content?.substring(0, 50),
        category,
        user_id: req.auth.userId, // ✅ This is the user_id
      });

      // Validation
      if (!title || !content) {
        return res
          .status(400)
          .json({ error: "Title and content are required" });
      }

      // ✅ Require location and deadline (applicants need to know where and when)
      if (!location || location.trim() === '') {
        return res
          .status(400)
          .json({ error: "Location is required. Applicants need to know where the opportunity is located." });
      }

      if (!deadline) {
        return res
          .status(400)
          .json({ error: "Deadline is required. Applicants need to know the application deadline." });
      }

      // ✅ FIX: Get the partner_id from the partners table using user_id
      const { data: partner, error: partnerError } = await supabase
        .from("partners")
        .select("partner_id")
        .eq("user_id", req.auth.userId) // ✅ Look up by user_id
        .single();

      if (partnerError || !partner) {
        console.error("❌ Partner not found for user_id:", req.auth.userId);
        return res.status(404).json({ error: "Partner profile not found" });
      }

      log("✅ Found partner_id:", partner.partner_id);

      // Generate UUID for post
      const postId = uuidv4();

      const postData = {
        post_id: postId,
        title: title.trim(),
        content: content.trim(),
        category: category || "general",
        partner_id: partner.partner_id, // ✅ Use the correct partner_id
        location: location.trim(), // ✅ Required: Applicants need to know location
        deadline: deadline, // ✅ Required: Applicants need to know deadline
        format: format || null,
        lift_pillars: liftPillars || null,
      };

      log(
        "💾 Inserting post into database with partner_id:",
        partner.partner_id
      );

      const { data: newPost, error } = await supabase
        .from("posts")
        .insert([postData])
        .select()
        .single();

      if (error) {
        console.error("❌ Supabase error:", error);
        throw error;
      }

      log("✅ Post created successfully:", newPost.post_id);

      // Notify admins and ambassadors about the new post created by a partner
      try {
        // Resolve partner display name once
        let partnerName = "A partner";
        try {
          const { data: partnerProfile } = await supabase
            .from("partners")
            .select("organization_name, contact_person")
            .eq("partner_id", partner.partner_id)
            .single();
          partnerName =
            partnerProfile?.organization_name ||
            partnerProfile?.contact_person ||
            partnerName;
        } catch (e) {
          // Non-fatal – fall back to default name
        }

        // 🔔 Notify all admins
        try {
          const { data: admins } = await supabase
            .from("admins")
            .select("user_id");

          if (admins && admins.length > 0) {
            for (const admin of admins) {
              await createNotification(
                admin.user_id,
                "admin",
                "post_created",
                "💼 New Opportunity Posted",
                `${partnerName} posted a new opportunity: "${title}"`,
                `/admin-dashboard.html`
              );
            }
            log("✅ Admin notifications sent for new post");
          }
        } catch (adminNotifError) {
          console.error(
            "⚠️ Failed to notify admins about new post:",
            adminNotifError.message
          );
        }

        // 🔔 Notify all ambassadors
        try {
          const { data: ambassadors } = await supabase
            .from("ambassadors")
            .select("user_id");

          if (ambassadors && ambassadors.length > 0) {
            for (const amb of ambassadors) {
              // ⚡ Don't block the response on each notification – fire-and-forget
              createNotification(
                amb.user_id,
                "ambassador",
                "new_partner_post",
                "New Opportunity Available",
                `${partnerName} just posted a new opportunity: "${title}"`,
                `/Partner-Calls.html`
              ).catch((err) => {
                console.error(
                  "⚠️ Failed to create ambassador notification for new post:",
                  err?.message || err
                );
              });
            }
            log(
              "✅ Ambassador notifications sent for new partner post"
            );
          }
        } catch (ambNotifError) {
          console.error(
            "⚠️ Failed to notify ambassadors about new post:",
            ambNotifError.message
          );
        }
      } catch (notifError) {
        console.error("⚠️ Failed to send notifications:", notifError.message);
      }

      return res.json({
        success: true,
        post: newPost,
        message: "Post created successfully",
      });
    } catch (error) {
      console.error("❌ Error creating post:", error);
      return res.status(500).json({
        error: "Failed to create post",
        details: error.message,
      });
    }
  }
);

// ============================================
// PARTNER: Delete a post
// ============================================
app.delete(
  "/api/posts/:id",
  requireAuth,
  requireRole("partner"),
  async (req, res) => {
    try {
      const partnerId = req.auth.userId;
      const postId = req.params.id;

      log("🗑️ Deleting post:", postId, "for partner:", partnerId);

      // Verify the post belongs to this partner
      const { data: post, error: fetchError } = await supabase
        .from("posts")
        .select("*")
        .eq("post_id", postId)
        .eq("partner_id", partnerId)
        .single();

      if (fetchError || !post) {
        return res.status(404).json({
          error: "Post not found or you do not have permission to delete it",
        });
      }

      // Delete the post
      const { error: deleteError } = await supabase
        .from("posts")
        .delete()
        .eq("post_id", postId)
        .eq("partner_id", partnerId);

      if (deleteError) {
        console.error("Error deleting post:", deleteError);
        throw deleteError;
      }

      log("✅ Post deleted successfully:", postId);

      return res.json({
        success: true,
        message: "Post deleted successfully",
      });
    } catch (error) {
      console.error("❌ Error deleting post:", error);
      return res.status(500).json({
        error: "Failed to delete post",
        details: error.message,
      });
    }
  }
);
// ============================================
// 5. DELETE SERVICE (Owner Only)
// ============================================
app.delete(
  "/api/services/:id",
  requireAuth,
  requireRole("partner"),
  async (req, res) => {
    try {
      const serviceId = req.params.id;
      const userId = req.auth.userId;

      log("🗑️ Deleting service:", { serviceId, userId });

      // Verify service exists and belongs to this partner
      const service = await getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      const partner = await getUserById(userId, "partner");
      if (
        !partner ||
        (partner.partner_id !== service.partner_id &&
          partner.id !== service.partner_id)
      ) {
        return res
          .status(403)
          .json({ error: "Not authorized to delete this service" });
      }

      await deleteService(serviceId);

      return res.json({
        success: true,
        message: "Service deleted successfully",
      });
    } catch (error) {
      console.error("❌ Error deleting service:", error);
      return res.status(500).json({
        error: "Failed to delete service",
        details: error.message,
      });
    }
  }
);

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

// Add this to server.js for debugging
app.get("/api/notifications/debug", requireAuth, async (req, res) => {
    try {
        const userId = req.auth.userId;
        
        log("🔍 DEBUG: Fetching ALL notifications for user:", userId);
        
        const { data: notifications, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("recipient_id", userId)
            .order("created_at", { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        log("📊 DEBUG: Found", notifications?.length || 0, "notifications");
        
        // Log each notification
        notifications?.forEach((n, i) => {
            log(`  ${i+1}. ID: ${n.notification_id.substring(0,8)}...`);
            log(`     Type: ${n.type}`);
            log(`     Recipient Type: ${n.recipient_type}`);
            log(`     Read: ${n.read}`);
            log(`     Message: ${n.message_text?.substring(0, 50)}...`);
            log(`     Created: ${n.created_at}`);
        });
        
        return res.json({
            userId,
            total: notifications?.length || 0,
            unreadCount: notifications?.filter(n => !n.read).length || 0,
            notifications: notifications || [],
            byRecipientType: notifications?.reduce((acc, n) => {
                acc[n.recipient_type] = (acc[n.recipient_type] || 0) + 1;
                return acc;
            }, {})
        });
    } catch (error) {
        console.error("❌ Debug error:", error);
        return res.status(500).json({ error: error.message });
    }
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

      const ambassadorId = user.ambassador_id || user.id;

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

      // Get ambassador's articles stats
      const { data: ambassadorArticles } = await supabase
        .from("articles")
        .select("*")
        .eq("ambassador_id", ambassadorId);

      const myArticles = ambassadorArticles || [];
      const pendingArticles = myArticles.filter(
        (a) => a.status === "pending" || a.status === "needs_update"
      );
      const publishedArticles = myArticles.filter(
        (a) => a.status === "published"
      );

      // Calculate next article due date (monthly article requirement)
      const currentMonth = progress.current_month || 1;
      const startDate = new Date(user.created_at || Date.now());
      const nextArticleDue = new Date(startDate);
      nextArticleDue.setMonth(nextArticleDue.getMonth() + currentMonth);

      // Get ambassador's partner applications
      const { data: applications } = await supabase
        .from("applications")
        .select("*, posts(title)")
        .eq("ambassador_id", ambassadorId);

      const myApplications = applications || [];
      const pendingApps = myApplications.filter((a) => a.status === "pending");
      const acceptedApps = myApplications.filter(
        (a) => a.status === "accepted"
      );
      const rejectedApps = myApplications.filter(
        (a) => a.status === "rejected"
      );

      // Get service requests
      const { data: serviceRequests } = await supabase
        .from("service_requests")
        .select("*")
        .eq("ambassador_id", ambassadorId);

      const myServiceRequests = serviceRequests || [];
      const pendingServiceReqs = myServiceRequests.filter(
        (r) => r.status === "pending"
      );

      // Get recent published articles for display
      const recentArticles = publishedArticles.slice(0, 3).map((article) => ({
        id: article.article_id,
        title: article.title,
        excerpt: article.excerpt,
        date: article.created_at,
        category: article.category,
      }));

      // Calculate upcoming tasks count
      const currentMonthData = JOURNEY_MONTHS.find(
        (m) => m.month === currentMonth
      );
      const upcomingTasks = currentMonthData
        ? currentMonthData.tasks.filter(
            (t) => !completedTasks[`month${currentMonth}_${t.id}`]
          ).length
        : 0;

      return res.json({
        stats: {
          overallProgress,
          completedTasks: completedCount,
          totalTasks,
          upcomingTasks,
          currentMonth: progress.current_month,
          daysInProgram: Math.max(0, daysInProgram),
          daysRemaining: Math.max(0, 365 - daysInProgram),
        },
        articles: {
          total: myArticles.length,
          pending: pendingArticles.length,
          published: publishedArticles.length,
          nextDueDate: nextArticleDue.toISOString().split("T")[0],
        },
        applications: {
          total: myApplications.length,
          pending: pendingApps.length,
          accepted: acceptedApps.length,
          rejected: rejectedApps.length,
        },
        serviceRequests: {
          total: myServiceRequests.length,
          pending: pendingServiceReqs.length,
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
          organizationName: user.organization_name || "",
          contactName: user.contact_person || "",
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

// ============================================
// MEDIA LIBRARY API ENDPOINTS
// ============================================

// Get all media for current user (Paid ambassadors only)
app.get("/api/media", requireAuth, requireRole("ambassador"), requireSubscription("media-kit"), async (req, res) => {
  try {
    const userId = req.auth.userId;
    log(`📦 Fetching media for user: ${userId}`);
    
    // Get media from database (stored in memory for now)
    const userMedia = mediaLibrary.filter(m => m.user_id === userId);
    
    // Sort by created_at descending
    userMedia.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return res.json({ 
      success: true,
      media: userMedia 
    });
  } catch (error) {
    console.error("❌ Error fetching media:", error);
    return res.status(500).json({ error: "Failed to fetch media" });
  }
});

// Add new media (Paid ambassadors only)
app.post("/api/media", requireAuth, requireRole("ambassador"), requireSubscription("media-kit"), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { title, type, url, description } = req.body;
    
    // Validate required fields
    if (!title || !type || !url) {
      return res.status(400).json({ error: "Missing required fields: title, type, url" });
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: "Invalid URL format" });
    }
    
    // Validate type
    const validTypes = ['canva', 'image', 'video', 'document', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid media type. Must be one of: ${validTypes.join(', ')}` });
    }
    
    const mediaItem = {
      id: uuidv4(),
      user_id: userId,
      title: title.trim(),
      type: type.toLowerCase(),
      url: url.trim(),
      description: description ? description.trim() : '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Store in memory (in production, save to database)
    mediaLibrary.push(mediaItem);
    
    log(`✅ Media added: ${mediaItem.id}`);
    
    return res.json({
      success: true,
      media: mediaItem
    });
  } catch (error) {
    console.error("❌ Error adding media:", error);
    return res.status(500).json({ error: "Failed to add media" });
  }
});

// Delete media (Paid ambassadors only)
app.delete("/api/media/:id", requireAuth, requireRole("ambassador"), requireSubscription("media-kit"), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const mediaId = req.params.id;
    
    // Find and remove media
    const mediaIndex = mediaLibrary.findIndex(m => m.id === mediaId && m.user_id === userId);
    
    if (mediaIndex === -1) {
      return res.status(404).json({ error: "Media not found" });
    }
    
    const deletedMedia = mediaLibrary.splice(mediaIndex, 1)[0];
    
    log(`✅ Media deleted: ${mediaId}`);
    
    return res.json({
      success: true,
      message: "Media deleted successfully",
      media: deletedMedia
    });
  } catch (error) {
    console.error("❌ Error deleting media:", error);
    return res.status(500).json({ error: "Failed to delete media" });
  }
});

// Update media (Paid ambassadors only)
app.put("/api/media/:id", requireAuth, requireRole("ambassador"), requireSubscription("media-kit"), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const mediaId = req.params.id;
    const { title, description } = req.body;
    
    // Find media
    const media = mediaLibrary.find(m => m.id === mediaId && m.user_id === userId);
    
    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }
    
    // Update fields if provided
    if (title) media.title = title.trim();
    if (description !== undefined) media.description = description ? description.trim() : '';
    media.updated_at = new Date().toISOString();
    
    log(`✅ Media updated: ${mediaId}`);
    
    return res.json({
      success: true,
      media: media
    });
  } catch (error) {
    console.error("❌ Error updating media:", error);
    return res.status(500).json({ error: "Failed to update media" });
  }
});

// ------------------------
// Test Database Connection
// ------------------------
app.get("/test-db", async (req, res) => {
  try {
    const { data, error } = await supabase.from("partners").select("count");
    if (error) throw error;
    res.json({ success: true, message: "Database connected", data });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ------------------------
// 404 handler (avoid hanging requests in production)
// ------------------------
app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.status(404).send("Not found");
});

// ------------------------
// Initialize data
// ------------------------
ensureDataDir();
ensureUploadsDir(); // NEW LINE: Ensure uploads directory exists
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
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  if (process.env.NODE_ENV !== "production") {
    log(`Server running on http://localhost:${PORT}`);
  }
  // Start daily reminder scheduler
  scheduleDailyReminders();
  log('✅ Daily journey reminder system initialized');

  // Start LinkedIn audit reminder (once per ambassador, after first week)
  scheduleLinkedInAuditReminders();
  log(
    `[journey] Journey progress tracking ENABLED with REAL-TIME updates`
  );
  log(
    `[journey] Loaded ${journeyProgressByAmbassador.size} ambassador progress records`
  );
  log(`[data] Data directory: ${DATA_DIR}`);
  log(`[uploads] Uploads directory ready for CVs`);
  log(
    `[notifications] Notification system ENABLED with helper functions`
  );

  // Initialize Supabase Storage certificates bucket (non-blocking)
  initializeSupabaseStorage()
    .then(() => {
      log("✅ Supabase Storage initialization completed");
    })
    .catch((err) => {
      console.error(
        "❌ Supabase Storage initialization failed:",
        err?.message || err
      );
    });
});

// Graceful shutdown for production (SIGTERM/SIGINT)
function shutdown(signal) {
  console.log(`\n${signal} received, closing server gracefully...`);
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Log unhandled rejections (avoid silent failures in production)
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
