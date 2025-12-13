const RESULTS_KEY = "kb_exam_results";
let results = [];

// DOM
const tableBody = document.getElementById("resultsTableBody");
const detailsBox = document.getElementById("detailsBox");
const searchBox = document.getElementById("searchBox");
const sortSelect = document.getElementById("sortSelect");

// تحميل النتائج
function loadResults() {
  results = JSON.parse(localStorage.getItem(RESULTS_KEY) || "[]");
  applyFilters();
}

// فلترة + فرز
function applyFilters() {
  let filtered = [...results];

  // بحث
  const search = searchBox.value.trim();
  if (search) {
    filtered = filtered.filter(r =>
      r.employeeName.includes(search)
    );
  }

  // فرز
  const sort = sortSelect.value;
  filtered.sort((a, b) => {
    if (sort === "date_desc") return new Date(b.submittedAt) - new Date(a.submittedAt);
    if (sort === "date_asc") return new Date(a.submittedAt) - new Date(b.submittedAt);
    if (sort === "score_desc") return (b.autoScore + getManualScore(b)) - (a.autoScore + getManualScore(a));
    if (sort === "score_asc") return (a.autoScore + getManualScore(a)) - (b.autoScore + getManualScore(b));
    if (sort === "name_asc") return a.employeeName.localeCompare(b.employeeName);
    if (sort === "name_desc") return b.employeeName.localeCompare(a.employeeName);
  });

  renderTable(filtered);
}

// حساب الدرجات اليدوية
function getManualScore(r) {
  return r.answers
    .filter(a => a.manual)
    .reduce((sum, q) => sum + Number(q.manualScore || 0), 0);
}

// عرض النتائج في الجدول
function renderTable(list) {
  tableBody.innerHTML = "";

  list.forEach((r, i) => {
    const finalScore = r.autoScore + getManualScore(r);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${r.employeeName}</td>
      <td>${finalScore}</td>
      <td>${new Date(r.submittedAt).toLocaleString("ar-IQ")}</td>
      <td><button class="viewBtn" onclick="viewDetails(${r.id})">👁 عرض</button></td>
      <td><button class="pdfBtn" onclick="exportSingleToPDF(${r.id})">📄</button></td>
      <td><button class="delBtn" onclick="resetExam(${r.id})">🗑</button></td>
    `;
    tableBody.appendChild(tr);
  });
}

// عرض التفاصيل
function viewDetails(id) {
  const r = results.find(x => x.id === id);
  if (!r) return;

  const finalScore = r.autoScore + getManualScore(r);

  let html = `
    <h2>الاسم: ${r.employeeName}</h2>
    <p>الدرجة النهائية: <b>${finalScore}</b></p>
    <p>وقت التسليم: ${new Date(r.submittedAt).toLocaleString("ar-IQ")}</p>
    <hr>
    <h3>الإجابات:</h3>
  `;

  r.answers.forEach((a, i) => {
    html += `
      <p><b>${i + 1}) ${a.text}</b></p>
      <p>إجابة الموظف: ${a.userAnswer}</p>
      ${a.correctAnswer ? `<p>الصحيح: ${a.correctAnswer}</p>` : ""}
      ${a.manual ? `<p>تصحيح يدوي: ${a.manualScore} / 10</p>` : ""}
      <hr>
    `;
  });

  detailsBox.innerHTML = html;
  detailsBox.style.display = "block";
}

// حذف النتيجة
function resetExam(id) {
  if (!confirm("هل تريد حذف النتيجة؟")) return;

  results = results.filter(r => r.id !== id);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));

  loadResults();
}

// PDF لموظف واحد
function exportSingleToPDF(id) {
  window.open(`pdf_export.html?id=${id}`, "_blank");
}

// Excel (نفس الملف السابق)
function exportAllToExcel() {
  exportExcelFromAdmin();
}

// PDF جماعي
function exportAllPDF() {
  exportAllReportsAsPDF(results);
}

// Events
searchBox.addEventListener("input", applyFilters);
sortSelect.addEventListener("change", applyFilters);

// بدء التحميل
loadResults();
