let apps = JSON.parse(localStorage.getItem("apps")) || [];

/* ========== Render ========== */
function renderApps() {
  const grid = document.getElementById("appsGrid");
  grid.innerHTML = "";

  apps.forEach((a, i) => {
    grid.innerHTML += `
      <div class="app-card">

        <div class="app-img" style="background-image:url('${a.img}')"></div>

        <h3>${a.title}</h3>
        <p>${a.desc}</p>

        <a href="${a.link}" target="_blank" class="run-btn">تشغيل</a>

        <div class="actions">
          <button class="edit-btn" onclick="openEdit(${i})">تعديل</button>
          <button class="delete-btn" onclick="deleteApp(${i})">حذف</button>
        </div>

      </div>
    `;
  });
}

renderApps();

/* ========== Add Popup ========== */
function openAddPopup() {
  document.getElementById("addPopup").style.display = "flex";
}

function saveNewApp() {
  const title = document.getElementById("addTitle").value;
  const desc = document.getElementById("addDesc").value;
  const link = document.getElementById("addLink").value;
  const imgFile = document.getElementById("addImage").files[0];

  if (!title || !desc || !link) {
    alert("يرجى ملء جميع الحقول");
    return;
  }

  if (imgFile) {
    const reader = new FileReader();
    reader.onload = () => addApp(title, desc, link, reader.result);
    reader.readAsDataURL(imgFile);
  } else {
    addApp(title, desc, link, "");
  }
}

function addApp(title, desc, link, img) {
  apps.push({ title, desc, link, img });
  localStorage.setItem("apps", JSON.stringify(apps));

  closePopup();
  renderApps();
}

/* ========== Edit Popup ========== */
function openEdit(i) {
  const a = apps[i];

  document.getElementById("editIndex").value = i;
  document.getElementById("editTitle").value = a.title;
  document.getElementById("editDesc").value = a.desc;
  document.getElementById("editLink").value = a.link;

  document.getElementById("editPopup").style.display = "flex";
}

function saveEditApp() {
  const i = document.getElementById("editIndex").value;

  apps[i].title = document.getElementById("editTitle").value;
  apps[i].desc  = document.getElementById("editDesc").value;
  apps[i].link  = document.getElementById("editLink").value;

  const imgFile = document.getElementById("editImage").files[0];

  if (imgFile) {
    const reader = new FileReader();
    reader.onload = () => {
      apps[i].img = reader.result;
      finishEdit();
    };
    reader.readAsDataURL(imgFile);
  } else {
    finishEdit();
  }
}

function finishEdit() {
  localStorage.setItem("apps", JSON.stringify(apps));
  closePopup();
  renderApps();
}

/* ========== Delete ========== */
function deleteApp(i) {
  if (confirm("هل تريد حذف هذا التطبيق؟") === false) return;
  apps.splice(i, 1);
  localStorage.setItem("apps", JSON.stringify(apps));
  renderApps();
}

/* ========== Search ========== */
function searchApps() {
  const text = document.getElementById("searchInput").value.toLowerCase();

  document.querySelectorAll(".app-card").forEach(card => {
    const title = card.querySelector("h3").innerText.toLowerCase();
    card.style.display = title.includes(text) ? "block" : "none";
  });
}

/* ========== Close Popup ========== */
function closePopup() {
  document.querySelectorAll(".popup-overlay")
    .forEach(p => p.style.display = "none");
}
