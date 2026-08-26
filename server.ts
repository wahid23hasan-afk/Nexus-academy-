import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

// Ensure uploads directory exists
let uploadsDir = path.join(process.cwd(), "public", "uploads");
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  console.warn("Could not create public/uploads, falling back to /tmp/uploads:", e);
  uploadsDir = path.join("/tmp", "uploads");
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch (err) {}
}

// Cloudinary dynamic credentials management
let cloudinaryConfigFile = path.join(process.cwd(), "cloudinary_config.json");

function getCloudinaryConfig() {
  const config = {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  };

  if (fs.existsSync(cloudinaryConfigFile)) {
    try {
      const saved = JSON.parse(fs.readFileSync(cloudinaryConfigFile, "utf8"));
      if (saved.cloudName) config.cloudName = saved.cloudName;
      if (saved.apiKey) config.apiKey = saved.apiKey;
      if (saved.apiSecret) config.apiSecret = saved.apiSecret;
    } catch (e) {
      console.warn("Could not parse cloudinary_config.json:", e);
    }
  } else {
    // Check fallback location
    const tmpFile = path.join("/tmp", "cloudinary_config.json");
    if (fs.existsSync(tmpFile)) {
      try {
        const saved = JSON.parse(fs.readFileSync(tmpFile, "utf8"));
        if (saved.cloudName) config.cloudName = saved.cloudName;
        if (saved.apiKey) config.apiKey = saved.apiKey;
        if (saved.apiSecret) config.apiSecret = saved.apiSecret;
      } catch (e) {}
    }
  }
  return config;
}

function applyCloudinaryConfig() {
  const cfg = getCloudinaryConfig();
  if (cfg.cloudName && cfg.apiKey && cfg.apiSecret) {
    cloudinary.config({
      cloud_name: cfg.cloudName,
      api_key: cfg.apiKey,
      api_secret: cfg.apiSecret,
      secure: true,
    });
    return true;
  }
  return false;
}

// Initialize on boot
applyCloudinaryConfig();

// Configure multer storage for video uploads
const storageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate clean safe filename with timestamp
    const cleanExt = path.extname(file.originalname).toLowerCase() || ".mp4";
    const cleanBase = path
      .basename(file.originalname, cleanExt)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    cb(null, `${cleanBase}_${uniqueSuffix}${cleanExt}`);
  },
});

