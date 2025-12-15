import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

/* ===============================
   Helpers
=============================== */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function highlight(text, search) {
  if (!search || !text) return text;
  const pattern = new RegExp("(" + escapeRegExp(search) + ")", "gi");
  return text.replace(pattern, '<span class="highlight">$1</span>');
}

/* ===============================
   Auth / Role
=============================== */
let isAdmin = false;
let currentEmail = "";

async function checkAdmin() {
  currentEmail = localStorage.getItem("kb_user_email") || "";
  if (!currentEmail) {
    window.location.href = "login.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", currentEmail));
  const role = snap.exists() ? (snap.data().role || "") : "";
  isAdmin = String(role).toLowerCase() === "admin";

  const addBtn = document.getElementById("addNewsBtn");
  if (addBtn) addBtn.style.display = isAdmin ? "inline-flex" : "none";
}

/* ===============================
   Data
=============================== */
let news = [];

/* ===============================
   Load + Render
=============================== */
async function loadNews() {
  const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  news = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderNews(document.getElementById("searchInput")?.value?.trim() || "");
}

function renderNews(search = "") {
  const grid = document.getElementById("newsGrid");
  grid.innerHTML = "";

  const filtered = search
    ? news.filter(n =>
        (n.title || "").includes(search) ||
        (n.desc || "").includes(search)
      )
    : news;

  filtered.forEach(item => {
    const bg = item.image ? `background-image:url('${item.image}')` : "";
    const noImg = item.image ? "" : "no-img";

    const adminBtns = isAdmin ? `
      <button class="edit-btn" data-id="${item.id}">✏ تعديل المقال</button>
      <button class="delete-btn" data-id="${item.id}">حذف</button>
    ` : "";

    grid.innerHTML += `
      <div class="news-card">
        <div class="news-img ${noImg}" style="${bg}"></div>

        <h3>${highlight(item.title || "", search)}</h3>
        <p>${highlight(item.desc || "", search)}</p>

        <div class="btn-row">
          <button class="view-btn" data-id="${item.id}">عرض التفاصيل</button>
          ${adminBtns}
        </div>
      </div>
    `;
  });

  // events
  grid.querySelectorAll(".view-btn").forEach(b =>
    b.addEventListener("click", () => {
      localStorage.setItem("selectedNewsId", b.dataset.id);
      window.location.href = "news_view.html";
    })
  );

  grid.querySelectorAll(".edit-btn").forEach(b =>
    b.addEventListener("click", () => {
      localStorage.setItem("selectedNewsId", b.dataset.id);
      window.location.href = "news_editor.html";
    })
  );

  grid.querySelectorAll(".delete-btn").forEach(b =>
    b.addEventListener("click", () => deleteNews(b.dataset.id))
  );
}

/* ===============================
   Add (Admin)
=============================== */
window.openAddNews = function () {
  if (!isAdmin) return;
  document.getElementById("popupAdd").style.display = "flex";
};

window.closePopup = function () {
  document.getElementById("popupAdd").style.display = "none";
  popupTitle.value = "";
  popupDesc.value = "";
  popupImage.value = "";
};

window.confirmAdd = async function () {
  if (!isAdmin) return;

  const title = popupTitle.value.trim();
  const desc = popupDesc.value.trim();
  const file = popupImage.files[0];

  if (!title) return alert("أدخل عنوان الخبر");

  const saveDoc = async (imageData = "") => {
    await addDoc(collection(db, "news"), {
      title,
      desc,
      image: imageData,
      content: "",            // ✅ محتوى خاص بكل خبر
      createdAt: serverTimestamp(),
      createdBy: currentEmail
    });
    closePopup();
    loadNews();
  };

  if (file) {
    const r = new FileReader();
    r.onloadend = () => saveDoc(r.result);
    r.readAsDataURL(file);
  } else {
    await saveDoc("");
  }
};

/* ===============================
   Delete
=============================== */
async function deleteNews(id) {
  if (!isAdmin) return;
  if (!confirm("هل تريد حذف الخبر؟")) return;
  await deleteDoc(doc(db, "news", id));
  loadNews();
}

/* ===============================
   INIT
=============================== */
await checkAdmin();
await loadNews();
