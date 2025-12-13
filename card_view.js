let shelfIndex = localStorage.getItem("selectedShelf");
let cardIndex  = localStorage.getItem("selectedCard");

let cards = JSON.parse(localStorage.getItem("shelf_cards_" + shelfIndex)) || [];
let current = cards[cardIndex] || {};

// عرض بيانات البطاقة
document.getElementById("cardTitle").innerText = current.title || "—";
document.getElementById("cardDesc").innerText  = current.desc || "—";

if (current.image) {
  document.getElementById("cardImage").style.backgroundImage = `url('${current.image}')`;
}

// فتح صفحة عرض المقال فقط
function viewArticle() {
  window.location.href = "card_article_view.html";
}

// فتح صفحة إضافة / تعديل المقال
function openArticle() {
  window.location.href = "card_article.html";
}

// تعديل بيانات البطاقة نفسها
function editCard() {
  const newTitle = prompt("تعديل عنوان البطاقة:", current.title || "");
  if (!newTitle) return;

  const newDesc = prompt("تعديل وصف البطاقة:", current.desc || "");

  current.title = newTitle;
  current.desc  = newDesc || "";

  cards[cardIndex] = current;
  localStorage.setItem("shelf_cards_" + shelfIndex, JSON.stringify(cards));

  location.reload();
}

// حذف البطاقة + مقالها
function deleteCard() {
  if (!confirm("هل تريد حذف البطاقة مع المقال المرتبط بها؟")) return;

  // حذف المقال إن وجد
  localStorage.removeItem("card_article_" + shelfIndex + "_" + cardIndex);

  // حذف الكارت من القائمة
  cards.splice(cardIndex, 1);
  localStorage.setItem("shelf_cards_" + shelfIndex, JSON.stringify(cards));

  alert("تم حذف البطاقة");
  window.location.href = "shelf_view.html";
}
