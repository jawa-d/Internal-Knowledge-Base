// applications.js
import { db, storage } from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-storage.js";

/* =========================
   Elements
========================= */
const grid = document.getElementById("appsGrid");
const searchInput = document.getElementById("searchInput");
const addBtn = document.getElementById("addAppBtn");
const currentUserSpan = document.getElementById("currentUser");

const addPopup = document.getElementById("addPopup");
const addSaveBtn = document.getElementById("addSaveBtn");

const addTitle = document.getElementById("addTitle");
const addDesc = document.getElementById("addDesc");
const addLink = document.getElementById("addLink");
const addImage = document.getElementById("addImage");

/* =========================
   State
========================= */
let isAdmin = false;
let allApps = [];

// إخفاء زر الإضافة افتراضيًا
addBtn.style.display = "none";

/* =========================
   Popup controls
========================= */
window.openAddPopup = function () {
  addPopup.style.display = "flex";
};

window.closePopup = function () {
  document.querySelectorAll(".popup-overlay").forEach(p => {
    p.style.display = "none";
  });

  // تنظيف الحقول
  addTitle.value = "";
  addDesc.value = "";
  addLink.value = "";
  addImage.value = "";
};

/* =========================
   Load user role
========================= */
async function loadCurrentUserRole() {
  const email = localStorage.getItem("kb_user_email");

  currentUserSpan.textContent = email
    ? email.split("@")[0]
    : "User";

  if (!email) return;

  const snap = await getDoc(doc(db, "users", email));
  if (!snap.exists()) return;

  const role = String(snap.data().role || "").toLowerCase();
  isAdmin = role === "admin";

  addBtn.style.display = isAdmin ? "inline-flex" : "none";
}

/* =========================
   🔥 SAFE IMAGE UPLOAD
   تقبل أي صورة + أي اسم
========================= */
function safeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "_");
}

async function uploadImageIfAny(file) {
  if (!file) return "";

  const safeName =
    Date.now() + "_" + safeFileName(file.name);

  const storageRef = ref(storage, `apps/${safeName}`);

  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

/* =========================
   Fetch apps
========================= */
async function fetchApps() {
  const snap = await getDocs(collection(db, "apps"));

  allApps = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  renderApps(allApps);
}

/* =========================
   Render apps
========================= */
function renderApps(apps) {
  grid.innerHTML = "";

  apps.forEach(app => {
    const safeLink =
      app.link && app.link.startsWith("http")
        ? app.link
        : "javascript:void(0)";

    grid.innerHTML += `
      <div class="app-card">
        <div
          class="app-img"
          style="background-image:url('${app.imageUrl || ""}')">
        </div>

        <h3>${app.title || ""}</h3>
        <p>${app.desc || ""}</p>

        <a class="run-btn" href="${safeLink}" target="_blank">
          تشغيل
        </a>

        ${
          isAdmin
            ? `
          <div class="actions">
            <button class="delete-btn" onclick="deleteApp('${app.id}')">
              حذف
            </button>
          </div>`
            : ""
        }
      </div>
    `;
  });
}

/* =========================
   Search
========================= */
searchInput.addEventListener("input", () => {
  const term = searchInput.value.trim().toLowerCase();

  if (!term) {
    renderApps(allApps);
    return;
  }

  const filtered = allApps.filter(app =>
    (app.title || "").toLowerCase().includes(term)
  );

  renderApps(filtered);
});

/* =========================
   Add App
========================= */
addBtn.addEventListener("click", () => {
  if (!isAdmin) return;
  openAddPopup();
});

addSaveBtn.addEventListener("click", async () => {
  if (!isAdmin) return;

  const title = addTitle.value.trim();
  const desc = addDesc.value.trim();
  let link = addLink.value.trim();

  if (!title || !desc) {
    alert("يرجى إدخال اسم التطبيق والوصف");
    return;
  }

  // السماح بأي رابط (وإن كان غير صحيح)
  if (!link || !link.startsWith("http")) {
    link = "#";
  }

  const imageUrl = await uploadImageIfAny(addImage.files[0]);

  await addDoc(collection(db, "apps"), {
    title,
    desc,
    link,
    imageUrl,
    createdAt: serverTimestamp()
  });

  closePopup();
  await fetchApps();
});

/* =========================
   Delete App
========================= */
window.deleteApp = async function (id) {
  if (!isAdmin) return;

  const ok = confirm("هل تريد حذف هذا التطبيق؟");
  if (!ok) return;

  await deleteDoc(doc(db, "apps", id));
  await fetchApps();
};

/* =========================
   Init
========================= */
await loadCurrentUserRole();
await fetchApps();
