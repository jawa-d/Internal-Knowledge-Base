const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();

/* ============================
   ✉️ Email Config
============================ */
const transporter = nodemailer.createTransport({
  service: "gmail", // أو outlook
  auth: {
    user: "noreply@earthlink.iq",
    pass: "APP_PASSWORD"
  }
});

/* ============================
   📩 Send OTP
============================ */
exports.sendOtp = functions.https.onCall(async (data) => {
  const email = String(data.email || "").toLowerCase();

  if (!email.endsWith("@earthlink.iq")) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Invalid domain"
    );
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  await db.collection("otp_codes").doc(email).set({
    code,
    expiresAt: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 5 * 60 * 1000)
    )
  });

  await transporter.sendMail({
    from: "Earthlink <noreply@earthlink.iq>",
    to: email,
    subject: "Earthlink Verification Code",
    html: `
      <h2>Earthlink Secure Login</h2>
      <p>Your verification code:</p>
      <h1>${code}</h1>
      <p>This code expires in 5 minutes.</p>
    `
  });

  return { success: true };
});

/* ============================
   🔐 Verify OTP
============================ */
exports.verifyOtp = functions.https.onCall(async (data) => {
  const email = String(data.email || "").toLowerCase();
  const code = String(data.code || "");

  const ref = db.collection("otp_codes").doc(email);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "Code expired"
    );
  }

  const saved = snap.data();

  if (saved.code !== code) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Invalid code"
    );
  }

  if (saved.expiresAt.toDate() < new Date()) {
    throw new functions.https.HttpsError(
      "deadline-exceeded",
      "Code expired"
    );
  }

  await ref.delete(); // 🔥 حذف الرمز بعد الاستخدام

  return { verified: true };
});
