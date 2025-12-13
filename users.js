import { db } from "./firebase.js";

import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

let USERS = [];
let editingEmail = null;

const tableBody = document.getElementById("usersTableBody");


// 🔥 تحميل المستخدمين من Firestore
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


// 🔥 عرض المستخدمين داخل الجدول
function renderUsers() {

  tableBody.innerHTML = "";

  USERS.forEach(u => {
    tableBody.innerHTML += `
      <tr>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.role.toUpperCase()}</td>
        <td>${u.status}</td>
        <td>
          <button class="btn-edit" onclick="editUser('${u.email}')">تعديل</button>
        </td>
      </tr>
    `;
  });
}


// 🔥 فتح نافذة التعديل
window.editUser = function(email) {
  editingEmail = email;

  const user = USERS.find(x => x.email === email);

  document.getElementById("editRole").value = user.role;
  document.getElementById("editStatus").value = user.status;

  document.getElementById("popupOverlay").style.display = "flex";
};


// إغلاق النافذة
window.closePopup = function() {
  document.getElementById("popupOverlay").style.display = "none";
};


// 🔥 حفظ التعديلات داخل Firestore
window.saveUser = async function() {

  const newRole = document.getElementById("editRole").value;
  const newStatus = document.getElementById("editStatus").value;

  const userRef = doc(db, "users", editingEmail);

  await updateDoc(userRef, {
    role: newRole,
    status: newStatus
  });

  alert("✔ تم تحديث بيانات المستخدم");

  closePopup();
  loadUsers();
};


// تحميل المستخدمين عند فتح الصفحة
loadUsers();
