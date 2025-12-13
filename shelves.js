// تحميل الرفوف
let shelves = JSON.parse(localStorage.getItem("shelves_list")) || [];

/* ===== Helper Functions ===== */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text, search) {
  if (!search || !text) return text;
  const pattern = new RegExp("(" + escapeRegExp(search) + ")", "gi");
  return text.replace(pattern, '<span class="highlight">$1</span>');
}

/* ===== Render Shelves ===== */
function renderShelves(search = "") {
  const grid = document.getElementById("shelvesGrid");
  grid.innerHTML = "";

  let filtered = shelves;

  if (search !== "") {
    filtered = shelves.filter(s =>
      s.title.includes(search) || s.desc.includes(search)
    );
  }

  filtered.forEach((shelf, index) => {
    const bg = shelf.image ? `background-image:url('${shelf.image}')` : "";
    const noImg = shelf.image ? "" : "no-img";

    grid.innerHTML += `
      <div class="shelf-card">
        <div class="shelf-img ${noImg}" style="${bg}"></div>

        <h3>${highlight(shelf.title, search)}</h3>
        <p>${highlight(shelf.desc, search)}</p>

        <div class="btn-row">
          <button class="view-btn" onclick="viewShelf(${index})">عرض التفاصيل</button>
          <button class="edit-btn" onclick="editDetails(${index})">تعديل</button>
          <button class="delete-btn" onclick="deleteShelf(${index})">حذف</button>
        </div>
      </div>
    `;
  });
}

/* ===== Live Search ===== */
document.querySelector(".shelves-search").addEventListener("input", function () {
  renderShelves(this.value.trim());
});

/* ===== View Shelf ===== */
function viewShelf(index) {
  localStorage.setItem("selectedShelf", index);
  window.location.href = "shelf_view.html";
}

/* ===== Delete Shelf ===== */
function deleteShelf(index) {
  if (!confirm("هل تريد حذف هذا الرف؟")) return;

  localStorage.removeItem("shelf_content_" + index);
  localStorage.removeItem("shelf_cards_" + index);

  shelves.splice(index, 1);

  localStorage.setItem("shelves_list", JSON.stringify(shelves));

  renderShelves();
}

/* ===== Add Shelf Popup ===== */
function openAddShelf() {
  document.getElementById("popupAdd").style.display = "flex";
}

function closePopup() {
  document.getElementById("popupAdd").style.display = "none";
  document.getElementById("popupTitle").value = "";
  document.getElementById("popupDesc").value = "";
  document.getElementById("popupImage").value = "";
}

function confirmAdd() {
  const title = document.getElementById("popupTitle").value.trim();
  const desc = document.getElementById("popupDesc").value.trim();
  const file = document.getElementById("popupImage").files[0];

  if (!title) return alert("أدخل اسم الرف");

  const reader = new FileReader();

  reader.onloadend = () => {
    shelves.push({
      title,
      desc,
      image: file ? reader.result : ""
    });

    localStorage.setItem("shelves_list", JSON.stringify(shelves));

    closePopup();
    renderShelves();
  };

  if (file) reader.readAsDataURL(file);
  else reader.onloadend();
}

/* ===== Edit Shelf Popup ===== */
function editDetails(index) {
  const s = shelves[index];

  document.getElementById("editTitle").value = s.title;
  document.getElementById("editDesc").value = s.desc;

  window.currentEditIndex = index;

  document.getElementById("popupEdit").style.display = "flex";
}

function closeEditPopup() {
  document.getElementById("popupEdit").style.display = "none";
  document.getElementById("editTitle").value = "";
  document.getElementById("editDesc").value = "";
  document.getElementById("editImage").value = "";
}

function saveEdit() {
  const index = window.currentEditIndex;

  const title = document.getElementById("editTitle").value.trim();
  const desc = document.getElementById("editDesc").value.trim();
  const file = document.getElementById("editImage").files[0];

  if (!title) return alert("أدخل اسم الرف");

  shelves[index].title = title;
  shelves[index].desc = desc;

  if (file) {
    const reader = new FileReader();

    reader.onloadend = () => {
      shelves[index].image = reader.result;

      localStorage.setItem("shelves_list", JSON.stringify(shelves));

      closeEditPopup();
      renderShelves();
    };

    reader.readAsDataURL(file);
  } else {
    localStorage.setItem("shelves_list", JSON.stringify(shelves));
    closeEditPopup();
    renderShelves();
  }
}

renderShelves();
