// تحميل الأخبار
let news = JSON.parse(localStorage.getItem("news_list")) || [];

// Helper
function escapeRegExp(str){return str.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
function highlight(text, search){
  if(!search || !text) return text;
  const pattern = new RegExp("(" + escapeRegExp(search) + ")", "gi");
  return text.replace(pattern,'<span class="highlight">$1</span>');
}

// عرض الأخبار
function renderNews(search = ""){
  const grid = document.getElementById("newsGrid");
  grid.innerHTML = "";

  let filtered = news;

  if(search !== ""){
    filtered = news.filter(n =>
      n.title.includes(search) ||
      n.desc.includes(search)
    );
  }

  filtered.forEach((item, index) => {
    const styleBg = item.image ? `background-image:url('${item.image}')` : "";
    const noImgClass = item.image ? "" : "no-img";

    grid.innerHTML += `
      <div class="news-card">
        <div class="news-img ${noImgClass}" style="${styleBg}"></div>

        <h3>${highlight(item.title, search)}</h3>
        <p>${highlight(item.desc, search)}</p>

        <div class="btn-row">
          <button class="view-btn" onclick="viewDetails(${index})">عرض</button>
          <button class="edit-btn" onclick="editNews(${index})">تعديل</button>
          <button class="delete-btn" onclick="deleteNews(${index})">حذف</button>
        </div>
      </div>
    `;
  });
}

// بحث حي
document.querySelector(".news-search").addEventListener("input", function(){
  renderNews(this.value.trim());
});

// عرض التفاصيل
function viewDetails(index){
  localStorage.setItem("selectedNews", index);
  window.location.href = "news_view.html";
}

// التعديل
function editNews(index){
  localStorage.setItem("selectedNews", index);
  window.location.href = "news_editor.html";
}

// حذف
function deleteNews(index){
  if(!confirm("هل تريد حذف هذا الخبر؟")) return;

  localStorage.removeItem("news_content_" + index);
  news.splice(index,1);
  localStorage.setItem("news_list", JSON.stringify(news));

  renderNews();
}

// Popup
function openAddNews(){
  document.getElementById("popupAdd").style.display = "flex";
}

function closePopup(){
  document.getElementById("popupAdd").style.display = "none";
  document.getElementById("popupTitle").value = "";
  document.getElementById("popupDesc").value = "";
  document.getElementById("popupImage").value = "";
}

function confirmAdd(){
  const title = document.getElementById("popupTitle").value.trim();
  const desc = document.getElementById("popupDesc").value.trim();
  const file = document.getElementById("popupImage").files[0];

  if(!title) return alert("أدخل عنوان الخبر");

  const reader = new FileReader();

  reader.onloadend = () =>{
    const img = file ? reader.result : "";

    news.push({ title, desc, image: img });

    localStorage.setItem("news_list", JSON.stringify(news));

    closePopup();
    renderNews();
  };

  if(file) reader.readAsDataURL(file);
  else reader.onloadend();
}

renderNews();
