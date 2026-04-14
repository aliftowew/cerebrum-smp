// ============================================
// CEREBRUM SMP — CLOUD FUNCTIONS
// Saweria webhook handler untuk auto-aktivasi premium
// ============================================

const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

// Saweria Stream Key disimpan sebagai secret (bukan di kode)
// Set via: firebase functions:secrets:set SAWERIA_STREAM_KEY
const SAWERIA_STREAM_KEY = defineSecret("SAWERIA_STREAM_KEY");

// Minimal donasi untuk premium (Rp)
const PREMIUM_MIN_AMOUNT = 29000;

/**
 * Validasi signature dari Saweria webhook.
 * Saweria mengirim X-Saweria-Webhook-Signature = HMAC-SHA256(body, streamKey)
 */
function verifySignature(rawBody, signature, streamKey) {
  if (!signature || !streamKey) return false;
  const expected = crypto
    .createHmac("sha256", streamKey)
    .update(rawBody)
    .digest("hex");
  // Constant-time comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch (e) {
    return false;
  }
}

/**
 * Ekstrak email dari pesan donasi atau email donatur.
 */
function extractEmail(message, donatorEmail) {
  const emailRegex = /[\w.+-]+@[\w-]+\.[\w.-]+/gi;
  // Prioritas: email di pesan (dari kolom pesan Saweria)
  if (message) {
    const match = message.match(emailRegex);
    if (match && match.length > 0) return match[0].toLowerCase();
  }
  // Fallback: email donatur (kalau user login dengan Google di Saweria)
  if (donatorEmail) return donatorEmail.toLowerCase();
  return null;
}

/**
 * Cari user di Firestore berdasarkan email.
 */
async function findUserByEmail(email) {
  const snapshot = await db
    .collection("users")
    .where("email", "==", email)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  return snapshot.docs[0];
}

/**
 * Aktivasi premium untuk user.
 */
async function activatePremium(userDoc, transactionData) {
  await userDoc.ref.update({
    premium: true,
    keys: 999,
    premiumActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Log transaksi
  await db.collection("transactions").add({
    userId: userDoc.id,
    userEmail: userDoc.data().email,
    amount: transactionData.amount,
    donatorName: transactionData.donatorName || "",
    message: transactionData.message || "",
    source: "saweria",
    transactionId: transactionData.id || "",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info(`✅ Premium activated for ${userDoc.data().email}`);
}

/**
 * ENDPOINT: Saweria Webhook
 * URL: https://<region>-<project>.cloudfunctions.net/saweriaWebhook
 */
exports.saweriaWebhook = onRequest(
  {
    secrets: [SAWERIA_STREAM_KEY],
    cors: false,
  },
  async (req, res) => {
    // Saweria kirim POST request
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const rawBody = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body);
    const signature = req.headers["x-saweria-webhook-signature"];
    const streamKey = SAWERIA_STREAM_KEY.value();

    // Validasi signature
    if (!verifySignature(rawBody, signature, streamKey)) {
      logger.warn("⚠️ Invalid signature", {signature});
      return res.status(401).send("Invalid signature");
    }

    const data = req.body;
    logger.info("📨 Saweria webhook received", {
      id: data.id,
      amount: data.amount_raw,
      donator: data.donator_name,
    });

    // Cek amount
    const amount = parseInt(data.amount_raw || 0, 10);
    if (amount < PREMIUM_MIN_AMOUNT) {
      logger.info(`Amount ${amount} below minimum, logged as regular donation`);
      // Tetap simpan sebagai donasi biasa
      await db.collection("donations").add({
        amount,
        donatorName: data.donator_name || "",
        donatorEmail: data.donator_email || "",
        message: data.message || "",
        transactionId: data.id || "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.status(200).json({status: "ok", premium: false});
    }

    // Ekstrak email dari pesan
    const email = extractEmail(data.message, data.donator_email);
    if (!email) {
      logger.warn("No email found in donation", {message: data.message});
      // Simpan untuk manual review
      await db.collection("unmatched_donations").add({
        amount,
        donatorName: data.donator_name || "",
        donatorEmail: data.donator_email || "",
        message: data.message || "",
        transactionId: data.id || "",
        reason: "no_email_in_message",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.status(200).json({status: "ok", premium: false, reason: "no_email"});
    }

    // Cari user
    const userDoc = await findUserByEmail(email);
    if (!userDoc) {
      logger.warn(`User not found for email: ${email}`);
      await db.collection("unmatched_donations").add({
        amount,
        email,
        donatorName: data.donator_name || "",
        message: data.message || "",
        transactionId: data.id || "",
        reason: "user_not_found",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.status(200).json({status: "ok", premium: false, reason: "user_not_found"});
    }

    // Aktivasi premium
    await activatePremium(userDoc, {
      amount,
      donatorName: data.donator_name,
      message: data.message,
      id: data.id,
    });

    return res.status(200).json({status: "ok", premium: true, userId: userDoc.id});
  }
);

/**
 * ENDPOINT: Manual trigger untuk aktivasi premium (admin only)
 * URL: https://<region>-<project>.cloudfunctions.net/activatePremiumManual
 *
 * Body: {email: "user@gmail.com", adminSecret: "xxx"}
 */
const ADMIN_SECRET = defineSecret("ADMIN_SECRET");

exports.activatePremiumManual = onRequest(
  {secrets: [ADMIN_SECRET], cors: true},
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }
    const {email, adminSecret} = req.body;
    if (adminSecret !== ADMIN_SECRET.value()) {
      return res.status(401).send("Unauthorized");
    }
    if (!email) {
      return res.status(400).send("Missing email");
    }

    const userDoc = await findUserByEmail(email.toLowerCase());
    if (!userDoc) {
      return res.status(404).json({error: "User not found"});
    }

    await activatePremium(userDoc, {
      amount: PREMIUM_MIN_AMOUNT,
      donatorName: "Manual Admin Activation",
      message: "Manually activated by admin",
      id: "manual-" + Date.now(),
    });

    return res.status(200).json({status: "ok", activated: email});
  }
);
