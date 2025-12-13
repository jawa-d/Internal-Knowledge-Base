// =========================
// تحميل بيانات الرف
// =========================

let shelfIndex = localStorage.getItem("selectedShelf");
let shelves = JSON.parse(localStorage.getItem("shelves_list")) || [];

let cards = JSON.parse(localStorage.getItem("shelf_cards_" + shelfIndex)) || [];

// =========================
// عرض بيانات الرف
// =========================

document.getElementById("shelfTitle").textContent = shelves[shelfIndex]?.title || "—";
document.getElementById("shelfDesc").textContent = shelves[shelfIndex]?.desc || "";

// =========================
// عرض بطاقات الرف
// =========================

function renderCards() {
  const grid = document.getElementById("cardsGrid");
  grid.innerHTML = "";

  cards.forEach((c, i) => {
    const bg = c.image ? `background-image:url('${c.image}')` : "";

    grid.innerHTML += `
      <div class="card-box">
        <div class="card-img" style="${bg}"></div>

        <h3 class="card-title">${c.title}</h3>
        <p class="card-desc">${c.desc}</p>

        <div class="card-btns">
          <button class="view-article-btn" onclick="viewArticle(${i})">عرض المقال</button>
          <button class="add-article-btn" onclick="openArticle(${i})">إضافة مقال</button>
          <button class="edit-card" onclick="editCard(${i})">تعديل</button>
          <button class="delete-card" onclick="deleteCard(${i})">حذف</button>
        </div>
      </div>
    `;
  });
}

renderCards();

// =========================
// فتح صفحة كتابة المقال (CKEditor)
// =========================

function openArticle(i) {
  localStorage.setItem("selectedCard", i);
  window.location.href = "card_article.html";
}

// =========================
// فتح صفحة عرض المقال فقط
// =========================

function viewArticle(i) {
  localStorage.setItem("selectedCard", i);
  window.location.href = "card_article_view.html";
}

// =========================
// Popup إضافة بطاقة جديدة
// =========================

function openAddCard() {
  document.getElementById("popupCard").style.display = "flex";
}

function closeCardPopup() {
  document.getElementById("popupCard").style.display = "none";
  document.getElementById("cardTitle").value = "";
  document.getElementById("cardDesc").value = "";
  document.getElementById("cardImage").value = "";
}

// =========================
// حفظ بطاقة جديدة
// =========================

function saveCard() {
  const title = document.getElementById("cardTitle").value.trim();
  const desc = document.getElementById("cardDesc").value.trim();
  const file = document.getElementById("cardImage").files[0];

  if (!title) return alert("أدخل عنوان البطاقة");

  const reader = new FileReader();

  reader.onloadend = () => {
    cards.push({
      title,
      desc,
      image: file ? reader.result : ""
    });

    localStorage.setItem("shelf_cards_" + shelfIndex, JSON.stringify(cards));

    closeCardPopup();
    renderCards();
  };

  if (file) reader.readAsDataURL(file);
  else reader.onloadend();
}

// =========================
// حذف بطاقة
// =========================

function deleteCard(i) {
  if (!confirm("هل تريد حذف البطاقة؟")) return;

  localStorage.removeItem("card_content_" + shelfIndex + "_" + i);
  localStorage.removeItem("card_article_" + shelfIndex + "_" + i);

  cards.splice(i, 1);

  localStorage.setItem("shelf_cards_" + shelfIndex, JSON.stringify(cards));

  renderCards();
}

// =========================
// تعديل بطاقة (بسيط عبر prompt)
// =========================

function editCard(i) {
  const c = cards[i];

  const newTitle = prompt("تعديل العنوان:", c.title);
  if (!newTitle) return;

  const newDesc = prompt("تعديل الوصف:", c.desc);

  cards[i].title = newTitle;
  cards[i].desc = newDesc || "";

  localStorage.setItem("shelf_cards_" + shelfIndex, JSON.stringify(cards));
  renderCards();
}
