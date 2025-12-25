// security.js
// =====================
// GLOBAL SECURITY GUARD
// =====================

import { db } from "./firebase.js";
import { doc, getDoc } from
  "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

/**
 * checkAccess
 * @param {Array} allowedRoles مثال: ["admin"], ["admin","manager"]
 */
export async function checkAccess(allowedRoles = []) {

  const email = localStorage.getItem("kb_user_email");

  // غير مسجل دخول
  if (!email) {
    window.location.href = "login.html";
    return false;
  }

  try {
    const snap = await getDoc(doc(db, "users", email));

    if (!snap.exists()) {
      redirectDenied();
      return false;
    }

    const role = String(snap.data().role || "").toLowerCase();

    // role غير مسموح
    if (!allowedRoles.includes(role)) {
      redirectDenied();
      return false;
    }

    // مسموح
    return true;

  } catch (err) {
    console.error("Security error:", err);
    redirectDenied();
    return false;
  }
}

/* ===== Redirect ===== */
function redirectDenied() {
  window.location.href = "security.html";
}
