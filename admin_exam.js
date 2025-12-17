import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  getDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

/* ===============================
   Admin Guard
=============================== */
let currentEmail = "";
let isAdmin = false;

async function checkAdminAccess() {
  currentEmail = localStorage.getItem("kb_user_email") || "";
  if (!currentEmail) {
    location.href = "login.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", currentEmail));
  const role = snap.exists() ? snap.data().role : "";

  isAdmin = String(role).toLowerCase() === "admin";

  if (!isAdmin) {
    alert("❌ غير مخول بالدخول");
    location.href = "dashboard.html";
  }
}

/* ===============================
   UI
=============================== */
const tbody = document.getElementById("tbody");

/* ===============================
   Load Attempts (Employees List)
=============================== */
async function loadAttempts() {
  const snap = await getDocs(collection(db, "exam_attempts"));

  tbody.innerHTML = "";

  if (snap.empty) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">لا توجد محاولات بعد</td>
      </tr>
    `;
    return;
  }

  snap.forEach(d => {
    const a = d.data();

    const totalScore =
      (a.autoScore || 0) + (a.manualScore || 0);

    tbody.innerHTML += `
      <tr>
        <td>${a.employeeName || "—"}</td>
        <td>${a.employeeId || "—"}</td>
        <td>${a.email || "—"}</td>
        <td>${a.status || "—"}</td>
        <td>${a.violations || 0}</td>
        <td>${totalScore}</td>
        <td>
          <button
            class="view-btn"
            onclick="openAttempt('${d.id}')">
            عرض التفاصيل
          </button>
        </td>
      </tr>
    `;
  });
}

/* ===============================
   Open Single Attempt Page
=============================== */
window.openAttempt = function (attemptId) {
  localStorage.setItem("admin_selected_attempt", attemptId);
  location.href = "admin_attempt.html";
};

/* ===============================
   INIT
=============================== */
await checkAdminAccess();
await loadAttempts();
