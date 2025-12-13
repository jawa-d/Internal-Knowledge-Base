import { db } from "./firebase.js";
import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

/* ================================
   Settings
================================ */
const COMPANY_DOMAIN = "@earthlink.iq";
let generatedCode = "";

/* ================================
   Elements
================================ */
const emailInput  = document.getElementById("emailInput");
const codeInput   = document.getElementById("codeInput");
const sendCodeBtn = document.getElementById("sendCodeBtn");
const verifyBtn   = document.getElementById("verifyBtn");
const codeBox     = document.getElementById("codeBox");
const msg         = document.getElementById("msg");

/* ================================
   Helpers
================================ */
function showMessage(text, type = "success") {
  msg.textContent = text;
  msg.className = `msg ${type}`;
}

/* ================================
   Firestore – Check User
================================ */
async function isUserRegistered(email) {
  const userRef = doc(db, "users", email);
  const snap = await getDoc(userRef);
  return snap.exists();
}

/* ================================
   Firestore – Register User
================================ */
async function registerUser(email) {
  const userRef = doc(db, "users", email);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      name: email.split("@")[0],
      email: email,
      role: "none",
      status: "pending",
      createdAt: new Date().toISOString()
    });
  }
}

/* ================================
   Send Code / Direct Login
================================ */
sendCodeBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();

  // Reset
  showMessage("");
  sendCodeBtn.disabled = true;
  sendCodeBtn.classList.add("loading");

  /* Validate domain */
  if (!email.endsWith(COMPANY_DOMAIN)) {
    showMessage("❌ يسمح فقط باستخدام بريد الشركة", "error");
    resetButton();
    return;
  }

  /* Check existing user */
  const exists = await isUserRegistered(email);

  // ✅ Direct login
  if (exists) {
    showMessage("✔ تم تسجيل الدخول بنجاح", "success");

    localStorage.setItem("kb_logged_in", "1");
    localStorage.setItem("kb_user_email", email);

    return setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 700);
  }

  // 🆕 New user → Send code
  generatedCode = String(Math.floor(100000 + Math.random() * 900000));
  console.log("Verification Code:", generatedCode); // dev only

  showMessage("✔ تم إرسال رمز التحقق", "success");
  codeBox.classList.remove("hidden");

  resetButton();
});

/* ================================
   Verify Code
================================ */
verifyBtn.addEventListener("click", async () => {
  const code  = codeInput.value.trim();
  const email = emailInput.value.trim();

  if (code !== generatedCode) {
    showMessage("❌ رمز التحقق غير صحيح", "error");
    return;
  }

  showMessage("✔ تم التحقق بنجاح", "success");

  await registerUser(email);

  localStorage.setItem("kb_logged_in", "1");
  localStorage.setItem("kb_user_email", email);

  setTimeout(() => {
    window.location.href = "dashboard.html";
  }, 700);
});

/* ================================
   UI Helpers
================================ */
function resetButton() {
  sendCodeBtn.disabled = false;
  sendCodeBtn.classList.remove("loading");
}
