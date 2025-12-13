// تحميل الكتب من LocalStorage
let books = JSON.parse(localStorage.getItem("books_list")) || [];

// ====== Helper: Escape RegExp ======
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ====== Helper: Highlight text ======
function highlightText(text, search) {
  if (!search || !text) return text || "";
  const pattern = new RegExp("(" + escapeRegExp(search) + ")", "gi");
  return text.replace(pattern, '<span class="highlight">$1</span>');
}

// ====== عرض كل الكتب ======
function renderBooks(search = "") {
  const grid = document.getElementById("booksGrid");
  grid.innerHTML = "";

  let filteredBooks = books;

  if (search !== "") {
    filteredBooks = books.filter(book =>
      (book.title && book.title.includes(search)) ||
      (book.desc && book.desc.includes(search))
    );
  }

  filteredBooks.forEach((book, index) => {
    const styleBg = book.image
      ? `background-image:url('${book.image}');`
      : "";
    const noImgClass = book.image ? "" : "no-img";

    const titleHTML = highlightText(book.title, search);
    const descHTML = highlightText(book.desc, search);

    grid.innerHTML += `
      <div class="book-card">

        <div class="book-img ${noImgClass}"
             style="${styleBg}">
        </div>

        <h3>${titleHTML}</h3>
        <p>${descHTML}</p>

        <div class="btn-row">
          <button class="view-btn" onclick="viewDetails(${index})">عرض التفاصيل</button>
          <button class="edit-btn" onclick="editDetails(${index})">تعديل</button>
          <button class="delete-btn" onclick="deleteBook(${index})">حذف</button>
        </div>
      </div>
    `;
  });
}

// ====== البحث الحي ======
const booksSearchInput = document.querySelector(".books-search");
if (booksSearchInput) {
  booksSearchInput.addEventListener("input", function () {
    const keyword = this.value.trim();
    renderBooks(keyword);
  });
}

// ====== عرض التفاصيل ======
function viewDetails(index) {
  localStorage.setItem("selectedBook", index);
  window.location.href = "book_view.html";
}

// ====== التعديل ======
function editDetails(index) {
  localStorage.setItem("selectedBook", index);
  window.location.href = "book_editor.html";
}

// ====== الحذف ======
function deleteBook(index) {
  if (!confirm("هل أنت متأكد من حذف هذا الكتاب ؟")) return;

  localStorage.removeItem("book_content_" + index);

  books.splice(index, 1);

  localStorage.setItem("books_list", JSON.stringify(books));

  renderBooks(booksSearchInput ? booksSearchInput.value.trim() : "");
  alert("تم حذف الكتاب بنجاح");
}

// ==========================
// 🎨 Popup الإضافة
// ==========================

function openAddBook() {
  document.getElementById("popupAdd").style.display = "flex";
}

function closePopup() {
  document.getElementById("popupAdd").style.display = "none";

  document.getElementById("popupTitle").value = "";
  document.getElementById("popupDesc").value = "";
  document.getElementById("popupImage").value = "";
}

// إضافة كتاب جديد
function confirmAdd() {
  const title = document.getElementById("popupTitle").value.trim();
  const desc = document.getElementById("popupDesc").value.trim();
  const file = document.getElementById("popupImage").files[0];

  if (!title) return alert("أدخل عنوان الكتاب");

  const reader = new FileReader();

  reader.onloadend = () => {
    const imageBase64 = file ? reader.result : "";

    books.push({
      title,
      desc,
      image: imageBase64
    });

    localStorage.setItem("books_list", JSON.stringify(books));

    closePopup();
    renderBooks(booksSearchInput ? booksSearchInput.value.trim() : "");
  };

  if (file) reader.readAsDataURL(file);
  else reader.onloadend();
}

renderBooks();