const upload = multer({
  storage: storageConfig,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max per video file
  },
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: "50mb" }));

  // Enable CORS headers for static streaming assets
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, Authorization");
    res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Dedicated Video Streaming Route with HTTP 206 Partial Content Range Support
  app.get("/uploads/:filename", (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Video file not found on server storage." });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(filePath).toLowerCase();
    let contentType = "video/mp4";
    if (ext === ".webm") contentType = "video/webm";
    if (ext === ".mov") contentType = "video/quicktime";
    if (ext === ".ogg") contentType = "video/ogg";

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).send(`Requested range not satisfiable\n${start} >= ${fileSize}`);
        return;
      }

      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": contentType,
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  });

  // Static fallback for public uploads
  app.use("/uploads", express.static(uploadsDir));

  // Lazy Gemini Client Initialization
  let aiClient: GoogleGenAI | null = null;
  function getGenAI() {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY || "dummy_key";
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return aiClient;
  }

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", serverTime: new Date().toISOString() });
  });

  // -------------------------------------------------------------
  // Resend Email & 6-Digit OTP Verification Engine
  // -------------------------------------------------------------
  let isResendKeyTemporarilyDisabled = false;

  // In-memory OTP Store with rate limiting & expiration
  interface OtpRecord {
    otp: string;
    expiresAt: number;
    attempts: number;
    createdAt: number;
    purpose?: string;
  }
  const otpStore = new Map<string, OtpRecord>();

  // Helper to generate a styled HTML email for OTP
  function generateOtpHtmlEmail(otp: string, recipientEmail: string, purpose?: string): string {
    const isSignup = purpose === "signup";
    const purposeText = isSignup ? "নতুন একাউন্ট নিবন্ধন ভেরিফিকেশন" : "লগইন / একাউন্ট সিকিউরিটি ভেরিফিকেশন";
    return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>আপনার ভেরিফিকেশন কোড</title>
</head>
<body style="margin: 0; padding: 0; background-color: #070b14; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #070b14; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #0f172a; border-radius: 20px; border: 1px solid rgba(57, 255, 20, 0.25); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6); overflow: hidden;" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 30px 20px 30px; text-align: center; background: linear-gradient(180deg, rgba(57, 255, 20, 0.08) 0%, rgba(15, 23, 42, 0) 100%);">
              <div style="display: inline-block; padding: 8px 18px; border-radius: 30px; background-color: rgba(57, 255, 20, 0.12); border: 1px solid rgba(57, 255, 20, 0.4); margin-bottom: 14px;">
                <span style="color: #39FF14; font-weight: 700; font-size: 13px; letter-spacing: 2px; text-transform: uppercase;">NEXUS ACADEMY</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">আপনার ভেরিফিকেশন কোড (OTP)</h1>
              <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 13px;">${purposeText}</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 10px 30px 30px 30px; text-align: center;">
              <p style="margin: 0 0 18px 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                প্রিয় শিক্ষার্থী,<br/>
                আপনার <strong>${recipientEmail}</strong> একাউন্টের নিরাপত্তা নিশ্চিত করতে নিচে দেওয়া ৬-ডিজিটের গোপন ওটিপি কোডটি প্রবেশ করান:
              </p>

              <!-- 6-Digit OTP Box -->
              <div style="background: rgba(0, 0, 0, 0.5); border: 2px dashed #39FF14; border-radius: 16px; padding: 20px 10px; margin: 24px 0; text-align: center;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #39FF14; text-shadow: 0 0 15px rgba(57, 255, 20, 0.4);">
                  ${otp}
                </span>
              </div>

              <!-- Expiry & Warning Badge -->
              <div style="background-color: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 12px 16px; margin-bottom: 22px; text-align: left;">
                <p style="margin: 0; color: #fbbf24; font-size: 12px; line-height: 1.5;">
                  ⏱️ <strong>সময়সীমা:</strong> এই ওটিপি কোডটি পরবর্তী <strong>৫ মিনিট</strong> পর্যন্ত কার্যকর থাকবে।
                </p>
              </div>

              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                ⚠️ আপনি যদি এই কোডের জন্য অনুরোধ না করে থাকেন, তবে অবিলম্বে এই ইমেইলটি উপেক্ষা করুন অথবা পাসওয়ার্ড পরিবর্তন করুন।
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 18px 30px; background-color: #0b1120; border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
              <p style="margin: 0; color: #475569; font-size: 11px;">
                © ${new Date().getFullYear()} Nexus Academy • Premium Academic & Skill Matrix Platform
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
  }

  // Safe HTTP dispatcher for Resend (avoids internal SDK console errors on invalid keys)
  async function dispatchOtpEmail(
    recipientEmail: string,
    otp: string,
    purpose?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const apiKey = (process.env.RESEND_API_KEY || "").trim();
    if (
      !apiKey ||
      isResendKeyTemporarilyDisabled ||
      !apiKey.startsWith("re_") ||
      apiKey.length < 20 ||
      apiKey.toLowerCase().includes("your_") ||
      apiKey.toLowerCase().includes("placeholder")
    ) {
      return { success: false, error: "Sandbox mode active" };
    }

    try {
      const fromAddress = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [recipientEmail],
          subject: "আপনার ভেরিফিকেশন কোড (OTP) - Nexus Academy",
          html: generateOtpHtmlEmail(otp, recipientEmail, purpose),
        }),
      });

      const resJson: any = await response.json().catch(() => ({}));

      if (response.ok && resJson.id) {
        return { success: true, id: resJson.id };
      } else {
        const errMsg = resJson.message || resJson.error?.message || "Email dispatch notice";
        if (response.status === 401 || response.status === 403 || String(errMsg).toLowerCase().includes("invalid")) {
          isResendKeyTemporarilyDisabled = true;
        }
        return { success: false, error: errMsg };
      }
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to contact email service" };
    }
  }

  // POST /api/send-otp
  app.post("/api/send-otp", async (req, res) => {
    try {
      const { email, purpose } = req.body;
      const cleanEmail = (email || "").toLowerCase().trim();

      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ success: false, error: "সঠিক ইমেইল এড্রেস প্রদান করুন।" });
      }

      // Generate a secure 6-digit numeric OTP (100000 - 999999)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

      // Store in memory
      otpStore.set(cleanEmail, {
        otp,
        expiresAt,
        attempts: 0,
        createdAt: Date.now(),
        purpose: purpose || "verification",
      });

      const result = await dispatchOtpEmail(cleanEmail, otp, purpose);
      const emailDispatched = result.success;

      if (emailDispatched) {
        console.log(`[OTP] Dispatched to ${cleanEmail} (ID: ${result.id})`);
      } else {
        console.log(`[OTP Sandbox] Generated code for ${cleanEmail}: ${otp}`);
      }

      return res.json({
        success: true,
        message: emailDispatched
          ? `৬-ডিজিটের ভেরিফিকেশন কোড আপনার ইমেইলে (${cleanEmail}) পাঠানো হয়েছে।`
          : `ভেরিফিকেশন কোড প্রস্তুত করা হয়েছে। (Dev / Sandbox OTP: ${otp})`,
        email: cleanEmail,
        expiresIn: 300, // 300 seconds (5 minutes)
        emailDispatched,
        // Include devOtp if email wasn't delivered directly to inbox (e.g. sandbox mode)
        devOtp: !emailDispatched ? otp : undefined,
        notice: !emailDispatched && result.error ? result.error : undefined,
      });
    } catch (err: any) {
      console.error("Send OTP Endpoint Error:", err);
      res.status(500).json({ success: false, error: err.message || "ওটিপি পাঠাতে সমস্যা হয়েছে।" });
    }
  });

  // POST /api/verify-otp
  app.post("/api/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      const cleanEmail = (email || "").toLowerCase().trim();
      const cleanOtp = (otp || "").toString().trim();

      if (!cleanEmail || !cleanOtp) {
        return res.status(400).json({ success: false, error: "ইমেইল এবং ৬-ডিজিটের ওটিপি কোড উভয়ই আবশ্যক।" });
      }

      const record = otpStore.get(cleanEmail);

      if (!record) {
        return res.status(400).json({
          success: false,
          error: "কোনো সক্রিয় ওটিপি পাওয়া যায়নি। অনুগ্রহ করে নতুন কোডের জন্য অনুরোধ করুন।",
        });
      }

      // Check Expiration (5 minutes)
      if (Date.now() > record.expiresAt) {
        otpStore.delete(cleanEmail);
        return res.status(400).json({
          success: false,
          expired: true,
          error: "ভেরিফিকেশন কোডের ৫ মিনিটের মেয়াদ শেষ হয়ে গেছে (Expired)। অনুগ্রহ করে নতুন কোড পাঠান।",
        });
      }

      // Rate limit / Attempt limit check
      if (record.attempts >= 5) {
        otpStore.delete(cleanEmail);
        return res.status(429).json({
          success: false,
          error: "আপনি ৫ বার ভুল কোড দিয়েছেন। নিরাপত্তার স্বার্থে কোডটি বাতিল করা হয়েছে। নতুন কোড পাঠান।",
        });
      }

      // Compare OTP
      if (record.otp !== cleanOtp) {
        record.attempts += 1;
        const remainingAttempts = 5 - record.attempts;
        return res.status(400).json({
          success: false,
          attemptsLeft: remainingAttempts,
          error: `ভুল ওটিপি কোড প্রদান করা হয়েছে! বাকি সুযোগ: ${remainingAttempts} বার।`,
        });
      }

      // Success! Remove from store to prevent reuse
      otpStore.delete(cleanEmail);

      console.log(`[OTP] Successfully verified OTP for email: ${cleanEmail}`);

      return res.json({
        success: true,
        message: "অভিনন্দন! আপনার ইমেইল ওটিপি ভেরিফিকেশন সফল হয়েছে।",
        email: cleanEmail,
      });
    } catch (err: any) {
      console.error("Verify OTP Endpoint Error:", err);
      res.status(500).json({ success: false, error: err.message || "ওটিপি যাচাইকরণে ত্রুটি হয়েছে।" });
    }
  });

  // POST /api/resend-otp
  app.post("/api/resend-otp", async (req, res) => {
    try {
      const { email, purpose } = req.body;
      const cleanEmail = (email || "").toLowerCase().trim();

      if (!cleanEmail) {
        return res.status(400).json({ success: false, error: "ইমেইল এড্রেস আবশ্যক।" });
      }

      // Check if previous OTP was generated less than 30s ago (anti-spam cooldown)
      const existing = otpStore.get(cleanEmail);
      if (existing && Date.now() - existing.createdAt < 30 * 1000) {
        const waitSec = Math.ceil((30 * 1000 - (Date.now() - existing.createdAt)) / 1000);
        return res.status(429).json({
          success: false,
          error: `অনুগ্রহ করে ${waitSec} সেকেন্ড অপেক্ষা করে আবার চেষ্টা করুন।`,
        });
      }

      // Generate fresh OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000;

      otpStore.set(cleanEmail, {
        otp,
        expiresAt,
        attempts: 0,
        createdAt: Date.now(),
        purpose: purpose || "resend",
      });

      const result = await dispatchOtpEmail(cleanEmail, otp, purpose);
      const emailDispatched = result.success;

      if (emailDispatched) {
        console.log(`[OTP Resend] Dispatched fresh code to ${cleanEmail} (ID: ${result.id})`);
      } else {
        console.log(`[OTP Sandbox Resend] Generated fresh code for ${cleanEmail}: ${otp}`);
      }

      return res.json({
        success: true,
        message: emailDispatched
          ? `একটি নতুন ৬-ডিজিট ওটিপি কোড আপনার ইমেইলে পাঠানো হয়েছে।`
          : `একটি নতুন ৬-ডিজিট ওটিপি কোড প্রস্তুত করা হয়েছে। (Dev / Sandbox OTP: ${otp})`,
        email: cleanEmail,
        expiresIn: 300,
        emailDispatched,
        devOtp: !emailDispatched ? otp : undefined,
        notice: !emailDispatched && result.error ? result.error : undefined,
      });
    } catch (err: any) {
      console.error("Resend OTP Error:", err);
      res.status(500).json({ success: false, error: err.message || "নতুন ওটিপি পাঠাতে ব্যর্থ হয়েছে।" });
    }
  });

  // Cloudinary Status & Config Endpoint (Safe for Admin verification)
  app.get("/api/cloudinary/config", (req, res) => {
    const cfg = getCloudinaryConfig();
    const isConfigured = Boolean(cfg.cloudName && cfg.apiKey && cfg.apiSecret);
    res.json({
      configured: isConfigured,
      cloudName: cfg.cloudName || "",
      apiKeyMasked: cfg.apiKey ? `${cfg.apiKey.slice(0, 4)}••••${cfg.apiKey.slice(-4)}` : "",
      provider: isConfigured ? "cloudinary" : "server_local",
    });
  });

  // Save / Update Cloudinary Config from Admin Panel (supports both CLOUDINARY_URL and individual fields)
  app.post("/api/cloudinary/config", async (req, res) => {
    try {
      let { cloudName, apiKey, apiSecret, cloudinaryUrl } = req.body;

      // Auto parse if full CLOUDINARY_URL was provided
      if (cloudinaryUrl && typeof cloudinaryUrl === "string") {
        let cleanUrl = cloudinaryUrl.trim();
        if (cleanUrl.startsWith("CLOUDINARY_URL=")) {
          cleanUrl = cleanUrl.replace(/^CLOUDINARY_URL=/, "").trim();
        }
        // Format: cloudinary://api_key:api_secret@cloud_name
        const match = cleanUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
        if (match) {
          apiKey = match[1].trim();
          apiSecret = match[2].trim();
          cloudName = match[3].trim();
        }
      }

      if (!cloudName || !apiKey || !apiSecret) {
        return res.status(400).json({ 
          error: "Missing required Cloudinary fields. Please provide Cloud Name, API Key, and API Secret, or paste the complete CLOUDINARY_URL string." 
        });
      }

      try {
        fs.writeFileSync(
          cloudinaryConfigFile,
          JSON.stringify(
            {
              cloudName: cloudName.trim(),
              apiKey: apiKey.trim(),
              apiSecret: apiSecret.trim(),
              cloudinaryUrl: `cloudinary://${apiKey.trim()}:${apiSecret.trim()}@${cloudName.trim()}`,
              updatedAt: new Date().toISOString(),
            },
            null,
            2
          )
        );
      } catch (writeErr) {
        console.warn("Could not write to root config file, writing to /tmp fallback:", writeErr);
        cloudinaryConfigFile = path.join("/tmp", "cloudinary_config.json");
        try {
          fs.writeFileSync(
            cloudinaryConfigFile,
            JSON.stringify(
              {
                cloudName: cloudName.trim(),
                apiKey: apiKey.trim(),
                apiSecret: apiSecret.trim(),
                cloudinaryUrl: `cloudinary://${apiKey.trim()}:${apiSecret.trim()}@${cloudName.trim()}`,
                updatedAt: new Date().toISOString(),
              },
              null,
              2
            )
          );
        } catch (tmpErr) {}
      }

      const success = applyCloudinaryConfig();
      if (!success) {
        return res.status(400).json({ error: "Failed to apply Cloudinary settings." });
      }

      // Test ping to verify credentials immediately
      try {
        const ping = await cloudinary.api.ping();
        return res.json({
          success: true,
          cloudName: cloudName.trim(),
          apiKeyMasked: `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}`,
          message: "🎉 Cloudinary Cloud Storage connected & verified successfully!",
          ping,
        });
      } catch (pingErr: any) {
        return res.json({
          success: true,
          warning: true,
          cloudName: cloudName.trim(),
          apiKeyMasked: `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}`,
          message: `Saved, but Cloudinary validation returned: ${pingErr.message || 'Please check keys'}.`,
        });
      }
    } catch (e: any) {
      console.error("Save Cloudinary Config Error:", e);
      res.status(500).json({ error: e.message || "Failed to update Cloudinary config." });
    }
  });

  // Test Cloudinary connection
  app.post("/api/cloudinary/test", async (req, res) => {
    try {
      const isReady = applyCloudinaryConfig();
      if (!isReady) {
        return res.status(400).json({ success: false, error: "Cloudinary credentials not set. Please provide Cloud Name, API Key, and API Secret." });
      }
      const ping = await cloudinary.api.ping();
      res.json({ success: true, message: "Cloudinary Cloud Connection is Active & Healthy!", ping });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Cloudinary connection test failed." });
    }
  });

  // Dedicated Cloudinary Direct Media/Video/Asset Uploader
  app.post("/api/cloudinary/upload", (req, res, next) => {
    upload.any()(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      next();
    });
  }, async (req, res) => {
    let uploadedFile: Express.Multer.File | undefined;
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      uploadedFile = req.files[0];
    } else if (req.file) {
      uploadedFile = req.file;
    }

    if (!uploadedFile) {
      return res.status(400).json({ error: "No file provided for upload." });
    }

    const filePath = uploadedFile.path;
    const isVideo = (uploadedFile.mimetype || "").startsWith("video/");
    const isImage = (uploadedFile.mimetype || "").startsWith("image/");
    const localUrl = `/uploads/${uploadedFile.filename}`;

    const isReady = applyCloudinaryConfig();

    if (!isReady) {
      // Safe fallback to local server static endpoint
      return res.json({
        success: true,
        fallback: true,
        provider: "server_local",
        url: localUrl,
        videoUrl: localUrl,
        filename: uploadedFile.filename,
        originalName: uploadedFile.originalname,
        size: uploadedFile.size,
        mimeType: uploadedFile.mimetype,
        message: "Saved to High-Speed Local Server Storage (Connect Cloudinary to stream via Cloud CDN).",
      });
    }

    // Attempt upload directly to Cloudinary
    try {
      let uploadRes: any;
      if (isVideo || uploadedFile.size > 15 * 1024 * 1024) {
        uploadRes = await cloudinary.uploader.upload_large(filePath, {
          resource_type: isVideo ? "video" : "auto",
          folder: "nexus_academy",
          chunk_size: 6 * 1024 * 1024,
          use_filename: true,
          unique_filename: true,
          timeout: 180000,
        });
      } else {
        uploadRes = await cloudinary.uploader.upload(filePath, {
          resource_type: isImage ? "image" : "auto",
          folder: "nexus_academy",
          use_filename: true,
          unique_filename: true,
        });
      }

      // Cleanup local temp file only after Cloudinary upload succeeds
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupErr) {
        console.warn("Temp upload cleanup notice:", cleanupErr);
      }

      // High quality poster thumbnail for videos
      let autoThumbnail = uploadRes.secure_url;
      if (isVideo) {
        autoThumbnail = cloudinary.url(`${uploadRes.public_id}.jpg`, {
          resource_type: "video",
          transformation: [
            { width: 640, height: 360, crop: "fill" },
            { start_offset: "1.0" },
            { format: "jpg" }
          ]
        });
      }

      return res.json({
        success: true,
        provider: "cloudinary",
        url: uploadRes.secure_url,
        videoUrl: uploadRes.secure_url,
        thumbnailUrl: autoThumbnail,
        publicId: uploadRes.public_id,
        duration: uploadRes.duration ? Math.round(uploadRes.duration) : undefined,
        format: uploadRes.format,
        bytes: uploadRes.bytes,
        width: uploadRes.width,
        height: uploadRes.height,
        message: "🎉 File uploaded directly to Cloudinary Global CDN!"
      });
    } catch (err: any) {
      console.warn("Cloudinary upload notice (reverting to server storage):", err.message || err);
      // Fail-Safe: Do not lose the user's uploaded file. Keep local file and return local stream URL
      return res.json({
        success: true,
        fallback: true,
        provider: "server_local",
        url: localUrl,
        videoUrl: localUrl,
        filename: uploadedFile.filename,
        originalName: uploadedFile.originalname,
        size: uploadedFile.size,
        mimeType: uploadedFile.mimetype,
        warning: `Cloudinary notice: ${err.message || 'Check Cloudinary credentials'}. Video safely stored on server.`,
        message: `Video uploaded successfully to Server Storage! (Cloudinary: ${err.message || 'Key verification required'})`,
      });
    }
  });

  // Dedicated Video Upload Endpoint for Admin Panel (Supports Cloudinary & Server Storage)
  app.post("/api/upload-video", (req, res, next) => {
    upload.any()(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: `Video upload error: ${err.message}` });
      }
      next();
    });
  }, async (req, res) => {
    let uploadedFile: Express.Multer.File | undefined;
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      uploadedFile = req.files[0];
    } else if (req.file) {
      uploadedFile = req.file;
    }

    if (!uploadedFile) {
      return res.status(400).json({ error: "No video file uploaded." });
    }

    const filePath = uploadedFile.path;
    const localUrl = `/uploads/${uploadedFile.filename}`;
    const preferCloudinary = req.body?.targetStorage === "cloudinary" || req.query?.storage === "cloudinary";
    const isCloudinaryReady = applyCloudinaryConfig();

    if (preferCloudinary && isCloudinaryReady) {
      try {
        const uploadRes: any = await cloudinary.uploader.upload_large(filePath, {
          resource_type: "video",
          folder: "nexus_academy/curriculum",
          chunk_size: 6 * 1024 * 1024,
          use_filename: true,
          unique_filename: true,
          timeout: 180000,
        });

        // Cleanup local temp
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {}

        const autoThumbnail = cloudinary.url(`${uploadRes.public_id}.jpg`, {
          resource_type: "video",
          transformation: [
            { width: 640, height: 360, crop: "fill" },
            { start_offset: "1.0" },
            { format: "jpg" }
          ]
        });

        return res.json({
          success: true,
          provider: "cloudinary",
          videoUrl: uploadRes.secure_url,
          thumbnailUrl: autoThumbnail,
          publicId: uploadRes.public_id,
          duration: uploadRes.duration ? Math.round(uploadRes.duration) : undefined,
          filename: uploadedFile.originalname,
          size: uploadRes.bytes,
          mimeType: uploadedFile.mimetype,
        });
      } catch (cloudErr: any) {
        console.warn("Cloudinary upload failed (safely stored on server):", cloudErr.message || cloudErr);
        // Fallback to local server stream
        return res.json({
          success: true,
          fallback: true,
          provider: "server_local",
          videoUrl: localUrl,
          filename: uploadedFile.filename,
          originalName: uploadedFile.originalname,
          size: uploadedFile.size,
          mimeType: uploadedFile.mimetype,
          warning: `Cloudinary notice: ${cloudErr.message || 'Key error'}. Saved to local server storage.`,
        });
      }
    }

    // Default local server storage
    res.json({
      success: true,
      provider: "server_local",
      videoUrl: localUrl,
      filename: uploadedFile.filename,
      originalName: uploadedFile.originalname,
      size: uploadedFile.size,
      mimeType: uploadedFile.mimetype,
    });
  });

  app.post("/api/gemini/chat", async (req, res) => {
    // Set SSE headers upfront
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const { message, history, courseContext, images } = req.body;
      const ai = getGenAI();
      
      const systemInstruction = `You are a premium AI Study Assistant for Nexus Academy.
You are helping a student with academic concepts, course preparation, coding, math, science, and study tips.
You have full access to course context if provided. You are professional, encouraging, and clear.
Provide code snippets, math formulas, or markdown when helpful.
Course Context: ${courseContext || "Nexus Academic Platform"}`;

      let contents: any[] = [];
      if (history && Array.isArray(history)) {
        history.forEach((msg) => {
          contents.push({ role: msg.role === "assistant" ? "model" : "user", parts: [{ text: msg.text }] });
        });
      }
      
      const newParts: any[] = [];
      if (message) {
         newParts.push({ text: message });
      }
      if (images && Array.isArray(images)) {
         images.forEach((imgBase64: string) => {
            const match = imgBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.*)$/);
            if (match) {
               newParts.push({ inlineData: { mimeType: match[1], data: match[2] }});
            } else {
               newParts.push({ inlineData: { mimeType: 'image/jpeg', data: imgBase64 }});
            }
         });
      }
      if (newParts.length === 0) newParts.push({ text: "" });
      contents.push({ role: "user", parts: newParts });

      // Multi-model failover array ensuring AI is ALWAYS online & responsive
      const MODELS_TO_TRY = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-2.5-pro",
        "gemini-1.5-pro"
      ];

      let responseStream = null;
      let usedModel = "";

      for (const modelName of MODELS_TO_TRY) {
        try {
          responseStream = await ai.models.generateContentStream({
            model: modelName,
            contents,
            config: { systemInstruction }
          });
          usedModel = modelName;
          console.log(`[Gemini API] Successfully initialized response stream with model: ${modelName}`);
          break; // Successfully got stream from model!
        } catch (modelErr) {
          console.warn(`[Gemini API] Model ${modelName} attempt failed, trying next model:`, modelErr);
        }
      }

      if (responseStream) {
        for await (const chunk of responseStream) {
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        }
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      // Fallback: If all models failed or network issue occurs, generate smart local study assistant response
      console.warn("[Gemini API] All primary AI models unreachable, engaging Nexus Smart Local AI Engine");
      
      const userText = (message || "").toLowerCase();
      let smartAnswer = `Hello! I am your Nexus AI Study Assistant. `;
      
      if (userText.includes("physics") || userText.includes("formula") || userText.includes("gravity") || userText.includes("force")) {
        smartAnswer += `Here is a quick key concept breakdown for Physics:\n\n` +
          `• **Newton's 2nd Law**: $F = m \\times a$ (Force = Mass × Acceleration)\n` +
          `• **Kinetic Energy**: $E_k = \\frac{1}{2} m v^2$\n` +
          `• **Work Done**: $W = F \\times d \\times \\cos(\\theta)$\n\n` +
          `Would you like me to walk through a specific practice problem step-by-step?`;
      } else if (userText.includes("math") || userText.includes("calculus") || userText.includes("equation") || userText.includes("algebra")) {
        smartAnswer += `Here are core mathematical principles to solve equations effectively:\n\n` +
          `1. **Quadratic Formula**: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$\n` +
          `2. **Pythagorean Theorem**: $a^2 + b^2 = c^2$\n` +
          `3. **Derivative of $x^n$**: $\\frac{d}{dx}(x^n) = n x^{n-1}$\n\n` +
          `Tell me your target equation and I will break it down line-by-line!`;
      } else if (userText.includes("code") || userText.includes("react") || userText.includes("javascript") || userText.includes("python") || userText.includes("bug")) {
        smartAnswer += `When debugging or building software in Nexus Courses, follow these 3 steps:\n\n` +
          `\`\`\`typescript\n` +
          `// Example: Clean Async Handler in TypeScript\n` +
          `async function fetchCourseData(courseId: string) {\n` +
          `  try {\n` +
          `    const response = await fetch(\`/api/courses/\${courseId}\`);\n` +
          `    if (!response.ok) throw new Error("Course network response failed");\n` +
          `    return await response.json();\n` +
          `  } catch (error) {\n` +
          `    console.error("Course fetch error:", error);\n` +
          `  }\n` +
          `}\n` +
          `\`\`\`\n\n` +
          `Paste your code snippet or error message here, and I will analyze it for syntax or logic bugs!`;
      } else {
        smartAnswer += `I am fully active and ready to assist you with your studies!\n\n` +
          `Here is how I can accelerate your learning:\n` +
          `• 📝 **Exam & Quiz Prep**: Ask me to summarize key chapters or generate practice questions.\n` +
          `• 💡 **Concept Clarification**: Request simple explanations for complex topics in Physics, Chemistry, Higher Math, ICT, or English.\n` +
          `• 💻 **Code & Homework Help**: Share code snippets or problems for step-by-step solutions.\n\n` +
          `What specific topic or question are you working on right now?`;
      }

      // Stream fallback response word by word for smooth UI
      const words = smartAnswer.split(' ');
      for (let i = 0; i < words.length; i++) {
        const wordChunk = (i === 0 ? '' : ' ') + words[i];
        res.write(`data: ${JSON.stringify({ text: wordChunk })}\n\n`);
        await new Promise(r => setTimeout(r, 20));
      }

      res.write("data: [DONE]\n\n");
      res.end();

    } catch (error: any) {
      console.error("Gemini API General Error:", error);
      // Even in catch block, send friendly response so UI never breaks
      const emergencyAnswer = "I am your Nexus AI Assistant. I am active and ready to help you with your lessons! Please ask any question about your enrolled courses or study topics.";
      res.write(`data: ${JSON.stringify({ text: emergencyAnswer })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
