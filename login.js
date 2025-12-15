import { db } from "./firebase.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

const COMPANY_DOMAIN = "@earthlink.iq";
let generatedCode = "";

const emailInput = document.getElementById("emailInput");
const codeInput = document.getElementById("codeInput");
const sendCodeBtn = document.getElementById("sendCodeBtn");
const verifyBtn = document.getElementById("verifyBtn");
const codeBox = document.getElementById("codeBox");
const msg = document.getElementById("msg");

function showMessage(text, type="") {
  msg.textContent = text;
  msg.className = "msg " + type;
}

async function isUserRegistered(email) {
  const snap = await getDoc(doc(db, "users", email));
  return snap.exists();
}

async function registerUser(email) {
  const ref = doc(db, "users", email);
  if (!(await getDoc(ref)).exists()) {
    await setDoc(ref, {
      email,
      role: "none",
      status: "pending",
      createdAt: new Date().toISOString()
    });
  }
}

sendCodeBtn.onclick = async () => {
  const email = emailInput.value.trim().toLowerCase();
  showMessage("");

  if (!email.endsWith(COMPANY_DOMAIN)) {
    showMessage("❌ يسمح فقط باستخدام بريد الشركة", "error");
    return;
  }

  if (await isUserRegistered(email)) {
    showMessage("✔ تم تسجيل الدخول", "success");
    localStorage.setItem("kb_logged_in", "1");
    localStorage.setItem("kb_user_email", email);
    return setTimeout(() => location.href = "dashboard.html", 600);
  }

  generatedCode = String(Math.floor(100000 + Math.random() * 900000));
  console.log("Verification Code:", generatedCode);

  codeBox.classList.remove("hidden");
  showMessage("✔ تم إرسال رمز التحقق", "success");
};

verifyBtn.onclick = async () => {
  if (codeInput.value !== generatedCode) {
    showMessage("❌ رمز غير صحيح", "error");
    return;
  }

  await registerUser(emailInput.value.trim());
  localStorage.setItem("kb_logged_in", "1");
  localStorage.setItem("kb_user_email", emailInput.value.trim());
  showMessage("✔ تم التحقق", "success");

  setTimeout(() => location.href = "dashboard.html", 600);
};
