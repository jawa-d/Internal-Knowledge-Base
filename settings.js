let shelves = JSON.parse(localStorage.getItem("shelves")) || [];
let editingIndex = null;

// ========== Render Cards ==========
function renderShelves() {
  const grid = document.getElementById("shelvesGrid");
  grid.innerHTML = "";

  shelves.forEach((shelf, index) => {
    grid.innerHTML += `
      <div class="shelf-card" onclick="openDetails(${index})">

        <img src="${shelf.image}" class="shelf-img">

        <h3 class="title">${shelf.name}</h3>
        <p class="desc">${shelf.desc}</p>

        <div class="card-actions" onclick="event.stopPropagation()">
          <button class="edit-btn" onclick="editShelf(${index})">تعديل</button>
          <button class="delete-btn" onclick="deleteShelf(${index})">حذف</button>
        </div>

      </div>
    `;
  });
}

renderShelves();

// ========== Add Popup ==========
function openAddPopup() {
  editingIndex = null;
  document.getElementById("popupTitle").innerText = "إضافة مسار";
  document.getElementById("shelfName").value = "";
  document.getElementById("shelfDesc").value = "";
  document.getElementById("shelfImage").value = "";

  document.getElementById("saveBtn").onclick = saveShelf;
  document.getElementById("popupOverlay").style.display = "flex";
}

// ========== Save New Shelf ==========
function saveShelf() {
  let name = shelfName.value;
  let desc = shelfDesc.value;
  let file = shelfImage.files[0];

  if (!file) return alert("اختر صورة للمسار");

  let reader = new FileReader();
  reader.onload = function (e) {
    shelves.push({
      image: e.target.result,
      name: name,
      desc: desc
    });

    localStorage.setItem("shelves", JSON.stringify(shelves));
    closePopup();
    renderShelves();
  };

  reader.readAsDataURL(file);
}

// ========== Edit ==========
function editShelf(index) {
  editingIndex = index;

  let shelf = shelves[index];

  popupTitle.innerText = "تعديل المسار";
  shelfName.value = shelf.name;
  shelfDesc.value = shelf.desc;
  shelfImage.value = "";

  saveBtn.onclick = saveEdit;

  popupOverlay.style.display = "flex";
}

function saveEdit() {
  let name = shelfName.value;
  let desc = shelfDesc.value;
  let file = shelfImage.files[0];

  if (file) {
    let reader = new FileReader();
    reader.onload = function (e) {
      shelves[editingIndex].image = e.target.result;
      shelves[editingIndex].name = name;
      shelves[editingIndex].desc = desc;

      localStorage.setItem("shelves", JSON.stringify(shelves));
      closePopup();
      renderShelves();
    };
    reader.readAsDataURL(file);
  } else {
    shelves[editingIndex].name = name;
    shelves[editingIndex].desc = desc;

    localStorage.setItem("shelves", JSON.stringify(shelves));
    closePopup();
    renderShelves();
  }
}

// ========== Delete ==========
function deleteShelf(index) {
  if (!confirm("هل تريد حذف هذا المسار؟")) return;
  shelves.splice(index, 1);
  localStorage.setItem("shelves", JSON.stringify(shelves));
  renderShelves();
}

// ========== Close ==========
function closePopup() {
  popupOverlay.style.display = "none";
}

// ========== Search ==========
function searchShelves() {
  let q = searchInput.value.toLowerCase();
  document.querySelectorAll(".shelf-card").forEach(card => {
    let name = card.querySelector(".title").innerText.toLowerCase();
    card.style.display = name.includes(q) ? "block" : "none";
  });
}

// ========== Open Details ==========
function openDetails(index) {
  localStorage.setItem("selectedShelf", JSON.stringify(shelves[index]));
  window.location.href = "shelf_details.html";
}
