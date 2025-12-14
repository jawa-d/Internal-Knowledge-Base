import { db } from "./firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

// ===============================
// 🔐 Admin Guard (LocalStorage)
// ===============================
const unauthorizedBox = document.getElementById("unauthorizedBox");
const adminContent = document.getElementById("adminContent");

async function checkAdminAccess() {
  const email = localStorage.getItem("kb_user_email");

  // غير مسجل
  if (!email) {
    window.location.href = "login.html";
    return false;
  }

  try {
    const snap = await getDoc(doc(db, "users", email.toLowerCase()));

    if (!snap.exists()) {
      showUnauthorized();
      return false;
    }

    const data = snap.data();
    const role = (data.role || "").toLowerCase();
    const status = (data.status || "").toLowerCase();

    if (role !== "admin" || status !== "active") {
      showUnauthorized();
      return false;
    }

    // Admin ✔
    adminContent.style.display = "block";
    unauthorizedBox.style.display = "none";
    return true;

  } catch (err) {
    console.error(err);
    showUnauthorized();
    return false;
  }
}

function showUnauthorized() {
  adminContent.style.display = "none";
  unauthorizedBox.style.display = "block";
}

// ===============================
// 📊 منطق الصفحة
// ===============================
const RESULTS_KEY = "kb_exam_results";
let results = [];

const tableBody = document.getElementById("resultsTableBody");
const detailsBox = document.getElementById("detailsBox");
const searchBox = document.getElementById("searchBox");
const sortSelect = document.getElementById("sortSelect");

function loadResults() {
  results = JSON.parse(localStorage.getItem(RESULTS_KEY) || "[]");
  applyFilters();
}

function getManualScore(r) {
  return (r.answers || [])
    .filter(a => a.manual)
    .reduce((s, q) => s + Number(q.manualScore || 0), 0);
}

function applyFilters() {
  let list = [...results];
  const search = searchBox.value.trim();

  if (search) {
    list = list.filter(r => (r.employeeName || "").includes(search));
  }

  list.sort((a, b) => {
    if (sortSelect.value === "date_desc") return new Date(b.submittedAt) - new Date(a.submittedAt);
    if (sortSelect.value === "date_asc") return new Date(a.submittedAt) - new Date(b.submittedAt);
    if (sortSelect.value === "score_desc") return (b.autoScore + getManualScore(b)) - (a.autoScore + getManualScore(a));
    if (sortSelect.value === "score_asc") return (a.autoScore + getManualScore(a)) - (b.autoScore + getManualScore(b));
    if (sortSelect.value === "name_asc") return a.employeeName.localeCompare(b.employeeName);
    if (sortSelect.value === "name_desc") return b.employeeName.localeCompare_toggle(a.employeeName);
  });

  renderTable(list);
}

function renderTable(list) {
  tableBody.innerHTML = "";

  list.forEach((r, i) => {
    const score = Number(r.autoScore || 0) + getManualScore(r);

    tableBody.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${r.employeeName}</td>
        <td>${score}</td>
        <td>${new Date(r.submittedAt).toLocaleString("ar-IQ")}</td>
        <td><button onclick="viewDetails(${r.id})">👁</button></td>
        <td><button onclick="exportSingleToPDF(${r.id})">📄</button></td>
        <td><button onclick="resetExam(${r.id})">🗑</button></td>
      </tr>
    `;
  });
}

window.viewDetails = function(id) {
  const r = results.find(x => x.id === id);
  if (!r) return;

  let html = `<h3>${r.employeeName}</h3>`;
  r.answers.forEach((a, i) => {
    html += `<p>${i + 1}) ${a.text}</p>`;
  });

  detailsBox.innerHTML = html;
};

window.resetExam = function(id) {
  if (!confirm("حذف النتيجة؟")) return;
  results = results.filter(r => r.id !== id);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
  loadResults();
};

window.exportSingleToPDF = id =>
  window.open(`pdf_export.html?id=${id}`, "_blank");

window.exportAllToExcel = () => exportExcelFromAdmin();
window.exportAllPDF = () => exportAllReportsAsPDF(results);

// ===============================
// 🚀 Start
// ===============================
(async function init() {
  const allowed = await checkAdminAccess();
  if (!allowed) return;

  loadResults();
  searchBox.addEventListener("input", applyFilters);
  sortSelect.addEventListener("change", applyFilters);
})();
