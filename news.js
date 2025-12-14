import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

/* =========================
   AUTH / ROLE
========================= */
let isAdmin = false;
let currentEmail = "";

async function checkAdmin() {
  currentEmail = localStorage.getItem("kb_user_email");
  if (!currentEmail) {
    window.location.href = "login.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", currentEmail));
  const role = snap.exists() ? snap.data().role : "";

  isAdmin = String(role).toLowerCase() === "admin";

  document.getElementById("addNewsBtn").style.display =
    isAdmin ? "inline-flex" : "none";
}

/* =========================
   HELPERS
========================= */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text, search) {
  if (!search || !text) return text || "";
  const r = new RegExp("(" + escapeRegExp(search) + ")", "gi");
  return text.replace(r, '<span class="highlight">$1</span>');
}

/* =========================
   LOAD NEWS
========================= */
let news = [];

async function loadNews(search = "") {
  const q = query(
    collection(db, "news"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  news = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderNews(search);
}

/* =========================
   RENDER
========================= */
function renderNews(search = "") {
  const grid = document.getElementById("newsGrid");
  grid.innerHTML = "";

  let filtered = news;

  if (search) {
    filtered = news.filter(n =>
      (n.title && n.title.includes(search)) ||
      (n.desc && n.desc.includes(search))
    );
  }

  filtered.forEach(item => {
    const bg = item.image ? `background-image:url('${item.image}')` : "";
    const noImg = item.image ? "" : "no-img";

    const adminBtns = isAdmin ? `
      <button class="edit-btn" onclick="editNews('${item.id}')">تعديل</button>
      <button class="delete-btn" onclick="deleteNews('${item.id}')">حذف</button>
    ` : "";

    grid.innerHTML += `
      <div class="news-card">
        <div class="news-img ${noImg}" style="${bg}"></div>

        <h3>${highlight(item.title, search)}</h3>
        <p>${highlight(item.desc, search)}</p>

        <div class="btn-row">
          <button class="view-btn" onclick="viewNews('${item.id}')">عرض</button>
          ${adminBtns}
        </div>
      </div>
    `;
  });
}

/* =========================
   SEARCH
========================= */
document.getElementById("searchInput")
  .addEventListener("input", e => {
    loadNews(e.target.value.trim());
  });

/* =========================
   NAVIGATION
========================= */
function viewNews(id) {
  localStorage.setItem("selectedNewsId", id);
  window.location.href = "news_view.html";
}

function editNews(id) {
  if (!isAdmin) return;
  localStorage.setItem("selectedNewsId", id);
  window.location.href = "news_editor.html";
}

/* =========================
   DELETE
========================= */
async function deleteNews(id) {
  if (!isAdmin) return;
  if (!confirm("هل تريد حذف هذا الخبر؟")) return;

  await deleteDoc(doc(db, "news", id));
  loadNews(document.getElementById("searchInput").value.trim());
}

/* =========================
   ADD
========================= */
function openAddNews() {
  if (!isAdmin) return;
  popupAdd.style.display = "flex";
}

function closePopup() {
  popupAdd.style.display = "none";
  popupTitle.value = "";
  popupDesc.value = "";
  popupImage.value = "";
}

async function confirmAdd() {
  if (!isAdmin) return;

  const title = popupTitle.value.trim();
  const desc = popupDesc.value.trim();
  const file = popupImage.files[0];

  if (!title) return alert("أدخل عنوان الخبر");

  const save = async (img = "") => {
    await addDoc(collection(db, "news"), {
      title,
      desc,
      image: img,
      createdAt: serverTimestamp(),
      createdBy: currentEmail
    });

    closePopup();
    loadNews();
  };

  if (file) {
    const r = new FileReader();
    r.onloadend = () => save(r.result);
    r.readAsDataURL(file);
  } else {
    save("");
  }
}

/* =========================
   EXPOSE
========================= */
window.openAddNews = openAddNews;
window.closePopup = closePopup;
window.confirmAdd = confirmAdd;
window.deleteNews = deleteNews;
window.viewNews = viewNews;
window.editNews = editNews;

/* =========================
   INIT
========================= */
await checkAdmin();
await loadNews();
