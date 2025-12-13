let top3 = JSON.parse(localStorage.getItem("top3_list")) || [];

// عرض
function renderTop3() {
  const grid = document.getElementById("top3Grid");
  grid.innerHTML = "";

  top3.forEach((emp, index) => {
    grid.innerHTML += `
      <div class="top-card">

        <div class="top-img"
          style="background-image:url('${emp.image}');
                 background-size:cover;
                 background-position:center;">
        </div>

        <h3 class="emp-name">${emp.name}</h3>
        <p class="emp-id">ID: ${emp.empId}</p>

        <div class="rank-badge">المركز ${emp.rank}</div>

        <div class="btn-row">
          <button class="edit-btn" onclick="editTop(${index})">تعديل</button>
          <button class="delete-btn" onclick="deleteTop(${index})">حذف</button>
        </div>

      </div>
    `;
  });
}

// فتح Popup
function openAddPopup() {
  document.getElementById("popupTop3").style.display = "flex";
}

function closePopup() {
  document.getElementById("popupTop3").style.display = "none";
}

// حفظ موظف
function saveEmployee() {
  let name = document.getElementById("empName").value.trim();
  let empId = document.getElementById("empId").value.trim();
  let rank = document.getElementById("empRank").value;

  let file = document.getElementById("empImage").files[0];

  if (!name || !empId || !rank) {
    alert("املأ كل المعلومات");
    return;
  }

  const reader = new FileReader();

  reader.onloadend = () => {
    const imgBase64 = reader.result;

    top3.push({
      name,
      empId,
      rank,
      image: imgBase64
    });

    localStorage.setItem("top3_list", JSON.stringify(top3));
    closePopup();
    renderTop3();
  };

  if (file) reader.readAsDataURL(file);
  else alert("يجب اختيار صورة");
}

// تعديل
function editTop(index) {
  let emp = top3[index];

  let newName = prompt("اسم الموظف:", emp.name);
  if (!newName) return;

  let newId = prompt("ID الموظف:", emp.empId);

  let newRank = prompt("الترتيب (1 – 3):", emp.rank);

  emp.name = newName;
  emp.empId = newId;
  emp.rank = newRank;

  top3[index] = emp;

  localStorage.setItem("top3_list", JSON.stringify(top3));
  renderTop3();
}

// حذف
function deleteTop(index) {
  if (!confirm("هل تريد حذف هذا الموظف؟")) return;

  top3.splice(index, 1);
  localStorage.setItem("top3_list", JSON.stringify(top3));

  renderTop3();
}

renderTop3();
// =================== 3D Parallax Tilt =====================
document.addEventListener("mousemove", function (e) {
  const cards = document.querySelectorAll(".top-card");

  cards.forEach(card => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;  
    const y = e.clientY - rect.top;

    const midX = rect.width / 2;
    const midY = rect.height / 2;

    const rotateX = ((y - midY) / midY) * 10; // درجة الميلان فوق/تحت
    const rotateY = ((x - midX) / midX) * 10; // درجة الميلان يمين/يسار

    card.classList.remove("reset-animation");

    card.style.transform =
      `rotateX(${rotateX * -1}deg) rotateY(${rotateY}deg) scale(1.05)`;

    card.style.boxShadow =
      `${rotateY * 2}px ${rotateX * 2}px 40px rgba(0,0,0,0.25)`;
  });
});

// ===== رجوع الكارت عند خروج الماوس من الشاشة =====
document.addEventListener("mouseleave", function () {
  document.querySelectorAll(".top-card").forEach(card => {
    card.classList.add("reset-animation");
    card.style.transform = "rotateX(0deg) rotateY(0deg) scale(1)";
    card.style.boxShadow = "0 10px 25px rgba(0,0,0,0.10)";
  });
});
