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
  currentEmail = localStorage.getItem("kb_user_email") || "";
  if (!currentEmail) {
    window.location.href = "login.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", currentEmail));
  const role = snap.exists() ? snap.data().role : "";

  isAdmin = String(role).toLowerCase() === "admin";

  document.getElementById("addBookBtn").style.display =
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
   LOAD BOOKS
========================= */
let books = [];

async function loadBooks(search = "") {
  const q = query(
    collection(db, "books"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  books = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderBooks(search);
}

/* =========================
   RENDER
========================= */
function renderBooks(search = "") {
  const grid = document.getElementById("booksGrid");
  grid.innerHTML = "";

  let filtered = books;

  if (search) {
    filtered = books.filter(b =>
      (b.title && b.title.includes(search)) ||
      (b.desc && b.desc.includes(search))
    );
  }

  filtered.forEach(book => {
    const bg = book.image ? `background-image:url('${book.image}')` : "";
    const noImg = book.image ? "" : "no-img";

    const adminBtns = isAdmin ? `
      <button class="edit-btn" onclick="editBook('${book.id}')">تعديل</button>
      <button class="delete-btn" onclick="deleteBook('${book.id}')">حذف</button>
    ` : "";

    grid.innerHTML += `
      <div class="book-card">
        <div class="book-img ${noImg}" style="${bg}"></div>

        <h3>${highlight(book.title, search)}</h3>
        <p>${highlight(book.desc, search)}</p>

        <div class="btn-row">
          <button class="view-btn" onclick="viewBook('${book.id}')">
            عرض التفاصيل
          </button>
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
    loadBooks(e.target.value.trim());
  });

/* =========================
   NAVIGATION
========================= */
function viewBook(id) {
  localStorage.setItem("selectedBookId", id);
  window.location.href = "book_view.html";
}

function editBook(id) {
  if (!isAdmin) return;
  localStorage.setItem("selectedBookId", id);
  window.location.href = "book_editor.html";
}

/* =========================
   DELETE
========================= */
async function deleteBook(id) {
  if (!isAdmin) return;
  if (!confirm("هل تريد حذف هذا الكتاب؟")) return;

  await deleteDoc(doc(db, "books", id));
  loadBooks(document.getElementById("searchInput").value.trim());
}

/* =========================
   ADD BOOK
========================= */
function openAddBook() {
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

  if (!title) return alert("أدخل عنوان الكتاب");

  const save = async (img = "") => {
    await addDoc(collection(db, "books"), {
      title,
      desc,
      image: img,
      createdAt: serverTimestamp(),
      createdBy: currentEmail
    });

    closePopup();
    loadBooks();
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
   EXPOSE (onclick)
========================= */
window.openAddBook = openAddBook;
window.closePopup = closePopup;
window.confirmAdd = confirmAdd;
window.deleteBook = deleteBook;
window.viewBook = viewBook;
window.editBook = editBook;

/* =========================
   INIT
========================= */
await checkAdmin();
await loadBooks();
