import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import { checkAccess } from "./security.js";

/* =====================
   SECURITY GUARD
===================== */
document.addEventListener("DOMContentLoaded", async () => {
  const allowed = await checkAccess(["admin"]);
  if (!allowed) return;
});

/* =====================
   AUTH / ROLE
===================== */
let isAdmin = false;
let currentEmail = null;

/* =====================
   STATE
===================== */
let USERS = [];
let editingEmail = null;

const tableBody = document.getElementById("usersTableBody");

/* =====================
   CHECK ADMIN
===================== */
async function checkAdmin() {
  currentEmail = localStorage.getItem("kb_user_email");

  if (!currentEmail) {
    window.location.href = "login.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", currentEmail));
  const role = snap.exists() ? snap.data().role : "";

  isAdmin = String(role).toLowerCase() === "admin";
}

/* =====================
   LOAD USERS
===================== */
async function loadUsers() {
  const snapshot = await getDocs(collection(db, "users"));
  USERS = [];

  snapshot.forEach(docSnap => {
    USERS.push({
      email: docSnap.id,
      ...docSnap.data()
    });
  });

  renderUsers();
}

/* =====================
   RENDER TABLE
===================== */
function renderUsers() {
  tableBody.innerHTML = "";

  USERS.forEach(u => {
    const editBtn = isAdmin
      ? `<button class="btn-edit" onclick="editUser('${u.email}')">تعديل</button>`
      : `<span style="opacity:.4">—</span>`;

    tableBody.innerHTML += `
      <tr class="${isAdmin ? "" : "blurred"}">
        <td>${isAdmin ? (u.name || "-") : "██████"}</td>
        <td>${isAdmin ? u.email : "████████@████"}</td>
        <td>${isAdmin ? (u.role || "none").toUpperCase() : "████"}</td>
        <td>${isAdmin ? (u.status || "pending") : "████"}</td>
        <td>${editBtn}</td>
      </tr>
    `;
  });

  // 🔐 Mask
  const mask = document.getElementById("usersMask");
  mask.style.display = isAdmin ? "none" : "flex";
}

/* =====================
   EDIT USER (ADMIN)
===================== */
window.editUser = function (email) {
  if (!isAdmin) return;

  editingEmail = email;
  const user = USERS.find(u => u.email === email);
  if (!user) return;

  document.getElementById("editRole").value = user.role || "none";
  document.getElementById("editStatus").value = user.status || "pending";

  document.getElementById("popupOverlay").style.display = "flex";
};

/* =====================
   CLOSE EDIT POPUP
===================== */
window.closePopup = function () {
  document.getElementById("popupOverlay").style.display = "none";
  editingEmail = null;
};

/* =====================
   SAVE EDIT USER
===================== */
window.saveUser = async function () {
  if (!isAdmin || !editingEmail) return;

  const newRole = document.getElementById("editRole").value;
  const newStatus = document.getElementById("editStatus").value;

  await updateDoc(doc(db, "users", editingEmail), {
    role: newRole,
    status: newStatus
  });

  alert("✔ تم تحديث بيانات المستخدم");

  closePopup();
  loadUsers();
};

/* =====================
   ➕ ADD USER POPUP
===================== */
window.openAddUser = function () {
  if (!isAdmin) return;
  document.getElementById("addUserOverlay").style.display = "flex";
};

window.closeAddUser = function () {
  document.getElementById("addUserOverlay").style.display = "none";
};

/* =====================
   CREATE USER (Firestore)
===================== */
window.createUser = async function () {
  if (!isAdmin) return;

  const email = document.getElementById("addEmail").value.trim();
  const role = document.getElementById("addRole").value;
  const status = document.getElementById("addStatus").value;

  if (!email) {
    alert("⚠️ أدخل الإيميل");
    return;
  }

  const userRef = doc(db, "users", email);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    alert("⚠️ المستخدم موجود مسبقًا");
    return;
  }

  await setDoc(userRef, {
    email,
    role,
    status,
    name: "",
    createdAt: new Date()
  });

  alert("✅ تم إضافة المستخدم");

  closeAddUser();
  loadUsers();
};

/* =====================
   INIT
===================== */
await checkAdmin();
await loadUsers();
